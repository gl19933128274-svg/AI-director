/**
 * API 响应工具 - 统一错误返回格式
 */

export interface ApiError {
  code: string;
  message: string;
  step: string;
  request_id: string;
  task_id?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  request_id: string;
  timestamp: string;
}

export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  API_ERROR: 'API_ERROR',
  GENERATION_FAILED: 'GENERATION_FAILED',
  POLL_TIMEOUT: 'POLL_TIMEOUT',
  TOKEN_MISSING: 'TOKEN_MISSING',
  NO_ADAPTER: 'NO_ADAPTER',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  VIDEO_PLAY_ERROR: 'VIDEO_PLAY_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export function successResponse<T = any>(
  data: T,
  requestId: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

export function errorResponse(
  code: string,
  message: string,
  step: string,
  requestId: string,
  taskId?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      step,
      request_id: requestId,
      task_id: taskId
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

export function authError(
  step: string,
  requestId: string,
  taskId?: string,
  message?: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.AUTH_FAILED,
    message || 'Authentication failed',
    step,
    requestId,
    taskId
  );
}

export function rateLimitError(
  step: string,
  requestId: string,
  taskId?: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.RATE_LIMIT,
    'Rate limit exceeded',
    step,
    requestId,
    taskId
  );
}

export function serverError(
  step: string,
  requestId: string,
  taskId?: string,
  message?: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.SERVER_ERROR,
    message || 'Server error',
    step,
    requestId,
    taskId
  );
}

export function validationError(
  step: string,
  requestId: string,
  message: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    message,
    step,
    requestId
  );
}

export function generationFailedError(
  step: string,
  requestId: string,
  taskId: string,
  message?: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.GENERATION_FAILED,
    message || 'Video generation failed',
    step,
    requestId,
    taskId
  );
}

export function timeoutError(
  step: string,
  requestId: string,
  taskId?: string
): ApiResponse {
  return errorResponse(
    ErrorCodes.TIMEOUT,
    'Request timeout',
    step,
    requestId,
    taskId
  );
}