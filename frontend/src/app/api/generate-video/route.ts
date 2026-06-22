import { NextRequest } from 'next/server';
import { generateVideo, checkVideoStatus, VideoGenerationInput, VideoGenerationOutput } from '@/services/ai-video.service';
import { generateRequestId, logInfo, logError, logWarn, logTask } from '@/services/logger';
import { successResponse, errorResponse, validationError, rateLimitError, serverError, generationFailedError } from '@/services/apiResponse';
import { validateVideoGeneration } from '@/utils/validation';
import { releaseConfig } from '@/config/release';
import { shouldUseMock, getCurrentMode } from '@/config/environment';
import { rateLimitMiddleware, taskDeduplicationMiddleware, recordTaskDeduplication } from '@/middleware/rateLimit';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  logInfo(requestId, 'API_REQUEST_START', 'api-router', 'started', {
    method: 'POST',
    path: '/api/generate-video',
    timestamp: new Date().toISOString()
  });
  
  try {
    const rateLimitResult = rateLimitMiddleware(request);
    if (rateLimitResult) {
      logWarn(requestId, 'API_RATE_LIMIT', 'api-router', 
        'Rate limit exceeded', {
          status: 429
        }, {}, requestId);
      
      return new Response(
        JSON.stringify(rateLimitError('api-router', requestId)),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    let body: VideoGenerationInput;
    try {
      body = await request.json() as VideoGenerationInput;
    } catch (parseError) {
      logError(requestId, 'API_BODY_PARSE', 'api-router', 'VALIDATION_ERROR', 
        'Failed to parse request body', {
          error: parseError instanceof Error ? parseError.message : 'Unknown'
        }, {}, requestId);
      
      return new Response(
        JSON.stringify(validationError('api-router', requestId, 'Invalid JSON body')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    logInfo(requestId, 'API_REQUEST_BODY', 'api-router', 'processing', {
      imageLength: body.image.length,
      imagePreview: body.image.substring(0, 100),
      promptLength: body.prompt.length,
      promptPreview: body.prompt.substring(0, 100),
      duration: body.duration || 4,
      style: body.style || 'cinematic'
    }, {}, requestId);
    
    const dedupResult = taskDeduplicationMiddleware(request, body);
    if (dedupResult) {
      logWarn(requestId, 'API_DUPLICATE', 'api-router', 
        'Duplicate task detected', {
          status: 409
        }, {}, requestId);
      
      return new Response(
        JSON.stringify(errorResponse('DUPLICATE_TASK', 'Duplicate task', 'api-router', requestId)),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const validation = validateVideoGeneration(body);
    if (!validation.valid) {
      const errorMsg = validation.errors.join('; ');
      logError(requestId, 'API_VALIDATION', 'api-router', 'VALIDATION_ERROR', 
        `Validation failed: ${errorMsg}`, {
          errors: validation.errors
        }, {}, requestId);
      
      return new Response(
        JSON.stringify(validationError('api-router', requestId, errorMsg)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.image) {
      logError(requestId, 'API_VALIDATION', 'api-router', 'VALIDATION_ERROR', 
        'Image URL is empty', {}, {}, requestId);
      
      return new Response(
        JSON.stringify(validationError('api-router', requestId, 'Image URL is required')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body.prompt) {
      logError(requestId, 'API_VALIDATION', 'api-router', 'VALIDATION_ERROR', 
        'Prompt is empty', {}, {}, requestId);
      
      return new Response(
        JSON.stringify(validationError('api-router', requestId, 'Prompt is required')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    recordTaskDeduplication(
      request.headers.get('x-forwarded-for') || 'unknown',
      body.prompt,
      'processing',
      body.image
    );

    const currentMode = getCurrentMode();
    const useMock = shouldUseMock();
    
    logInfo(requestId, 'API_ENVIRONMENT', 'api-router', 'processing', {
      mode: currentMode,
      useMock
    }, {}, requestId);
    
    logTask(requestId, requestId, 'processing');
    
    logInfo(requestId, 'API_START_GENERATION', 'api-router', 'processing', {
      image: body.image.substring(0, 100),
      promptLength: body.prompt.length,
      duration: body.duration || 4,
      style: body.style || 'cinematic'
    }, {}, requestId);
    
    const result = await generateVideo({
      image: body.image,
      prompt: body.prompt,
      duration: body.duration || 4,
      style: body.style || 'cinematic'
    }, 'auto', requestId);

    if (result.status === 'success') {
      logInfo(requestId, 'API_GENERATION_SUCCESS', 'api-router', 'success', {
        taskId: result.task_id,
        videoUrlLength: result.video_url.length,
        model: result.model,
        costEstimate: result.cost_estimate,
        isMock: result.isMock || useMock
      }, {
        task_id: result.task_id,
        video_url: result.video_url.substring(0, 100)
      }, requestId);
      
      logTask(requestId, result.task_id || requestId, 'success');
      
      return new Response(
        JSON.stringify(successResponse({
          ...result,
          mode: currentMode,
          is_mock: result.isMock || useMock
        }, requestId)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (result.status === 'processing') {
      logInfo(requestId, 'API_GENERATION_PROCESSING', 'api-router', 'processing', {
        taskId: result.task_id,
        status: 'processing'
      }, {}, requestId);
      
      logTask(requestId, result.task_id || requestId, 'processing');
      
      return new Response(
        JSON.stringify(successResponse(result, requestId)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      logError(requestId, 'API_GENERATION_FAILED', 'api-router', 'GENERATION_FAILED', 
        result.error_message || 'Video generation failed', {
          taskId: result.task_id,
          error: result.error_message
        }, {}, requestId);
      
      logTask(requestId, result.task_id || requestId, 'failed', result.error_message);
      
      return new Response(
        JSON.stringify(generationFailedError('api-router', requestId, result.task_id || requestId, result.error_message)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(requestId, 'API_EXCEPTION', 'api-router', 'EXCEPTION', 
      `Exception: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined
      }, {}, requestId, error instanceof Error ? error.stack : undefined);
    
    if (errorMessage.includes('throttled') || errorMessage.includes('rate limit')) {
      logWarn(requestId, 'API_RATE_LIMIT_FALLBACK', 'api-router', 
        'Rate limit hit, falling back to mock', {}, {}, requestId);
      
      const mockResult: VideoGenerationOutput = {
        video_url: `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=video%20mock%20${Date.now()}&image_size=landscape_16_9`,
        status: 'success',
        model: 'mock',
        cost_estimate: 0,
        task_id: `mock-${Date.now()}`,
        isMock: true
      };
      
      logInfo(requestId, 'API_MOCK_FALLBACK', 'api-router', 'success', {
        isMock: true
      }, mockResult, requestId);
      
      return new Response(
        JSON.stringify(successResponse({ ...mockResult, mode: 'mock' }, requestId)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(serverError('api-router', requestId, undefined, errorMessage)),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  
  logInfo(requestId, 'API_STATUS_CHECK_START', 'api-router', 'started', {
    method: 'GET',
    path: '/api/generate-video',
    timestamp: new Date().toISOString()
  });
  
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      logError(requestId, 'API_STATUS_CHECK', 'api-router', 'VALIDATION_ERROR', 
        'taskId is required', {}, {}, requestId);
      
      return new Response(
        JSON.stringify(validationError('api-router', requestId, 'taskId is required')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logInfo(requestId, 'API_STATUS_CHECK', 'api-router', 'processing', {
      taskId
    }, {}, requestId);
    
    const result = await checkVideoStatus(taskId, requestId);
    
    if (result.status === 'success') {
      logInfo(requestId, 'API_STATUS_CHECK_SUCCESS', 'api-router', 'success', {
        taskId: result.task_id,
        videoUrlLength: result.video_url.length
      }, {}, requestId);
      
      return new Response(
        JSON.stringify(successResponse(result, requestId)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      logError(requestId, 'API_STATUS_CHECK_FAILED', 'api-router', 'STATUS_FAILED', 
        result.error_message || 'Status check failed', {
          taskId: result.task_id
        }, {}, requestId);
      
      return new Response(
        JSON.stringify(generationFailedError('api-router', requestId, taskId, result.error_message)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(requestId, 'API_STATUS_CHECK_EXCEPTION', 'api-router', 'EXCEPTION', 
      `Exception: ${errorMessage}`, {}, {}, requestId, error instanceof Error ? error.stack : undefined);
    
    return new Response(
      JSON.stringify(serverError('api-router', requestId, undefined, errorMessage)),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}