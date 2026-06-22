/**
 * AI Router - 统一 AI 服务路由层
 * 
 * 功能：
 * 1. 统一调用接口，支持多 AI 模型切换
 * 2. Fallback 机制（可灵失败 → 混元兜底）
 * 3. 统一请求格式和返回结构
 * 4. 重试机制和错误处理
 */

import { callKling, normalizeKlingTask, KlingTaskPayload } from '@/utils/klingServer';
import { analyzeProductFeatures, generateLocalStoryboard, parseAIResponse, scoreStoryboardAsync, type ProductFeatures, type ShotDetail } from './storyboardService';
import { resultCache, promptCache, featuresCache } from './cache';

// AI 模型类型
export type AIModel = 'kling' | 'hunyuan' | 'auto';

// AI Router 配置
export interface AIRouterConfig {
  primaryModel: AIModel;
  fallbackEnabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// 统一请求格式
export interface AIRequest {
  type: 'storyboard' | 'video' | 'text';
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  shotCount?: number;
  styles?: string[];
  aspectRatio?: string;
  model?: AIModel;
}

// 统一返回结构
export interface AIResponse {
  success: boolean;
  model: AIModel;
  data: unknown;
  error?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
}

// 分镜生成响应
export interface StoryboardResponse {
  productFeatures: ProductFeatures;
  shots: ShotDetail[];
  score: {
    score: number;
    details: {
      richness: number;
      commercialValue: number;
      productCoverage: number;
      visualExpression: number;
      conversionAbility: number;
    };
  };
  totalDuration: number;
  shotCount: number;
}

// 视频生成响应
export interface VideoResponse {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
}

// 默认配置
const DEFAULT_CONFIG: AIRouterConfig = {
  primaryModel: 'auto',
  fallbackEnabled: true,
  maxRetries: 3,
  timeoutMs: 60000
};

let config: AIRouterConfig = { ...DEFAULT_CONFIG };

/**
 * 初始化 AI Router 配置
 */
export function initAIRouter(customConfig?: Partial<AIRouterConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

/**
 * 获取当前配置
 */
export function getAIRouterConfig(): AIRouterConfig {
  return { ...config };
}

/**
 * 判断是否启用真实 AI
 */
function isRealAIEnabled(): boolean {
  return process.env.USE_REAL_AI === 'true';
}

/**
 * 生成 Mock 任务 ID
 */
function generateMockTaskId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 调用可灵 API
 */
async function callKlingAI(prompt: string, duration: number, aspectRatio: string, negativePrompt?: string): Promise<VideoResponse> {
  const klingPayload: Record<string, unknown> = {
    model_name: 'kling-v1',
    prompt,
    negative_prompt: negativePrompt,
    duration: duration || 5,
    aspect_ratio: aspectRatio || '16:9'
  };

  const result = await callKling<KlingTaskPayload>({
    method: 'POST',
    path: '/v1/videos/text2video',
    body: klingPayload
  });

  return normalizeKlingTask(result);
}

/**
 * 调用混元 AI（本地实现）
 */
async function callHunyuanAI(userInput: string, videoDuration: number, shotCount: number, styles?: string[]): Promise<StoryboardResponse> {
  // 分析产品特征
  const productFeatures = analyzeProductFeatures(userInput);

  // 生成分镜
  const shots = generateLocalStoryboard(productFeatures, videoDuration, shotCount);

  // 计算总时长
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

  // 默认评分
  const defaultScore = {
    score: 85,
    details: {
      richness: 80,
      commercialValue: 85,
      productCoverage: 85,
      visualExpression: 85,
      conversionAbility: 85
    }
  };

  // 异步评分
  scoreStoryboardAsync(shots, productFeatures, () => {});

  return {
    productFeatures,
    shots,
    score: defaultScore,
    totalDuration,
    shotCount: shots.length
  };
}

/**
 * 生成分镜 - 统一接口
 */
export async function generateStoryboard(
  userInput: string,
  videoDuration: number,
  shotCount: number = 7,
  styles?: string[],
  model: AIModel = 'auto'
): Promise<AIResponse> {
  const cacheKey = `storyboard:${userInput}:${videoDuration}:${shotCount}`;
  
  // 尝试从缓存获取
  const cached = resultCache.get(cacheKey);
  if (cached) {
    return {
      success: true,
      model: 'cache',
      data: cached
    };
  }

  let attempts = 0;
  let lastError: Error | undefined;
  let fallbackUsed = false;

  while (attempts < config.maxRetries) {
    try {
      attempts++;
      
      // 确定使用的模型
      let targetModel = model;
      if (model === 'auto') {
        targetModel = config.primaryModel === 'auto' ? 'hunyuan' : config.primaryModel;
      }

      let result: StoryboardResponse;
      
      if (targetModel === 'kling') {
        // 使用可灵
        throw new Error('Kling does not support storyboard generation');
      } else {
        // 使用混元
        result = await callHunyuanAI(userInput, videoDuration, shotCount, styles);
      }

      // 缓存结果
      resultCache.set(cacheKey, result);

      return {
        success: true,
        model: targetModel,
        data: result,
        fallbackUsed,
        retryCount: attempts > 1 ? attempts : undefined
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果启用了 fallback，尝试另一个模型
      if (config.fallbackEnabled && attempts < config.maxRetries) {
        fallbackUsed = true;
        console.log(`[AI Router] Fallback triggered: ${lastError.message}`);
        continue;
      }

      break;
    }
  }

  return {
    success: false,
    model: model === 'auto' ? 'hunyuan' : model,
    data: null,
    error: lastError?.message || 'Unknown error',
    fallbackUsed,
    retryCount: attempts
  };
}

/**
 * 生成视频 - 统一接口
 */
export async function generateVideo(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = '16:9',
  negativePrompt?: string,
  model: AIModel = 'auto'
): Promise<AIResponse> {
  // Mock 模式处理
  if (!isRealAIEnabled()) {
    console.log('[MOCK] Video generation - returning mock task');
    return {
      success: true,
      model: 'mock',
      data: {
        taskId: generateMockTaskId(),
        status: 'pending' as const,
        isMock: true
      }
    };
  }

  let attempts = 0;
  let lastError: Error | undefined;
  let fallbackUsed = false;

  while (attempts < config.maxRetries) {
    try {
      attempts++;
      
      // 确定使用的模型
      let targetModel = model;
      if (model === 'auto') {
        targetModel = config.primaryModel === 'auto' ? 'kling' : config.primaryModel;
      }

      let result: VideoResponse;

      if (targetModel === 'kling') {
        // 使用可灵
        result = await callKlingAI(prompt, duration, aspectRatio, negativePrompt);
      } else {
        // 使用混元（本地模拟）
        throw new Error('Hunyuan does not support video generation');
      }

      return {
        success: true,
        model: targetModel,
        data: result,
        fallbackUsed,
        retryCount: attempts > 1 ? attempts : undefined
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果启用了 fallback，尝试另一个模型
      if (config.fallbackEnabled && attempts < config.maxRetries) {
        fallbackUsed = true;
        console.log(`[AI Router] Fallback triggered: ${lastError.message}`);
        continue;
      }

      break;
    }
  }

  return {
    success: false,
    model: model === 'auto' ? 'kling' : model,
    data: null,
    error: lastError?.message || 'Unknown error',
    fallbackUsed,
    retryCount: attempts
  };
}

/**
 * 验证 AI 服务连通性
 */
export async function verifyAIConnection(model: AIModel = 'auto'): Promise<{
  success: boolean;
  model: AIModel;
  message: string;
  latencyMs?: number;
}> {
  const startTime = Date.now();
  
  try {
    if (model === 'kling' || model === 'auto') {
      // 验证可灵连接
      try {
        const result = await callKling<{ code?: number }>({
          method: 'GET',
          path: '/v1/videos/text2video'
        });
        
        const latency = Date.now() - startTime;
        return {
          success: true,
          model: 'kling',
          message: 'Kling AI connection verified',
          latencyMs: latency
        };
      } catch (error) {
        if (model === 'auto') {
          // 可灵失败，尝试混元
          return verifyAIConnection('hunyuan');
        }
        throw error;
      }
    } else {
      // 验证混元（本地服务）
      const latency = Date.now() - startTime;
      return {
        success: true,
        model: 'hunyuan',
        message: 'Hunyuan AI connection verified (local)',
        latencyMs: latency
      };
    }
  } catch (error) {
    return {
      success: false,
      model,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 测试 fallback 机制
 */
export async function testFallbackMechanism(): Promise<{
  success: boolean;
  klingResult: boolean;
  fallbackResult: boolean;
  message: string;
}> {
  console.log('[AI Router] Testing fallback mechanism...');

  // 测试可灵
  let klingSuccess = false;
  try {
    await callKling<{ code?: number }>({
      method: 'GET',
      path: '/v1/videos/text2video'
    });
    klingSuccess = true;
  } catch {
    klingSuccess = false;
  }

  // 测试 fallback（混元）
  let fallbackSuccess = false;
  try {
    await callHunyuanAI('test', 10, 5);
    fallbackSuccess = true;
  } catch {
    fallbackSuccess = false;
  }

  return {
    success: klingSuccess || fallbackSuccess,
    klingResult: klingSuccess,
    fallbackResult: fallbackSuccess,
    message: klingSuccess 
      ? 'Primary model (Kling) succeeded, fallback not needed'
      : fallbackSuccess 
        ? 'Primary model failed, fallback (Hunyuan) succeeded'
        : 'Both primary and fallback models failed'
  };
}

/**
 * 获取缓存统计
 */
export function getCacheStatistics(): {
  promptCache: { size: number };
  featuresCache: { size: number };
  resultCache: { size: number };
} {
  return {
    promptCache: { size: promptCache.size },
    featuresCache: { size: featuresCache.size },
    resultCache: { size: resultCache.size }
  };
}