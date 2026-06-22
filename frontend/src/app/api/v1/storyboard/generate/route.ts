import { NextRequest } from 'next/server';
import { storyboardService, StoryboardRequest } from '@/modules/storyboard/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest, ERROR_CODES, logStep } from '@/utils/apiResponse';
import { validateStoryboardGeneration } from '@/utils/validation';

export async function POST(request: NextRequest) {
  const { request_id: requestId, trace_id: traceId } = logRequest('POST', '/api/v1/storyboard/generate');
  
  try {
    logStep(requestId, traceId, 'storyboard_generation', 'start');
    
    const userId = await authenticate(request);
    const body = await request.json() as Partial<StoryboardRequest>;
    
    console.log('[Storyboard] Request received:', JSON.stringify(body));

    const validation = validateStoryboardGeneration(body);
    if (!validation.valid) {
      const errorMsg = validation.errors.join('; ');
      logStep(requestId, traceId, 'storyboard_generation', 'error', undefined, `参数校验失败: ${errorMsg}`);
      return createErrorResponse(new Error(errorMsg), ERROR_CODES.PARAM_ERROR, { 
        request_id: requestId, 
        trace_id: traceId,
        user_id: userId,
        step: 'validation',
      });
    }

    if (!body.prompt) {
      logStep(requestId, traceId, 'storyboard_generation', 'error', undefined, '提示词为空');
      return createErrorResponse(new Error('提示词不能为空'), ERROR_CODES.PARAM_ERROR, { 
        request_id: requestId, 
        trace_id: traceId,
        user_id: userId,
        step: 'validation',
      });
    }

    const requestWithDefaults: StoryboardRequest = {
      prompt: body.prompt,
      sceneConfig: body.sceneConfig || {
        setting: '室内',
        timeOfDay: '中午',
        mood: '平和',
      },
      shotCount: body.shotCount || 5,
      targetDuration: body.targetDuration || 30,
      style: body.style || 'cinematic',
      quality: body.quality || 'medium',
    };

    console.log('[Storyboard] Request with defaults:', JSON.stringify(requestWithDefaults));

    logStep(requestId, traceId, 'storyboard_generation', 'start', undefined, '调用AI模型生成');
    
    const result = await storyboardService.generate(requestWithDefaults);
    console.log('[Storyboard] Generated successfully:', result.id);
    
    logStep(requestId, traceId, 'storyboard_generation', 'success', result.id);
    
    return createResponse(result, true, 200, '分镜生成成功', { 
      request_id: requestId, 
      trace_id: traceId,
      user_id: userId,
      task_id: result.id,
      step: 'storyboard_generation',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Storyboard] Generate error:', error);
    console.error('[Storyboard] Error stack:', (error as Error).stack);
    logStep(requestId, traceId, 'storyboard_generation', 'error', undefined, errorMessage);
    
    return createErrorResponse(error as Error, ERROR_CODES.MODEL_ERROR, { 
      request_id: requestId,
      trace_id: traceId,
      step: 'storyboard_generation',
    });
  }
}