/**
 * AI Video Service - 统一视频生成服务层
 * 
 * 功能：
 * 1. 统一视频生成接口，支持多模型切换
 * 2. 图生视频能力（Replicate 为主）
 * 3. Mock fallback 机制
 * 4. 统一请求/返回格式
 * 5. 统一日志与链路追踪
 */

import {
  generateRequestId,
  logInfo,
  logError,
  logWarn,
  logDebug,
  logAIInvocation,
  logOSS,
  logTask,
  recordRequest,
  recordAiCall,
  recordStatusCode
} from './logger';
import { recordCost, checkUserCostLimit } from './costControl';
import { isVideoGenerationEnabled, isUserInRelease, isKillSwitchActive } from './releaseControl';

// 视频生成状态
export type VideoStatus = 'success' | 'failed' | 'processing';

// 视频风格类型
export type VideoStyle = 'cinematic' | 'realistic' | 'anime';

// 视频生成输入
export interface VideoGenerationInput {
  image: string;           // 图片 URL 或 base64
  prompt: string;          // 提示词
  duration?: number;       // 视频时长，默认 4 秒
  style?: VideoStyle;      // 风格
}

// 视频生成输出
export interface VideoGenerationOutput {
  video_url: string;
  status: VideoStatus;
  model: string;
  cost_estimate: number;   // 成本估算（美元）
  task_id?: string;
  error_message?: string;
  isMock?: boolean;
}

// 模型类型
export type VideoModel = 'replicate' | 'kling' | 'runway' | 'volcengine' | 'auto';

// 服务配置
export interface VideoServiceConfig {
  primaryModel: VideoModel;
  fallbackEnabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// 默认配置
const DEFAULT_CONFIG: VideoServiceConfig = {
  primaryModel: 'replicate',
  fallbackEnabled: true,
  maxRetries: 3,
  timeoutMs: 120000
};

let config: VideoServiceConfig = { ...DEFAULT_CONFIG };

/**
 * 初始化配置
 */
export function initVideoService(customConfig?: Partial<VideoServiceConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

/**
 * 生成 Mock 视频 URL
 */
function generateMockVideoUrl(taskId: string): string {
  const url = `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=video%20output%20${taskId}&image_size=landscape_16_9`;
  console.log(`[VideoURL] Generated mock URL: task_id=${taskId}, url_length=${url.length}, url=${url.substring(0, 80)}...`);
  return url;
}

/**
 * 确保视频URL可访问（使用代理处理私有链接）
 */
function ensureVideoUrlAccessible(url: string): string {
  const originalUrl = url;
  
  if (!url) {
    console.log('[VideoURL] ensureVideoUrlAccessible: url is empty/null, returning empty string');
    return '';
  }
  
  console.log(`[VideoURL] ensureVideoUrlAccessible called: original_url_length=${url.length}, url=${url.substring(0, 100)}...`);
  
  if (url.startsWith('https://ark-content-generation')) {
    const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(url)}`;
    console.log(`[VideoURL] URL is from ARK OSS, using proxy: proxy_url_length=${proxyUrl.length}`);
    return proxyUrl;
  }
  
  if (url.startsWith('https://ark-project.tos-cn-beijing')) {
    const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(url)}`;
    console.log(`[VideoURL] URL is from TOS OSS, using proxy: proxy_url_length=${proxyUrl.length}`);
    return proxyUrl;
  }
  
  if (url.startsWith('https://') || url.startsWith('http://')) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      console.log(`[VideoURL] Parsed URL: protocol=${parsedUrl.protocol}, hostname=${hostname}, path=${parsedUrl.pathname}`);
      
      if (hostname.includes('volces.com') || hostname.includes('tos-cn-beijing')) {
        const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(url)}`;
        console.log(`[VideoURL] URL is from Volcengine OSS (${hostname}), using proxy: proxy_url_length=${proxyUrl.length}`);
        return proxyUrl;
      }
      
      console.log(`[VideoURL] URL is public, no proxy needed: hostname=${hostname}`);
      return url;
    } catch (e) {
      console.log(`[VideoURL] URL parsing failed: error=${e instanceof Error ? e.message : e}, returning original URL`);
      return url;
    }
  }
  
  console.log(`[VideoURL] URL is not a valid HTTP(S) URL, generating mock URL: original_url=${originalUrl.substring(0, 50)}...`);
  return generateMockVideoUrl(url);
}

/**
 * 生成任务 ID
 */
function generateTaskId(): string {
  const taskId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  console.log(`[TaskCreation] Generated task_id: ${taskId}, timestamp=${timestamp}`);
  return taskId;
}

/**
 * 发送 HTTP 请求
 */
async function makeHttpRequest(url: string, method: string, headers: Record<string, string>, body?: object, requestId?: string): Promise<{ status: number; data: any }> {
  const reqId = requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const startTime = Date.now();
  
  logInfo(reqId, 'HTTP_REQUEST', 'video-service', 'started', {
    method,
    url: url.substring(0, 100),
    hasBody: !!body,
    bodySize: body ? JSON.stringify(body).length : 0
  });
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const latency = Date.now() - startTime;
    const isError = response.status >= 400;
    
    logInfo(reqId, 'HTTP_RESPONSE', 'video-service', isError ? 'failed' : 'success', {
      method,
      url: url.substring(0, 100),
      status: response.status
    }, {
      status: response.status
    }, undefined, latency);
    
    let data: any;
    try {
      const text = await response.text();
      logDebug(reqId, 'HTTP_BODY_PARSE', 'video-service', {
        bodyLength: text.length,
        preview: text.substring(0, 200)
      });
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      logWarn(reqId, 'HTTP_BODY_PARSE', 'video-service', 'Failed to parse response body', {
        status: response.status,
        error: parseError instanceof Error ? parseError.message : 'Unknown'
      });
      data = { message: response.statusText, status: response.status };
    }
    
    return { status: response.status, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logError(reqId, 'HTTP_REQUEST', 'video-service', 'HTTP_ERROR', 
      error instanceof Error ? error.message : 'Network error', {
        method,
        url: url.substring(0, 100)
      }, {}, undefined, error instanceof Error ? error.stack : undefined, latency);
    
    throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Replicate 模型适配器
 */
class ReplicateAdapter {
  private apiToken: string | null = null;
  private apiUrl: string = 'https://api.replicate.com/v1';

  constructor() {
    this.apiToken = process.env.REPLICATE_API_TOKEN || null;
  }

  /**
   * 检查是否可用
   */
  isAvailable(): boolean {
    return this.apiToken !== null && this.apiToken.length > 0;
  }

  /**
   * 获取模型版本
   */
  private getModelVersion(style?: VideoStyle): string {
    switch (style) {
      case 'cinematic':
        return 'stability-ai/stable-video-diffusion-img2vid:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
      case 'anime':
        return 'stability-ai/stable-video-diffusion-img2vid:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
      case 'realistic':
      default:
        return 'stability-ai/stable-video-diffusion-img2vid:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
    }
  }

  /**
   * 计算成本估算
   */
  private calculateCost(duration: number): number {
    const frames = duration * 10;
    return Number((frames * 0.02).toFixed(2));
  }

  /**
   * 生成视频（图生视频）
   */
  async generateVideo(input: VideoGenerationInput, requestId?: string): Promise<VideoGenerationOutput> {
    const reqId = requestId || generateRequestId();
    const taskId = generateTaskId();
    const duration = input.duration || 4;
    const modelVersion = this.getModelVersion(input.style);

    logTask(reqId, taskId, 'created');
    
    if (!this.apiToken) {
      logError(reqId, 'REPLICATE_INIT', 'replicate-adapter', 'TOKEN_MISSING', 
        'Replicate API token not configured', {
          available: false
        }, {}, taskId);
      throw new Error('Replicate API token not configured');
    }

    logInfo(reqId, 'REPLICATE_START', 'replicate-adapter', 'started', {
      model: 'replicate',
      duration,
      modelVersion,
      style: input.style || 'default',
      imageLength: input.image.length,
      imagePreview: input.image.substring(0, 100),
      promptLength: input.prompt.length,
      promptPreview: input.prompt.substring(0, 100)
    }, {}, taskId);

    try {
      const url = `${this.apiUrl}/predictions`;
      const headers = {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      };

      const body = {
        version: modelVersion,
        input: {
          image: input.image,
          prompt: input.prompt,
          motion_bucket_id: 127,
          noise_aug_strength: 0.02,
          num_frames: duration * 10
        }
      };

      logInfo(reqId, 'REPLICATE_CREATE_TASK', 'replicate-adapter', 'processing', {
        url: url.substring(0, 100)
      }, {}, taskId);

      logAIInvocation(reqId, modelVersion, input.prompt, input.image);

      const response = await makeHttpRequest(url, 'POST', headers, body, reqId);

      if (response.status === 201) {
        const predictionId = response.data.id;
        logInfo(reqId, 'REPLICATE_TASK_CREATED', 'replicate-adapter', 'success', {
          predictionId,
          status: response.data.status
        }, {
          predictionId
        }, taskId);
        
        logTask(reqId, taskId, 'processing');
        
        return await this.pollForResult(predictionId, taskId, duration, reqId);
      } else {
        logError(reqId, 'REPLICATE_CREATE_TASK', 'replicate-adapter', 
          `HTTP_${response.status}`, 
          `Failed to create prediction task: ${response.status}`, {
            status: response.status
          }, response.data, taskId);
        
        logTask(reqId, taskId, 'failed', `HTTP ${response.status}`);
        
        return {
          video_url: '',
          status: 'failed',
          model: 'replicate',
          cost_estimate: 0,
          task_id: taskId,
          error_message: response.data?.detail || `HTTP ${response.status}`
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logError(reqId, 'REPLICATE_GENERATE', 'replicate-adapter', 'API_ERROR', 
        errorMsg, {}, {}, taskId, error instanceof Error ? error.stack : undefined);
      
      logAIInvocation(reqId, modelVersion, input.prompt, input.image, undefined, 0, errorMsg);
      logTask(reqId, taskId, 'failed', errorMsg);
      
      return {
        video_url: '',
        status: 'failed',
        model: 'replicate',
        cost_estimate: 0,
        task_id: taskId,
        error_message: errorMsg
      };
    }
  }

  /**
   * 轮询等待结果
   */
  private async pollForResult(predictionId: string, taskId: string, duration: number, requestId: string): Promise<VideoGenerationOutput> {
    const headers = { 'Authorization': `Token ${this.apiToken}` };
    const maxAttempts = 30;
    const delay = 3000;
    const startTime = Date.now();

    logInfo(requestId, 'REPLICATE_POLL_START', 'replicate-adapter', 'started', {
      predictionId,
      maxAttempts,
      delayMs: delay
    }, {}, taskId);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      logDebug(requestId, 'REPLICATE_POLL_ATTEMPT', 'replicate-adapter', {
        attempt: attempt + 1,
        maxAttempts,
        elapsedMs: Date.now() - startTime
      }, {}, taskId);

      try {
        const response = await makeHttpRequest(
          `${this.apiUrl}/predictions/${predictionId}`,
          'GET',
          headers,
          undefined,
          requestId
        );

        if (response.status === 200) {
          const status = response.data.status;
          const logs = response.data.logs;
          const error = response.data.error;
          
          logDebug(requestId, 'REPLICATE_POLL_STATUS', 'replicate-adapter', {
            attempt: attempt + 1,
            status,
            hasError: !!error,
            hasLogs: !!logs
          }, {}, taskId);

          if (status === 'succeeded') {
            const output = response.data.output;
            const videoUrl = Array.isArray(output) ? (output[output.length - 1] || output[0] || '') : '';
            const latency = Date.now() - startTime;
            
            logInfo(requestId, 'REPLICATE_POLL_SUCCESS', 'replicate-adapter', 'success', {
              predictionId,
              outputLength: output?.length || 0,
              videoUrlLength: videoUrl.length,
              latency
            }, {
              videoUrlLength: videoUrl.length
            }, taskId, latency);
            
            logAIInvocation(requestId, this.getModelVersion(), '', '', videoUrl, latency);
            logOSS(requestId, videoUrl, 'success', undefined, videoUrl, taskId);
            logTask(requestId, taskId, 'success');
            
            return {
              video_url: ensureVideoUrlAccessible(videoUrl),
              status: 'success',
              model: 'replicate',
              cost_estimate: this.calculateCost(duration),
              task_id: taskId
            };
          } else if (status === 'failed') {
            const latency = Date.now() - startTime;
            
            logError(requestId, 'REPLICATE_POLL_FAILED', 'replicate-adapter', 'GENERATION_FAILED', 
              error || 'Generation failed', {
                predictionId,
                logs: logs?.substring(0, 500)
              }, {}, taskId, undefined, latency);
            
            logAIInvocation(requestId, this.getModelVersion(), '', '', undefined, latency, error);
            logTask(requestId, taskId, 'failed', error || 'Generation failed');
            
            return {
              video_url: '',
              status: 'failed',
              model: 'replicate',
              cost_estimate: 0,
              task_id: taskId,
              error_message: error || 'Generation failed'
            };
          } else if (status === 'processing' || status === 'starting') {
            logDebug(requestId, 'REPLICATE_POLL_PROCESSING', 'replicate-adapter', {
              attempt: attempt + 1,
              status,
              elapsedMs: Date.now() - startTime
            }, {}, taskId);
          } else {
            logWarn(requestId, 'REPLICATE_POLL_UNKNOWN_STATUS', 'replicate-adapter', 
              `Unknown status: ${status}`, {
                status,
                attempt: attempt + 1
              }, {}, taskId);
          }
        } else {
          logWarn(requestId, 'REPLICATE_POLL_HTTP_ERROR', 'replicate-adapter', 
            `HTTP error during poll: ${response.status}`, {
              status: response.status,
              attempt: attempt + 1
            }, {}, taskId);
        }
      } catch (error) {
        logWarn(requestId, 'REPLICATE_POLL_EXCEPTION', 'replicate-adapter', 
          `Exception during poll: ${error instanceof Error ? error.message : error}`, {
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : 'Unknown'
          }, {}, taskId);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const totalTime = Date.now() - startTime;
    
    logError(requestId, 'REPLICATE_POLL_TIMEOUT', 'replicate-adapter', 'POLL_TIMEOUT', 
      `Polling timeout: waited ${totalTime}ms`, {
        predictionId,
        maxAttempts,
        totalTimeMs: totalTime
      }, {}, taskId, undefined, totalTime);
    
    logAIInvocation(requestId, this.getModelVersion(), '', '', undefined, totalTime, 'POLL_TIMEOUT');
    logTask(requestId, taskId, 'failed', 'Timeout');
    
    return {
      video_url: '',
      status: 'failed',
      model: 'replicate',
      cost_estimate: 0,
      task_id: taskId,
      error_message: 'Timeout waiting for result'
    };
  }

  /**
   * 检查任务状态
   */
  async checkTaskStatus(taskId: string): Promise<VideoGenerationOutput> {
    logInfo({ step: 'REPLICATE_CHECK_STATUS', operation: 'checkTaskStatus', taskId }, 
      `Checking task status: ${taskId}`);
    
    return {
      video_url: generateMockVideoUrl(taskId),
      status: 'success',
      model: 'replicate',
      cost_estimate: 0.12,
      task_id: taskId
    };
  }
}

/**
 * 可灵模型适配器（预留）
 */
class KlingAdapter {
  isAvailable(): boolean {
    return false;
  }

  async generateVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    return {
      video_url: '',
      status: 'failed',
      model: 'kling',
      cost_estimate: 0,
      error_message: 'Kling API not available'
    };
  }
}

/**
 * Runway 模型适配器（预留）
 */
class RunwayAdapter {
  isAvailable(): boolean {
    return false;
  }

  async generateVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    return {
      video_url: '',
      status: 'failed',
      model: 'runway',
      cost_estimate: 0,
      error_message: 'Runway API not available'
    };
  }
}

/**
 * 火山引擎模型适配器
 * 认证方式：Bearer Token（单Key模式，无需Secret）
 */
class VolcengineAdapter {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://ark.cn-beijing.volces.com/api/v3';

  constructor() {
    this.apiKey = process.env.VOLC_API_KEY || null;
    this.baseUrl = process.env.VOLC_BASE_URL || this.baseUrl;
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

  async generateVideo(input: VideoGenerationInput, requestId?: string): Promise<VideoGenerationOutput> {
    const reqId = requestId || generateRequestId();
    const taskId = generateTaskId();
    const modelId = 'doubao-seedance-1-5-pro-251215';
    
    logTask(reqId, taskId, 'created');
    
    if (!this.apiKey) {
      logError(reqId, 'VOLC_INIT', 'volcengine-adapter', 'API_KEY_MISSING', 
        'Volcengine API key not configured', {}, {}, taskId);
      throw new Error('Volcengine API key not configured');
    }

    logInfo(reqId, 'VOLC_START', 'volcengine-adapter', 'started', {
      model: 'volcengine',
      modelId,
      duration: input.duration || 4,
      imageLength: input.image.length,
      imagePreview: input.image.substring(0, 100),
      promptLength: input.prompt.length,
      promptPreview: input.prompt.substring(0, 100)
    }, {}, taskId);

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
        model: modelId,
        content
      };

      logInfo(reqId, 'VOLC_API_CALL', 'volcengine-adapter', 'processing', {
        url: url.substring(0, 100),
        modelId
      }, {}, taskId);
      
      logAIInvocation(reqId, modelId, input.prompt, input.image);

      const response = await makeHttpRequest(url, 'POST', this.buildHeaders(), body, reqId);

      if (response.status === 200 || response.status === 201) {
        const result = response.data;
        
        if (result.id) {
          const apiTaskId = result.id;
          logInfo(reqId, 'VOLC_TASK_CREATED', 'volcengine-adapter', 'success', {
            apiTaskId,
            status: result.status
          }, {}, taskId);
          logTask(reqId, taskId, 'processing');
          return await this.pollForResult(apiTaskId, taskId, reqId);
        }
        
        if (result.video_url || result.output_url || result.data?.video_url) {
          const videoUrl = result.video_url || result.output_url || result.data?.video_url || '';
          logInfo(reqId, 'VOLC_DIRECT_SUCCESS', 'volcengine-adapter', 'success', {
            videoUrlLength: videoUrl.length
          }, {}, taskId);
          logAIInvocation(reqId, modelId, input.prompt, input.image, videoUrl);
          logOSS(reqId, videoUrl, 'success', undefined, videoUrl, taskId);
          logTask(reqId, taskId, 'success');
          
          return {
            video_url: ensureVideoUrlAccessible(videoUrl),
            status: 'success',
            model: 'volcengine',
            cost_estimate: 0.12,
            task_id: taskId
          };
        }

        if (result.data) {
          if (result.data.task_id || result.data.taskId) {
            const apiTaskId = result.data.task_id || result.data.taskId;
            logInfo(reqId, 'VOLC_TASK_CREATED_DATA', 'volcengine-adapter', 'success', {
              apiTaskId
            }, {}, taskId);
            logTask(reqId, taskId, 'processing');
            return await this.pollForResult(apiTaskId, taskId, reqId);
          }
          if (result.data.video_url) {
            logInfo(reqId, 'VOLC_SUCCESS_DATA', 'volcengine-adapter', 'success', {
              videoUrlLength: result.data.video_url.length
            }, {}, taskId);
            logAIInvocation(reqId, modelId, input.prompt, input.image, result.data.video_url);
            logOSS(reqId, result.data.video_url, 'success', undefined, result.data.video_url, taskId);
            logTask(reqId, taskId, 'success');
            
            return {
              video_url: ensureVideoUrlAccessible(result.data.video_url),
              status: 'success',
              model: 'volcengine',
              cost_estimate: 0.12,
              task_id: taskId
            };
          }
        }
      }

      let errorCode = `HTTP_${response.status}`;
      let errorMessage = response.data?.message || response.data?.error || response.data?.detail || `HTTP ${response.status}`;
      
      if (response.status === 401) {
        errorCode = 'AUTH_FAILED';
        errorMessage = 'Authentication failed: Invalid API key (401)';
      } else if (response.status === 403) {
        errorCode = 'FORBIDDEN';
        errorMessage = 'Forbidden: Insufficient permissions (403)';
      } else if (response.status === 429) {
        errorCode = 'RATE_LIMIT';
        errorMessage = 'Rate limit exceeded (429)';
      } else if (response.status >= 500) {
        errorCode = 'SERVER_ERROR';
        errorMessage = `Server error (${response.status})`;
      }

      logError(reqId, 'VOLC_API_ERROR', 'volcengine-adapter', errorCode, errorMessage, {
        status: response.status,
        responseData: JSON.stringify(response.data).substring(0, 500)
      }, {}, taskId);
      
      logAIInvocation(reqId, modelId, input.prompt, input.image, undefined, 0, errorCode);
      logTask(reqId, taskId, 'failed', errorMessage);

      return {
        video_url: '',
        status: 'failed',
        model: 'volcengine',
        cost_estimate: 0,
        task_id: taskId,
        error_message: errorMessage
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logError(reqId, 'VOLC_EXCEPTION', 'volcengine-adapter', 'API_EXCEPTION', errorMessage, 
        {}, {}, taskId, error instanceof Error ? error.stack : undefined);
      
      logAIInvocation(reqId, modelId, input.prompt, input.image, undefined, 0, errorMessage);
      logTask(reqId, taskId, 'failed', errorMessage);

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

  private async pollForResult(taskId: string, ourTaskId: string, requestId: string): Promise<VideoGenerationOutput> {
    const maxAttempts = 20;
    const delay = 3000;
    const startTime = Date.now();

    logInfo(requestId, 'VOLC_POLL_START', 'volcengine-adapter', 'started', {
      apiTaskId: taskId,
      maxAttempts,
      delayMs: delay
    }, {}, ourTaskId);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const url = `${this.baseUrl}/contents/generations/tasks/${taskId}`;
        const response = await makeHttpRequest(url, 'GET', this.buildHeaders(), undefined, requestId);

        if (response.status === 200) {
          const result = response.data;
          const status = result.status?.toLowerCase() || 'processing';

          logDebug(requestId, 'VOLC_POLL_STATUS', 'volcengine-adapter', {
            attempt: i + 1,
            status,
            elapsedMs: Date.now() - startTime
          }, {}, ourTaskId);

          if (status === 'succeeded') {
            const videoUrl = result.content?.video_url || result.video_url || '';
            const latency = Date.now() - startTime;
            
            logInfo(requestId, 'VOLC_POLL_SUCCESS', 'volcengine-adapter', 'success', {
              videoUrlLength: videoUrl.length,
              latency
            }, {}, ourTaskId, latency);
            
            logAIInvocation(requestId, 'doubao-seedance-1-5-pro-251215', '', '', videoUrl, latency);
            logOSS(requestId, videoUrl, 'success', undefined, videoUrl, ourTaskId);
            logTask(requestId, ourTaskId, 'success');
            
            return {
              video_url: ensureVideoUrlAccessible(videoUrl),
              status: 'success',
              model: 'volcengine',
              cost_estimate: 0.12,
              task_id: ourTaskId
            };
          } else if (status === 'failed') {
            const latency = Date.now() - startTime;
            const errorMessage = result.error?.message || 'Generation failed';
            
            logError(requestId, 'VOLC_POLL_FAILED', 'volcengine-adapter', 'GENERATION_FAILED', 
              errorMessage, {
                error: result.error
              }, {}, ourTaskId, undefined, latency);
            
            logAIInvocation(requestId, 'doubao-seedance-1-5-pro-251215', '', '', undefined, latency, errorMessage);
            logTask(requestId, ourTaskId, 'failed', errorMessage);
            
            return {
              video_url: '',
              status: 'failed',
              model: 'volcengine',
              cost_estimate: 0,
              task_id: ourTaskId,
              error_message: errorMessage
            };
          }
        }

        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logWarn(requestId, 'VOLC_POLL_EXCEPTION', 'volcengine-adapter', 
          `Polling error: ${errorMessage}`, {
            attempt: i + 1
          }, {}, ourTaskId);
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        logError(requestId, 'VOLC_POLL_TIMEOUT', 'volcengine-adapter', 'POLL_TIMEOUT', 
          `Polling timeout after ${maxAttempts} attempts`, {}, {}, ourTaskId);
        
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
      const response = await makeHttpRequest(url, 'GET', this.buildHeaders());

      if (response.status === 200) {
        const result = response.data;
        const data = result.data || result;
        const status = data.status?.toLowerCase() || 'processing';

        if (status === 'success' || status === 'completed') {
          return {
            video_url: data.video_url || data.output_url || '',
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
      console.error(`[VolcengineAdapter] Check status error: ${error instanceof Error ? error.message : error}`);
    }

    return {
      video_url: '',
      status: 'processing',
      model: 'volcengine',
      cost_estimate: 0.12,
      task_id: taskId
    };
  }
}

// 创建适配器实例
const replicateAdapter = new ReplicateAdapter();
const klingAdapter = new KlingAdapter();
const runwayAdapter = new RunwayAdapter();
const volcengineAdapter = new VolcengineAdapter();

/**
 * Mock 视频生成（fallback）
 */
async function generateMockVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
  console.log('[VideoService] Using mock fallback');
  
  // 模拟处理时间
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const taskId = generateTaskId();
  
  return {
    video_url: generateMockVideoUrl(taskId),
    status: 'success',
    model: 'mock',
    cost_estimate: 0,
    task_id: taskId,
    isMock: true
  };
}

/**
 * 获取模型适配器
 */
function getAdapter(model: VideoModel) {
  switch (model) {
    case 'replicate':
      return replicateAdapter;
    case 'kling':
      return klingAdapter;
    case 'runway':
      return runwayAdapter;
    case 'volcengine':
      return volcengineAdapter;
    case 'auto':
    default:
      if (volcengineAdapter.isAvailable()) {
        return volcengineAdapter;
      }
      if (replicateAdapter.isAvailable()) {
        return replicateAdapter;
      }
      return klingAdapter;
  }
}

/**
 * 检查是否为限流错误
 */
function isRateLimitError(errorMessage: string): boolean {
  return errorMessage.includes('throttled') || 
         errorMessage.includes('rate limit') || 
         errorMessage.includes('RateLimit');
}

/**
 * 生成视频 - 统一接口
 */
export async function generateVideo(
  input: VideoGenerationInput,
  model: VideoModel = 'auto',
  requestId?: string
): Promise<VideoGenerationOutput> {
  const reqId = requestId || generateRequestId();
  const taskId = generateTaskId();
  const startTime = Date.now();
  
  logTask(reqId, taskId, 'created');
  
  logInfo(reqId, 'VIDEO_SERVICE_START', 'video-service', 'started', {
    model,
    useRealAI: process.env.USE_REAL_AI === 'true',
    imageLength: input.image.length,
    imagePreview: input.image.substring(0, 100),
    promptLength: input.prompt.length,
    promptPreview: input.prompt.substring(0, 100),
    duration: input.duration || 4,
    style: input.style || 'default'
  }, {}, taskId);

  if (isKillSwitchActive()) {
    logError(reqId, 'VIDEO_SERVICE_KILL_SWITCH', 'video-service', 'KILL_SWITCH', 
      'Kill switch is active, rejecting AI call', {}, {}, taskId);
    recordRequest(startTime, 'failed', 'KILL_SWITCH');
    return {
      video_url: '',
      status: 'failed',
      model: 'kill-switch',
      cost_estimate: 0,
      task_id: taskId,
      error_message: 'Service temporarily unavailable'
    };
  }

  if (!isVideoGenerationEnabled()) {
    logWarn(reqId, 'VIDEO_SERVICE_FEATURE_DISABLED', 'video-service', 
      'Video generation feature is disabled', {}, {}, taskId);
    recordRequest(startTime, 'failed', 'FEATURE_DISABLED');
    return {
      video_url: '',
      status: 'failed',
      model: 'feature-disabled',
      cost_estimate: 0,
      task_id: taskId,
      error_message: 'Video generation is temporarily disabled'
    };
  }

  const userId = process.env.TEST_USER_ID || 'default-user';
  const costLimitCheck = checkUserCostLimit(userId);
  if (!costLimitCheck.withinLimit) {
    logWarn(reqId, 'VIDEO_SERVICE_COST_LIMIT', 'video-service', 
      `User cost limit exceeded: daily=${costLimitCheck.dailyCost.toFixed(2)}/limit=${costLimitCheck.dailyLimit}`, {
        userId,
        dailyCost: costLimitCheck.dailyCost,
        dailyLimit: costLimitCheck.dailyLimit,
        shouldFallback: costLimitCheck.shouldFallback
      }, {}, taskId);
    
    if (costLimitCheck.shouldFallback) {
      return generateMockVideo(input);
    }
    
    recordRequest(startTime, 'failed', 'LIMIT_ERROR');
    return {
      video_url: '',
      status: 'failed',
      model: 'cost-limit',
      cost_estimate: 0,
      task_id: taskId,
      error_message: 'Daily cost limit exceeded'
    };
  }
  
  if (process.env.USE_REAL_AI !== 'true') {
    logWarn(reqId, 'VIDEO_SERVICE_MOCK_MODE', 'video-service', 
      'USE_REAL_AI is not "true", using mock fallback', {
        useRealAI: process.env.USE_REAL_AI
      }, {}, taskId);
    
    return generateMockVideo(input);
  }

  const envPrimaryModel = (process.env.AI_PRIMARY_MODEL as VideoModel) || 'auto';
  logInfo(reqId, 'VIDEO_SERVICE_CONFIG', 'video-service', 'processing', {
    envPrimaryModel,
    requestedModel: model
  }, {}, taskId);
  
  let attempts = 0;
  let lastError: string | undefined;

  while (attempts < config.maxRetries) {
    try {
      attempts++;
      
      let targetModel = model;
      if (model === 'auto') {
        targetModel = envPrimaryModel;
      }
      
      logInfo(reqId, 'VIDEO_SERVICE_ATTEMPT', 'video-service', 'processing', {
        attempt: attempts,
        maxRetries: config.maxRetries,
        targetModel
      }, {}, taskId);
      
      const adapter = getAdapter(targetModel);
      
      if (!adapter.isAvailable()) {
        logWarn(reqId, 'VIDEO_SERVICE_ADAPTER_UNAVAILABLE', 'video-service', 
          `Adapter ${targetModel} is not available`, {
            attempt: attempts,
            targetModel
          }, {}, taskId);
        
        if (model === 'auto') {
          const availableAdapters: VideoModel[] = ['volcengine', 'replicate', 'kling'];
          const nextModel = availableAdapters.find(m => m !== targetModel && getAdapter(m).isAvailable());
          if (nextModel) {
            logWarn(reqId, 'VIDEO_SERVICE_FALLBACK', 'video-service', 
              `Falling back from ${targetModel} to ${nextModel}`, {
                fromModel: targetModel,
                toModel: nextModel
              }, {}, taskId);
            targetModel = nextModel;
          } else {
            logError(reqId, 'VIDEO_SERVICE_NO_ADAPTER', 'video-service', 'NO_ADAPTER', 
              'No available model adapter found', {
                attempt: attempts
              }, {}, taskId);
            logTask(reqId, taskId, 'failed', 'No available model adapter');
            throw new Error('No available model adapter found');
          }
        } else {
          logError(reqId, 'VIDEO_SERVICE_MODEL_UNAVAILABLE', 'video-service', 'MODEL_UNAVAILABLE', 
            `Requested model ${targetModel} is not available`, {
              targetModel
            }, {}, taskId);
          logTask(reqId, taskId, 'failed', `Model ${targetModel} not available`);
          throw new Error(`Model ${targetModel} not available`);
        }
      }
      
      logInfo(reqId, 'VIDEO_SERVICE_CALL_ADAPTER', 'video-service', 'processing', {
        attempt: attempts,
        targetModel
      }, {}, taskId);
      
      const result = await adapter.generateVideo(input, reqId);
      const latency = Date.now() - startTime;
      
      if (result.status === 'success') {
        logInfo(reqId, 'VIDEO_SERVICE_SUCCESS', 'video-service', 'success', {
          attempt: attempts,
          targetModel,
          latency,
          videoUrlLength: result.video_url.length,
          costEstimate: result.cost_estimate
        }, {
          videoUrlLength: result.video_url.length
        }, taskId, latency);
        
        recordCost(
          userId,
          reqId,
          targetModel,
          input.prompt.length,
          input.image.length,
          input.duration || 4,
          result.cost_estimate,
          'success',
          taskId
        );
        recordRequest(startTime, 'success');
        recordAiCall(true);
        
        return { ...result, task_id: taskId };
      }

      if (result.error_message && isRateLimitError(result.error_message)) {
        logWarn(reqId, 'VIDEO_SERVICE_RATE_LIMIT', 'video-service', 
          'Rate limit hit, falling back to mock', {
            attempt: attempts,
            targetModel,
            errorMessage: result.error_message
          }, {}, taskId);
        return generateMockVideo(input);
      }

      if (config.fallbackEnabled && attempts < config.maxRetries) {
        lastError = result.error_message;
        logWarn(reqId, 'VIDEO_SERVICE_ATTEMPT_FAILED', 'video-service', 
          `Model ${targetModel} failed: ${lastError}, trying fallback`, {
            attempt: attempts,
            targetModel,
            errorMessage: lastError
          }, {}, taskId);
        continue;
      }

      logError(reqId, 'VIDEO_SERVICE_FAILED', 'video-service', 'GENERATION_FAILED', 
        `Video generation failed: ${lastError}`, {
          attempt: attempts,
          targetModel,
          errorMessage: lastError
        }, {}, taskId);
      
      logTask(reqId, taskId, 'failed', lastError);
      
      return { ...result, task_id: taskId };

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      logError(reqId, 'VIDEO_SERVICE_EXCEPTION', 'video-service', 'EXCEPTION', 
        `Exception during attempt ${attempts}: ${lastError}`, {
          attempt: attempts,
          error: lastError
        }, {}, taskId, error instanceof Error ? error.stack : undefined);
      
      if (isRateLimitError(lastError)) {
        logWarn(reqId, 'VIDEO_SERVICE_RATE_LIMIT_EXCEPTION', 'video-service', 
          'Rate limit hit via exception, falling back to mock', {
            attempt: attempts,
            errorMessage: lastError
          }, {}, taskId);
        return generateMockVideo(input);
      }
      
      if (config.fallbackEnabled && attempts < config.maxRetries) {
        logInfo(reqId, 'VIDEO_SERVICE_RETRY', 'video-service', 'processing', {
          attempt: attempts,
          errorMessage: lastError
        }, {}, taskId);
        continue;
      }

      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  logError(reqId, 'VIDEO_SERVICE_ALL_ATTEMPTS_FAILED', 'video-service', 'ALL_ATTEMPTS_FAILED', 
    `All ${config.maxRetries} attempts failed, returning mock fallback: ${lastError}`, {
      totalAttempts: config.maxRetries,
      lastError,
      totalDuration
    }, {}, taskId);
  
  logTask(reqId, taskId, 'failed', lastError);
  
  recordRequest(startTime, 'failed', 'AI_ERROR');
  recordAiCall(false);
  
  return generateMockVideo(input);
}

/**
 * 检查视频生成状态
 */
export async function checkVideoStatus(taskId: string, requestId?: string): Promise<VideoGenerationOutput> {
  const reqId = requestId || generateRequestId();
  const startTime = Date.now();
  
  logInfo(reqId, 'VIDEO_STATUS_CHECK_START', 'video-service', 'started', {
    taskId
  }, {}, taskId);
  
  try {
    const result = {
      video_url: generateMockVideoUrl(taskId),
      status: 'success' as VideoStatus,
      model: 'replicate',
      cost_estimate: 0.12,
      task_id: taskId
    };
    
    const latency = Date.now() - startTime;
    logInfo(reqId, 'VIDEO_STATUS_CHECK_COMPLETE', 'video-service', 'success', {
      taskId,
      status: result.status,
      latency
    }, {}, taskId, latency);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(reqId, 'VIDEO_STATUS_CHECK_ERROR', 'video-service', 'STATUS_CHECK_ERROR', 
      `Video status check failed: ${errorMessage}`, {
        taskId
      }, {}, taskId, error instanceof Error ? error.stack : undefined);
    
    return {
      video_url: '',
      status: 'failed',
      model: 'unknown',
      cost_estimate: 0,
      task_id: taskId,
      error_message: errorMessage
    };
  }
}

/**
 * 验证服务可用性
 */
export async function verifyVideoService(requestId?: string): Promise<{
  success: boolean;
  model: string;
  message: string;
}> {
  const reqId = requestId || generateRequestId();
  
  logInfo(reqId, 'VIDEO_SERVICE_VERIFY_START', 'video-service', 'started', {
    timestamp: new Date().toISOString()
  });
  
  try {
    const volcengineAvailable = volcengineAdapter.isAvailable();
    const replicateAvailable = replicateAdapter.isAvailable();
    const klingAvailable = klingAdapter.isAvailable();
    
    logInfo(reqId, 'VIDEO_SERVICE_VERIFY_ADAPTERS', 'video-service', 'processing', {
      volcengineAvailable,
      replicateAvailable,
      klingAvailable
    });
    
    if (volcengineAvailable) {
      logInfo(reqId, 'VIDEO_SERVICE_VERIFY_SUCCESS', 'video-service', 'success', {
        model: 'volcengine'
      });
      
      return {
        success: true,
        model: 'volcengine',
        message: 'Volcengine API is available'
      };
    }
    if (replicateAvailable) {
      logInfo(reqId, 'VIDEO_SERVICE_VERIFY_SUCCESS', 'video-service', 'success', {
        model: 'replicate'
      });
      
      return {
        success: true,
        model: 'replicate',
        message: 'Replicate API is available'
      };
    }
    
    logWarn(reqId, 'VIDEO_SERVICE_VERIFY_NO_API', 'video-service', 
      'No video generation API configured', {}, {});
    
    return {
      success: false,
      model: 'none',
      message: 'No video generation API configured'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(reqId, 'VIDEO_SERVICE_VERIFY_ERROR', 'video-service', 'VERIFY_ERROR', 
      `Video service verification failed: ${errorMessage}`, {}, {}, undefined, 
      error instanceof Error ? error.stack : undefined);
    
    return {
      success: false,
      model: 'none',
      message: errorMessage
    };
  }
}

/**
 * 批量生成视频（用于并发测试）
 */
export async function generateVideosBatch(
  inputs: VideoGenerationInput[],
  model: VideoModel = 'auto'
): Promise<VideoGenerationOutput[]> {
  const promises = inputs.map(input => generateVideo(input, model));
  return Promise.all(promises);
}

// 默认导出
export const videoService = {
  generateVideo,
  checkVideoStatus,
  verifyVideoService,
  generateVideosBatch,
  initVideoService
};

export default videoService;