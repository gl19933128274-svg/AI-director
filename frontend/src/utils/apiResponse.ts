import { NextResponse } from 'next/server';

export const ERROR_CODES = {
  PARAM_ERROR: 1001,
  AUTH_ERROR: 2001,
  MODEL_ERROR: 3001,
  STORAGE_ERROR: 4001,
  RATE_LIMIT_ERROR: 4002,
  TIMEOUT_ERROR: 4003,
  SERVER_ERROR: 5000,
};

export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.PARAM_ERROR]: '参数错误',
  [ERROR_CODES.AUTH_ERROR]: '鉴权失败',
  [ERROR_CODES.MODEL_ERROR]: '模型错误',
  [ERROR_CODES.STORAGE_ERROR]: '存储错误',
  [ERROR_CODES.RATE_LIMIT_ERROR]: '请求限流',
  [ERROR_CODES.TIMEOUT_ERROR]: '请求超时',
  [ERROR_CODES.SERVER_ERROR]: '服务器内部错误',
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  meta: {
    timestamp: number;
    request_id: string;
    trace_id: string;
    user_id?: string;
    task_id?: string;
    step?: string;
  };
  error?: {
    type: string;
    field?: string;
    detail: string;
    stack?: string;
  };
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createResponse<T = unknown>(
  data: T,
  success: boolean = true,
  code: number = 200,
  message: string = '操作成功',
  meta?: Partial<ApiResponse['meta']>
): NextResponse<ApiResponse<T>> {
  const requestId = meta?.request_id || generateRequestId();
  const traceId = meta?.trace_id || generateTraceId();
  
  console.log(`[API] Response: code=${code}, request_id=${requestId}, trace_id=${traceId}, user_id=${meta?.user_id}, task_id=${meta?.task_id}, step=${meta?.step}`);

  return NextResponse.json({
    success,
    code,
    message,
    data,
    meta: {
      timestamp: Date.now(),
      request_id: requestId,
      trace_id: traceId,
      user_id: meta?.user_id,
      task_id: meta?.task_id,
      step: meta?.step,
    },
  }, { status: code });
}

export function createErrorResponse(
  error: Error,
  code: number = ERROR_CODES.SERVER_ERROR,
  meta?: Partial<ApiResponse['meta']>
): NextResponse<ApiResponse<null>> {
  const requestId = meta?.request_id || generateRequestId();
  const traceId = meta?.trace_id || generateTraceId();
  
  const errorType = error.name || 'ServerError';
  const errorField = (error as any).field;
  const errorCode = (error as any).code || code;
  const step = meta?.step || 'unknown';

  console.error(`[API] Error: code=${errorCode}, type=${errorType}, request_id=${requestId}, trace_id=${traceId}, user_id=${meta?.user_id}, task_id=${meta?.task_id}, step=${step}`);
  console.error(`[API] Error Detail: ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(`[API] Error Stack: ${error.stack}`);
  }

  return NextResponse.json({
    success: false,
    code: errorCode,
    message: error.message || ERROR_MESSAGES[errorCode] || '服务器内部错误',
    data: null,
    meta: {
      timestamp: Date.now(),
      request_id: requestId,
      trace_id: traceId,
      user_id: meta?.user_id,
      task_id: meta?.task_id,
      step,
    },
    error: {
      type: errorType,
      field: errorField,
      detail: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  }, { status: errorCode >= 500 ? 500 : errorCode });
}

export function logRequest(
  method: string,
  path: string,
  userId?: string,
  taskId?: string,
  requestId?: string,
  traceId?: string,
  step?: string
): { request_id: string; trace_id: string } {
  const reqId = requestId || generateRequestId();
  const trcId = traceId || generateTraceId();
  console.log(`[API] Request: ${method} ${path}, request_id=${reqId}, trace_id=${trcId}, user_id=${userId}, task_id=${taskId}, step=${step}`);
  return { request_id: reqId, trace_id: trcId };
}

export function logStep(requestId: string, traceId: string, step: string, status: 'start' | 'success' | 'error', taskId?: string, message?: string): void {
  const statusColor = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
  console.log(`${statusColor} [Step] request_id=${requestId}, trace_id=${traceId}, step=${step}, status=${status}, task_id=${taskId}, message=${message}`);
}