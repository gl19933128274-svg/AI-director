/**
 * Volcengine Service - 火山方舟图生视频服务层
 * 
 * 功能：
 * 1. 封装火山方舟图生视频API调用
 * 2. 统一处理认证、header、错误处理
 * 3. 支持异步任务轮询
 * 4. 提供统一接口与AI Router对接
 * 5. 视频URL签名处理（支持公开读和签名URL）
 * 
 * 认证方式：Bearer Token（单Key模式，无需Secret）
 */

import { VideoGenerationInput, VideoGenerationOutput, VideoStyle } from './ai-video.service';
import { logStep } from '@/utils/apiResponse';

interface VolcengineConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  concurrencyLimit: number;
}

const DEFAULT_CONFIG: VolcengineConfig = {
  apiKey: process.env.VOLC_API_KEY || '',
  baseUrl: process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  timeoutMs: 60000,
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  concurrencyLimit: 1
};

let config: VolcengineConfig = { ...DEFAULT_CONFIG };

export function initVolcengineService(customConfig?: Partial<VolcengineConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

function generateTaskId(): string {
  return `volc-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateMockVideoUrl(taskId: string): string {
  return `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=volc-video%20${taskId}&image_size=landscape_16_9`;
}

function ensureVideoUrlAccessible(url: string): string {
  if (!url) {
    return '';
  }
  
  if (url.startsWith('https://ark-content-generation')) {
    console.log('[Volcengine] Video URL is from ARK OSS, using proxy for accessibility');
    return `/api/video-proxy?url=${encodeURIComponent(url)}`;
  }
  
  if (url.startsWith('https://ark-project.tos-cn-beijing')) {
    console.log('[Volcengine] Video URL is from TOS OSS, using proxy for accessibility');
    return `/api/video-proxy?url=${encodeURIComponent(url)}`;
  }
  
  if (url.startsWith('https://') || url.startsWith('http://')) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      if (hostname.includes('volces.com') || hostname.includes('tos-cn-beijing')) {
        console.log('[Volcengine] Video URL is from Volcengine OSS, using proxy');
        return `/api/video-proxy?url=${encodeURIComponent(url)}`;
      }
    } catch {
      return url;
    }
    return url;
  }
  
  return generateMockVideoUrl(url);
}

class VolcengineAdapter {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private concurrencyLimit: number;
  private queue: Array<() => Promise<void>> = [];
  private activeRequests: number = 0;

  constructor() {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.initialDelayMs = config.initialDelayMs;
    this.maxDelayMs = config.maxDelayMs;
    this.concurrencyLimit = config.concurrencyLimit;
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0 && !this.apiKey.startsWith('your-');
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  private async makeRequest(url: string, method: string, body?: object, traceId?: string): Promise<{ status: number; data: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = this.buildHeaders();
      
      console.log(`[Volcengine] API Request: ${method} ${url}, trace_id=${traceId}`);
      console.log(`[Volcengine] Request Headers: Authorization=Bearer ***`);
      if (body) {
        console.log(`[Volcengine] Request Body: ${JSON.stringify(body).substring(0, 500)}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { message: response.statusText };
      }

      console.log(`[Volcengine] API Response: status=${response.status}, trace_id=${traceId}`);
      console.log(`[Volcengine] Response Data: ${JSON.stringify(data).substring(0, 800)}`);

      return { status: response.status, data };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private async requestWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries,
    traceId?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const shouldRetry = lastError.message.includes('timeout') || 
                           lastError.message.includes('500') || 
                           lastError.message.includes('502') || 
                           lastError.message.includes('503') ||
                           lastError.message.includes('429');
        
        if (shouldRetry && attempt < retries) {
          const delay = Math.min(
            this.initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
            this.maxDelayMs
          );
          
          console.log(`[Volcengine] Retry attempt ${attempt}/${retries}: ${lastError.message}, delay=${Math.round(delay)}ms, trace_id=${traceId}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw lastError;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private async enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.activeRequests++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      if (this.activeRequests < this.concurrencyLimit) {
        task();
      } else {
        this.queue.push(task);
        console.log(`[Volcengine] Request queued. Queue size: ${this.queue.length}`);
      }
    });
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.activeRequests < this.concurrencyLimit) {
      const task = this.queue.shift();
      if (task) {
        task();
      }
    }
  }

  async generateVideo(input: VideoGenerationInput, traceId?: string): Promise<VideoGenerationOutput> {
    if (!this.isAvailable()) {
      throw new Error('Volcengine API key not configured');
    }

    const taskId = generateTaskId();
    logStep(traceId || '', traceId || '', 'volcengine.generateVideo', 'start', taskId, `input: ${input.image.substring(0, 50)}...`);

    console.log(`[Volcengine] Generating video: taskId=${taskId}, image=${input.image.substring(0, 80)}..., trace_id=${traceId}`);

    try {
      const url = `${this.baseUrl}/contents/generations/tasks`;
      
      const content: any[] = [
        {
          type: 'text',
          text: `${input.prompt || '生成视频'} --rs 720p --rt 16:9 --dur ${input.duration || 4}`
        }
      ];

      if (input.image && input.image.startsWith('http')) {
        content.push({
          type: 'image_url',
          image_url: {
            url: input.image
          }
        });
      }

      const body = {
        model: 'doubao-seedance-1-5-pro-251215',
        content
      };

      const response = await this.enqueueRequest(() => 
        this.requestWithRetry(() => this.makeRequest(url, 'POST', body, traceId), this.maxRetries, traceId)
      );

      if (response.status === 200 || response.status === 201) {
        const result = response.data;
        
        if (result.id) {
          const apiTaskId = result.id;
          logStep(traceId || '', traceId || '', 'volcengine.pollForResult', 'start', taskId, `api_task_id=${apiTaskId}`);
          const pollResult = await this.pollForResult(apiTaskId, taskId, traceId);
          logStep(traceId || '', traceId || '', 'volcengine.pollForResult', pollResult.status === 'success' ? 'success' : 'error', taskId);
          return pollResult;
        }
        
        if (result.video_url || result.output_url || result.data?.video_url) {
          const videoUrl = ensureVideoUrlAccessible(result.video_url || result.output_url || result.data?.video_url || '');
          logStep(traceId || '', traceId || '', 'volcengine.generateVideo', 'success', taskId, `video_url=${videoUrl.substring(0, 50)}...`);
          return {
            video_url: videoUrl,
            status: 'success',
            model: 'volcengine',
            cost_estimate: 0.12,
            task_id: taskId
          };
        }

        if (result.data) {
          if (result.data.task_id || result.data.taskId) {
            const apiTaskId = result.data.task_id || result.data.taskId;
            logStep(traceId || '', traceId || '', 'volcengine.pollForResult', 'start', taskId, `api_task_id=${apiTaskId}`);
            const pollResult = await this.pollForResult(apiTaskId, taskId, traceId);
            logStep(traceId || '', traceId || '', 'volcengine.pollForResult', pollResult.status === 'success' ? 'success' : 'error', taskId);
            return pollResult;
          }
          if (result.data.video_url) {
            const videoUrl = ensureVideoUrlAccessible(result.data.video_url);
            logStep(traceId || '', traceId || '', 'volcengine.generateVideo', 'success', taskId, `video_url=${videoUrl.substring(0, 50)}...`);
            return {
              video_url: videoUrl,
              status: 'success',
              model: 'volcengine',
              cost_estimate: 0.12,
              task_id: taskId
            };
          }
        }
      }

      console.error('[Volcengine] API error:', response.data);
      
      if (response.status === 401) {
        throw new Error('Authentication failed: Invalid API key (401)');
      } else if (response.status === 403) {
        throw new Error('Forbidden: Insufficient permissions (403)');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded (429)');
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status})`);
      }

      logStep(traceId || '', traceId || '', 'volcengine.generateVideo', 'error', taskId, `HTTP ${response.status}`);
      return {
        video_url: '',
        status: 'failed',
        model: 'volcengine',
        cost_estimate: 0,
        task_id: taskId,
        error_message: response.data?.message || response.data?.error || response.data?.detail || `HTTP ${response.status}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Volcengine] Video generation failed: ${errorMessage}, trace_id=${traceId}`);
      logStep(traceId || '', traceId || '', 'volcengine.generateVideo', 'error', taskId, errorMessage);

      return {
        video_url: '',
        status: 'failed',
        model: 'volcengine',
        cost_estimate: 0,
        task_id: taskId,
        error_message: errorMessage
      };
    }
  }

  private async pollForResult(taskId: string, ourTaskId: string, traceId?: string): Promise<VideoGenerationOutput> {
    const maxAttempts = 20;
    const delay = 3000;

    console.log(`[Volcengine] Polling for task: ${taskId}, maxAttempts=${maxAttempts}, delay=${delay}ms, trace_id=${traceId}`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const url = `${this.baseUrl}/contents/generations/tasks/${taskId}`;
        const response = await this.makeRequest(url, 'GET', undefined, traceId);

        if (response.status === 200) {
          const result = response.data;
          const status = result.status?.toLowerCase() || 'processing';

          console.log(`[Volcengine] Poll attempt ${i + 1}: status=${status}, trace_id=${traceId}`);

          if (status === 'succeeded') {
            const videoUrl = ensureVideoUrlAccessible(result.content?.video_url || '');
            console.log(`[Volcengine] Video generated: ${videoUrl.substring(0, 80)}..., trace_id=${traceId}`);
            return {
              video_url: videoUrl,
              status: 'success',
              model: 'volcengine',
              cost_estimate: 0.12,
              task_id: ourTaskId
            };
          } else if (status === 'failed') {
            return {
              video_url: '',
              status: 'failed',
              model: 'volcengine',
              cost_estimate: 0,
              task_id: ourTaskId,
              error_message: result.error?.message || 'Generation failed'
            };
          } else if (status === 'running' || status === 'queued') {
            console.log(`[Volcengine] Task ${taskId} is ${status}, attempt ${i + 1}/${maxAttempts}`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`[Volcengine] Polling error: ${error instanceof Error ? error.message : error}, trace_id=${traceId}`);
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return {
          video_url: '',
          status: 'failed',
          model: 'volcengine',
          cost_estimate: 0,
          task_id: ourTaskId,
          error_message: 'Polling timeout'
        };
      }
    }

    return {
      video_url: '',
      status: 'failed',
      model: 'volcengine',
      cost_estimate: 0,
      task_id: ourTaskId,
      error_message: 'Timeout waiting for result (60s)'
    };
  }

  async checkTaskStatus(taskId: string): Promise<VideoGenerationOutput> {
    try {
      const url = `${this.baseUrl}/tasks/${taskId}`;
      const response = await this.makeRequest(url, 'GET');

      if (response.status === 200) {
        const result = response.data;
        const data = result.data || result;
        const status = data.status?.toLowerCase() || 'processing';

        if (status === 'success' || status === 'completed') {
          const videoUrl = ensureVideoUrlAccessible(data.video_url || data.output_url || '');
          return {
            video_url: videoUrl,
            status: 'success',
            model: 'volcengine',
            cost_estimate: 0.12,
            task_id: taskId
          };
        } else if (status === 'failed') {
          return {
            video_url: '',
            status: 'failed',
            model: 'volcengine',
            cost_estimate: 0,
            task_id: taskId,
            error_message: data.message || 'Task failed'
          };
        }
      }
    } catch (error) {
      console.error(`[Volcengine] Check status error: ${error instanceof Error ? error.message : error}`);
    }

    return {
      video_url: '',
      status: 'processing',
      model: 'volcengine',
      cost_estimate: 0.12,
      task_id: taskId
    };
  }

  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, message: 'API key not configured' };
      }

      const url = `${this.baseUrl}/models`;
      const response = await this.makeRequest(url, 'GET');

      if (response.status === 200) {
        return { success: true, message: 'Volcengine API is available' };
      }

      return { success: false, message: `Health check failed: ${response.status}` };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : error}` 
      };
    }
  }
}

const volcengineAdapter = new VolcengineAdapter();

async function generateMockVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
  console.log('[VolcengineService] Using mock fallback');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const taskId = generateTaskId();
  
  return {
    video_url: generateMockVideoUrl(taskId),
    status: 'success',
    model: 'volcengine-mock',
    cost_estimate: 0,
    task_id: taskId,
    isMock: true
  };
}

export async function generateVideo(
  input: VideoGenerationInput,
  traceId?: string
): Promise<VideoGenerationOutput> {
  const taskId = generateTaskId();

  if (process.env.USE_REAL_AI !== 'true') {
    return generateMockVideo(input);
  }

  if (!volcengineAdapter.isAvailable()) {
    console.log('[VolcengineService] API key not configured, using mock');
    return generateMockVideo(input);
  }

  let attempts = 0;
  let lastError: string | undefined;

  while (attempts < config.maxRetries) {
    try {
      attempts++;
      
      console.log(`[VolcengineService] Attempt ${attempts}/${config.maxRetries}, trace_id=${traceId}`);
      
      const result = await volcengineAdapter.generateVideo(input, traceId);
      
      if (result.status === 'success') {
        console.log(`[VolcengineService] Video generated successfully: ${result.task_id}, trace_id=${traceId}`);
        return { ...result, task_id: taskId };
      }

      if (result.error_message?.includes('rate limit')) {
        console.log('[VolcengineService] Rate limit hit, falling back to mock');
        return generateMockVideo(input);
      }

      lastError = result.error_message;
      console.log(`[VolcengineService] Attempt ${attempts} failed: ${lastError}`);

      if (attempts < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        continue;
      }

      return { ...result, task_id: taskId };

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (lastError.includes('rate limit')) {
        console.log('[VolcengineService] Rate limit hit, falling back to mock');
        return generateMockVideo(input);
      }
      
      if (attempts < config.maxRetries) {
        console.log(`[VolcengineService] Attempt ${attempts} failed: ${lastError}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        continue;
      }

      break;
    }
  }

  console.log(`[VolcengineService] All attempts failed, returning mock fallback: ${lastError}`);
  return generateMockVideo(input);
}

export async function checkVideoStatus(taskId: string): Promise<VideoGenerationOutput> {
  if (!volcengineAdapter.isAvailable()) {
    return {
      video_url: generateMockVideoUrl(taskId),
      status: 'success',
      model: 'volcengine-mock',
      cost_estimate: 0,
      task_id: taskId,
      isMock: true
    };
  }

  return volcengineAdapter.checkTaskStatus(taskId);
}

export async function verifyVolcengineService(): Promise<{
  success: boolean;
  message: string;
}> {
  return volcengineAdapter.verifyConnection();
}

export const volcengineService = {
  generateVideo,
  checkVideoStatus,
  verifyVolcengineService,
  initVolcengineService
};

export default volcengineService;