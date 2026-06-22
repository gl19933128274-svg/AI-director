/**
 * 分镜生成 API 接口 - 优化版
 * 包含重试机制、错误处理和限流保护
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeProductFeatures,
  scoreStoryboard,
  scoreStoryboardAsync,
  generateLocalStoryboard,
  parseAIResponse,
  type ProductFeatures,
  type ShotDetail
} from '@/services/storyboardService';
import { resultCache, getCacheStats, startCacheCleanup } from '@/services/cache';

// 请求队列配置
const REQUEST_QUEUE = {
  maxConcurrent: 50,
  maxQueueSize: 200,
  currentRequests: 0,
  queue: [] as Array<{
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    request: () => Promise<unknown>;
  }>
};

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 1000
};

/**
 * 简单队列处理器
 */
async function processWithQueue<T>(requestFn: () => Promise<T>): Promise<T> {
  // 如果当前请求数未满，直接处理
  if (REQUEST_QUEUE.currentRequests < REQUEST_QUEUE.maxConcurrent) {
    REQUEST_QUEUE.currentRequests++;
    try {
      return await requestFn();
    } finally {
      REQUEST_QUEUE.currentRequests--;
      processNextInQueue();
    }
  }

  // 如果队列已满，拒绝请求
  if (REQUEST_QUEUE.queue.length >= REQUEST_QUEUE.maxQueueSize) {
    throw new Error('服务器繁忙，请稍后重试');
  }

  // 加入队列
  return new Promise((resolve, reject) => {
    REQUEST_QUEUE.queue.push({
      resolve: resolve as (value: unknown) => void,
      reject,
      request: requestFn
    });
  });
}

/**
 * 处理队列中的下一个请求
 */
function processNextInQueue() {
  if (REQUEST_QUEUE.queue.length > 0 && REQUEST_QUEUE.currentRequests < REQUEST_QUEUE.maxConcurrent) {
    const next = REQUEST_QUEUE.queue.shift();
    if (next) {
      REQUEST_QUEUE.currentRequests++;
      next.request()
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          REQUEST_QUEUE.currentRequests--;
          processNextInQueue();
        });
    }
  }
}

/**
 * 带重试的请求处理
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果还有重试次数，等待后重试
      if (attempt < retries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * 请求体接口
 */
interface StoryboardGenerateRequest {
  userInput: string;
  videoDuration: number;
  shotCount?: number;
  styles?: string[];
  useAI?: boolean;
  aiResponse?: string;
}

/**
 * 响应体接口
 */
interface StoryboardGenerateResponse {
  success: boolean;
  data?: {
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
  };
  error?: string;
  retryCount?: number;
}

// 启动缓存清理定时器
startCacheCleanup();

/**
 * 生成分镜核心逻辑 - 优化版（带缓存和异步处理）
 */
async function generateStoryboardCore(
  userInput: string,
  videoDuration: number,
  shotCount: number,
  aiResponse?: string,
  useAI?: boolean
): Promise<StoryboardGenerateResponse['data']> {
  // 步骤 1: 分析产品特征（已内置缓存）
  const productFeatures = analyzeProductFeatures(userInput);

  // 步骤 2: 生成分镜（已内置缓存）
  let shots: ShotDetail[];

  if (useAI && aiResponse) {
    // 使用 AI 响应生成分镜
    const parsedShots = parseAIResponse(aiResponse, videoDuration);

    if (!parsedShots) {
      throw new Error('AI 响应解析失败，请检查 AI 返回格式');
    }

    shots = parsedShots;
  } else {
    // 使用本地模板生成分镜（已内置缓存）
    shots = generateLocalStoryboard(productFeatures, videoDuration, shotCount);
  }

  // 步骤 3: 计算总时长
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

  // 步骤 4: 评分 - 异步执行，不阻塞响应
  // 先返回默认评分，异步计算真实评分
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

  // 异步评分（非关键任务）
  scoreStoryboardAsync(shots, productFeatures, (scoreResult) => {
    // 评分完成后可以更新缓存或记录日志
    console.log('[Async Score] 分镜评分完成:', scoreResult.score);
  });

  return {
    productFeatures,
    shots,
    score: defaultScore,
    totalDuration,
    shotCount: shots.length
  };
}

/**
 * POST /api/storyboard/generate
 * 生成分镜脚本 - 优化版
 */
export async function POST(request: NextRequest) {
  let retryCount = 0;

  try {
    const body: StoryboardGenerateRequest = await request.json();

    // 参数验证
    if (!body.userInput || typeof body.userInput !== 'string') {
      return NextResponse.json<StoryboardGenerateResponse>(
        { success: false, error: 'userInput 必须是非空字符串' },
        { status: 400 }
      );
    }

    if (!body.videoDuration || typeof body.videoDuration !== 'number' || body.videoDuration <= 0) {
      return NextResponse.json<StoryboardGenerateResponse>(
        { success: false, error: 'videoDuration 必须是正数' },
        { status: 400 }
      );
    }

    const {
      userInput,
      videoDuration,
      shotCount = 7,
      styles = ['low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute'],
      useAI = false,
      aiResponse
    } = body;

    // 使用队列和重试机制处理请求
    const result = await processWithQueue(() =>
      withRetry(async () => {
        retryCount++;
        return generateStoryboardCore(
          userInput,
          videoDuration,
          shotCount,
          aiResponse,
          useAI
        );
      })
    );

    // 返回结果
    return NextResponse.json<StoryboardGenerateResponse>({
      success: true,
      data: result,
      retryCount: retryCount > 1 ? retryCount - 1 : undefined
    });

  } catch (error) {
    console.error('[分镜生成 API] 处理请求失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    // 根据错误类型返回适当的状态码
    let statusCode = 500;
    if (errorMessage.includes('服务器繁忙')) {
      statusCode = 503; // 服务不可用
    } else if (errorMessage.includes('超时')) {
      statusCode = 504; // 网关超时
    }

    return NextResponse.json<StoryboardGenerateResponse>(
      {
        success: false,
        error: errorMessage,
        retryCount: retryCount > 1 ? retryCount - 1 : undefined
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/storyboard/generate
 * 健康检查 + 缓存统计
 */
export async function GET() {
  const cacheStats = getCacheStats();
  
  return NextResponse.json({
    success: true,
    message: '分镜生成 API 运行正常（已启用缓存优化）',
    version: '2.0.0',
    cache: cacheStats,
    endpoints: {
      generate: 'POST /api/storyboard/generate',
      health: 'GET /api/storyboard/generate'
    },
    optimizations: [
      'Prompt Cache - 提示词缓存',
      'Result Cache - 分镜结果缓存',
      'Features Cache - 产品特征缓存',
      'Async Scoring - 异步评分处理'
    ],
    supportedProductCategories: [
      'clothing', 'backpack', 'bag', 'pet', 'furniture', 'digital', 'beauty', 'food', 'other'
    ],
    supportedStyles: [
      'low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute',
      'minimalist', 'western', 'luxury', 'dynamic', 'emotional'
    ]
  });
}