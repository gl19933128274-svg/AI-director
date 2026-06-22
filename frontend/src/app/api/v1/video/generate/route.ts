import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  generateRequestId,
  generateTraceId,
  logInfo,
  logError,
  logWarn,
  logTask,
  logAIInvocation,
  logOSS,
  recordRequest,
  recordAiCall,
  recordStatusCode
} from '@/services/logger';
import {
  recordCost,
  checkUserCostLimit,
  getCostConfig
} from '@/services/costControl';
import {
  isVideoGenerationEnabled,
  isUserInRelease,
  isKillSwitchActive,
  getReleaseStatus
} from '@/services/releaseControl';
import {
  checkRateLimit,
  checkTaskDeduplication,
  recordTaskDeduplication
} from '@/middleware/rateLimit';
import { authenticate } from '@/middleware/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const startTime = Date.now();
  
  try {
    const userId = await authenticate(request);
    
    logInfo(requestId, traceId, 'VIDEO_GENERATE_START', 'api-gateway', 'started', {
      userId,
      requestId,
      traceId
    }, {}, undefined, userId);

    const body = await request.json();
    const { prompt, image_url, duration = 4, style = 'cinematic' } = body;

    if (!prompt || !image_url) {
      logError(requestId, traceId, 'VIDEO_GENERATE_VALIDATION', 'api-gateway', 'VALIDATION_ERROR', 
        'Missing prompt or image_url', { prompt: !!prompt, image_url: !!image_url }, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'VALIDATION_ERROR');
      recordStatusCode(400);
      
      return NextResponse.json({
        success: false,
        code: 400,
        message: '缺少必要参数',
        error: {
          type: 'ValidationError',
          detail: 'prompt 和 image_url 都是必填项'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now()
        }
      }, { status: 400 });
    }

    logInfo(requestId, traceId, 'VIDEO_GENERATE_VALIDATION', 'api-gateway', 'success', {
      promptLength: prompt.length,
      imageUrlLength: image_url.length,
      duration,
      style
    }, {}, undefined, userId);

    if (isKillSwitchActive()) {
      logError(requestId, traceId, 'VIDEO_GENERATE_KILL_SWITCH', 'release-control', 'KILL_SWITCH', 
        'Kill switch is active', {}, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'KILL_SWITCH');
      recordStatusCode(503);
      
      return NextResponse.json({
        success: false,
        code: 503,
        message: '服务暂时不可用',
        error: {
          type: 'ServiceUnavailable',
          detail: '服务维护中，请稍后再试'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now()
        }
      }, { status: 503 });
    }

    if (!isVideoGenerationEnabled()) {
      logWarn(requestId, traceId, 'VIDEO_GENERATE_FEATURE_DISABLED', 'release-control', 
        'Video generation feature is disabled', {}, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'FEATURE_DISABLED');
      recordStatusCode(403);
      
      return NextResponse.json({
        success: false,
        code: 403,
        message: '功能未启用',
        error: {
          type: 'FeatureDisabled',
          detail: '视频生成功能当前未启用'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now()
        }
      }, { status: 403 });
    }

    if (!isUserInRelease(userId)) {
      logWarn(requestId, traceId, 'VIDEO_GENERATE_NOT_IN_RELEASE', 'release-control', 
        'User not in release group', { userId }, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'RELEASE_BLOCKED');
      recordStatusCode(403);
      
      return NextResponse.json({
        success: false,
        code: 403,
        message: '访问受限',
        error: {
          type: 'ReleaseBlocked',
          detail: '您当前不在可用用户范围内'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now()
        }
      }, { status: 403 });
    }

    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      logWarn(requestId, traceId, 'VIDEO_GENERATE_RATE_LIMIT', 'rate-limit', 
        'Rate limit exceeded', {
          userId,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'LIMIT_ERROR');
      recordStatusCode(429);
      
      return NextResponse.json({
        success: false,
        code: 429,
        message: '请求过于频繁',
        error: {
          type: 'RateLimitExceeded',
          detail: '每分钟最多调用3次视频生成接口'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now(),
          retry_after: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          reset_time: new Date(rateLimitResult.resetTime).toISOString()
        }
      }, { status: 429 });
    }

    const dedupResult = checkTaskDeduplication(userId, prompt, image_url);
    if (dedupResult.duplicate) {
      logWarn(requestId, traceId, 'VIDEO_GENERATE_DUPLICATE', 'deduplication', 
        'Duplicate request detected', {
          userId,
          existingStatus: dedupResult.existingStatus,
          existingTimestamp: dedupResult.existingTimestamp
        }, {}, undefined, userId);
      recordRequest(startTime, 'failed', 'DUPLICATE_REQUEST');
      recordStatusCode(409);
      
      return NextResponse.json({
        success: false,
        code: 409,
        message: '重复请求',
        error: {
          type: 'DuplicateRequest',
          detail: '相同的任务正在处理中，请勿重复提交'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now()
        }
      }, { status: 409 });
    }

    const costLimitCheck = checkUserCostLimit(userId);
    if (!costLimitCheck.withinLimit) {
      logWarn(requestId, traceId, 'VIDEO_GENERATE_COST_LIMIT', 'cost-control', 
        'Cost limit exceeded', {
          userId,
          dailyCost: costLimitCheck.dailyCost,
          dailyLimit: costLimitCheck.dailyLimit,
          shouldFallback: costLimitCheck.shouldFallback
        }, {}, undefined, userId);
      
      if (costLimitCheck.shouldFallback) {
        const mockResult = await handleMockGeneration(requestId, traceId, userId, prompt, image_url);
        recordRequest(startTime, 'success');
        return mockResult;
      }
      
      recordRequest(startTime, 'failed', 'LIMIT_ERROR');
      recordStatusCode(403);
      
      return NextResponse.json({
        success: false,
        code: 403,
        message: '配额不足',
        error: {
          type: 'CostLimitExceeded',
          detail: '今日生成配额已用完，请明日再试'
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now(),
          daily_cost: costLimitCheck.dailyCost,
          daily_limit: costLimitCheck.dailyLimit
        }
      }, { status: 403 });
    }

    recordTaskDeduplication(userId, prompt, 'processing', image_url);

    const taskId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logInfo(requestId, traceId, 'VIDEO_GENERATE_TASK_CREATE', 'task-service', 'processing', {
      taskId,
      userId,
      promptLength: prompt.length,
      imageUrlLength: image_url.length,
      duration,
      style
    }, {}, taskId, userId);

    const task = await prisma.task.create({
      data: {
        taskId,
        userId,
        type: 'video',
        status: 'pending',
        prompt,
        imageUrl: image_url,
        estimatedCost: 0.12,
        requestId,
        traceId
      }
    });

    logTask(requestId, traceId, taskId, 'created', 'Task created successfully', userId);

    logInfo(requestId, traceId, 'VIDEO_GENERATE_AI_CALL', 'ai-service', 'processing', {
      taskId,
      model: 'volcengine',
      duration,
      style
    }, {}, taskId, userId);

    const aiResult = await callVolcengineAI(requestId, traceId, taskId, userId, prompt, image_url, duration);
    
    if (aiResult.success) {
      logAIInvocation(requestId, traceId, 'doubao-seedance-1-5-pro-251215', 
        prompt, image_url, aiResult.video_url, aiResult.latency, undefined, userId, taskId);
      
      logOSS(requestId, traceId, aiResult.video_url, 'success', undefined, 
        ensureVideoUrlAccessible(aiResult.video_url), taskId, userId);

      await prisma.task.update({
        where: { taskId },
        data: {
          status: 'completed',
          videoUrl: aiResult.video_url,
          cost: aiResult.cost,
          estimatedCost: aiResult.cost,
          outputDuration: duration,
          modelId: 'doubao-seedance-1-5-pro-251215',
          completedAt: new Date()
        }
      });

      recordCost(userId, requestId, 'doubao-seedance-1-5-pro-251215', 
        prompt.length, image_url.length, duration, aiResult.cost, 'success', taskId);

      logTask(requestId, traceId, taskId, 'success', 'Video generation completed', userId);

      recordRequest(startTime, 'success');
      recordAiCall(true);
      recordStatusCode(200);

      const latency = Date.now() - startTime;
      logInfo(requestId, traceId, 'VIDEO_GENERATE_SUCCESS', 'api-gateway', 'success', {
        taskId,
        videoUrlLength: aiResult.video_url.length,
        cost: aiResult.cost,
        latency
      }, {
        videoUrl: aiResult.video_url,
        cost: aiResult.cost
      }, taskId, userId, latency);

      return NextResponse.json({
        success: true,
        data: {
          task_id: taskId,
          video_url: ensureVideoUrlAccessible(aiResult.video_url),
          status: 'completed',
          cost: aiResult.cost,
          estimated_cost: aiResult.cost
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now(),
          latency
        }
      }, { status: 200 });
    } else {
      logAIInvocation(requestId, traceId, 'doubao-seedance-1-5-pro-251215', 
        prompt, image_url, undefined, aiResult.latency, aiResult.errorCode, userId, taskId);

      await prisma.task.update({
        where: { taskId },
        data: {
          status: 'failed',
          error: aiResult.errorMessage,
          completedAt: new Date()
        }
      });

      recordCost(userId, requestId, 'doubao-seedance-1-5-pro-251215', 
        prompt.length, image_url.length, duration, 0, 'failed', taskId);

      logTask(requestId, traceId, taskId, 'failed', aiResult.errorMessage, userId);

      recordRequest(startTime, 'failed', 'AI_ERROR');
      recordAiCall(false);
      recordStatusCode(500);

      const latency = Date.now() - startTime;
      logError(requestId, traceId, 'VIDEO_GENERATE_FAILED', 'ai-service', 'AI_ERROR', 
        aiResult.errorMessage, { taskId }, {}, taskId, userId, undefined, latency);

      return NextResponse.json({
        success: false,
        code: 500,
        message: '视频生成失败',
        error: {
          type: 'GenerationFailed',
          detail: aiResult.errorMessage,
          task_id: taskId
        },
        meta: {
          request_id: requestId,
          trace_id: traceId,
          user_id: userId,
          timestamp: Date.now(),
          latency
        }
      }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const latency = Date.now() - startTime;
    
    logError(requestId, traceId, 'VIDEO_GENERATE_EXCEPTION', 'api-gateway', 'EXCEPTION', 
      errorMessage, {}, {}, undefined, undefined, error instanceof Error ? error.stack : undefined, latency);
    
    recordRequest(startTime, 'failed', 'SERVER_ERROR');
    recordStatusCode(500);

    return NextResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      error: {
        type: 'ServerError',
        detail: errorMessage
      },
      meta: {
        request_id: requestId,
        trace_id: traceId,
        timestamp: Date.now(),
        latency
      }
    }, { status: 500 });
  }
}

async function callVolcengineAI(
  requestId: string,
  traceId: string,
  taskId: string,
  userId: string,
  prompt: string,
  imageUrl: string,
  duration: number
): Promise<{ success: boolean; video_url?: string; cost: number; latency: number; errorMessage?: string; errorCode?: string }> {
  const apiKey = process.env.VOLC_API_KEY;
  const baseUrl = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

  if (!apiKey || apiKey.startsWith('your-')) {
    return { success: false, cost: 0, latency: 0, errorMessage: 'API key not configured', errorCode: 'API_KEY_MISSING' };
  }

  const startTime = Date.now();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const body = {
      model: 'doubao-seedance-1-5-pro-251215',
      input: {
        image_url: imageUrl,
        prompt: prompt,
        duration: duration
      }
    };

    const response = await fetch(`${baseUrl}/contents/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const responseBody = await response.json();

    if (response.status !== 200) {
      const errorCode = responseBody.error?.code || 'UNKNOWN';
      const errorMessage = responseBody.error?.message || `HTTP error ${response.status}`;
      return { 
        success: false, 
        cost: 0, 
        latency: Date.now() - startTime, 
        errorMessage, 
        errorCode 
      };
    }

    const taskResult = responseBody.data || responseBody;
    
    let videoUrl = '';
    let pollingAttempts = 0;
    const maxPollingAttempts = 20;

    while (pollingAttempts < maxPollingAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      pollingAttempts++;

      const statusResponse = await fetch(`${baseUrl}/contents/generations/tasks/${taskResult.task_id}`, {
        headers
      });

      const statusBody = await statusResponse.json();
      const status = statusBody.status?.toLowerCase();

      if (status === 'succeeded') {
        videoUrl = statusBody.content?.video_url || statusBody.video_url || '';
        break;
      } else if (status === 'failed') {
        return { 
          success: false, 
          cost: 0, 
          latency: Date.now() - startTime, 
          errorMessage: statusBody.error?.message || 'Generation failed',
          errorCode: 'GENERATION_FAILED'
        };
      }
    }

    if (!videoUrl) {
      return { 
        success: false, 
        cost: 0, 
        latency: Date.now() - startTime, 
        errorMessage: 'Polling timeout',
        errorCode: 'POLL_TIMEOUT'
      };
    }

    return {
      success: true,
      video_url: videoUrl,
      cost: 0.12,
      latency: Date.now() - startTime
    };

  } catch (error) {
    return { 
      success: false, 
      cost: 0, 
      latency: Date.now() - startTime, 
      errorMessage: error instanceof Error ? error.message : 'Network error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

async function handleMockGeneration(
  requestId: string,
  traceId: string,
  userId: string,
  prompt: string,
  image_url: string
): Promise<NextResponse> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const taskId = `video-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mockVideoUrl = `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=video%20mock%20${taskId}&image_size=landscape_16_9`;

  logWarn(requestId, traceId, 'VIDEO_GENERATE_MOCK', 'cost-control', 
    'Using mock fallback due to cost limit', { userId, taskId }, {}, taskId, userId);

  return NextResponse.json({
    success: true,
    data: {
      task_id: taskId,
      video_url: mockVideoUrl,
      status: 'completed',
      cost: 0,
      estimated_cost: 0,
      is_mock: true
    },
    meta: {
      request_id: requestId,
      trace_id: traceId,
      user_id: userId,
      timestamp: Date.now()
    }
  }, { status: 200 });
}

function ensureVideoUrlAccessible(url: string): string {
  if (!url) return '';
  
  if (url.startsWith('https://ark-content-generation') || 
      url.startsWith('https://ark-project.tos-cn-beijing') ||
      url.includes('volces.com') || 
      url.includes('tos-cn-beijing')) {
    return `/api/video-proxy?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}