/**
 * 统一日志与链路追踪系统 - SaaS级产品化版本
 * 
 * 功能：
 * 1. 全局 request_id / trace_id / user_id 生成与管理
 * 2. 标准化日志结构
 * 3. 全链路追踪
 * 4. 调试模式支持
 * 5. 日志导出功能
 * 6. 指标收集与监控
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StandardLog {
  request_id: string;
  trace_id: string;
  user_id?: string;
  step: string;
  service: string;
  status: 'started' | 'processing' | 'success' | 'failed' | 'warning';
  latency: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
  level: LogLevel;
  task_id?: string;
}

export interface AIInvocationLog {
  request_id: string;
  trace_id: string;
  user_id?: string;
  task_id?: string;
  model_id: string;
  prompt: string;
  image_url?: string;
  response?: string;
  latency: number;
  error_code?: string;
  timestamp: string;
}

export interface OSSLog {
  request_id: string;
  trace_id: string;
  user_id?: string;
  task_id?: string;
  original_url: string;
  signed_url?: string;
  proxy_url?: string;
  access_result: 'success' | 'failed' | 'pending';
  timestamp: string;
}

export interface TaskLog {
  request_id: string;
  trace_id: string;
  user_id?: string;
  task_id: string;
  status: 'created' | 'processing' | 'success' | 'failed';
  message?: string;
  timestamp: string;
}

export interface UserActionLog {
  request_id: string;
  trace_id: string;
  user_id?: string;
  action: string;
  page: string;
  params?: Record<string, unknown>;
  timestamp: string;
}

const MAX_LOG_BUFFER = 500;
const logs: StandardLog[] = [];
const aiLogs: AIInvocationLog[] = [];
const ossLogs: OSSLog[] = [];
const taskLogs: TaskLog[] = [];
const actionLogs: UserActionLog[] = [];

let devMode = false;

interface RequestMetrics {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalLatency: number;
  aiCalls: number;
  aiSuccessCalls: number;
  aiFailedCalls: number;
  errorCounts: Record<string, number>;
  statusCodeCounts: Record<number, number>;
  responseTimes: number[];
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  aiCalls: 0,
  aiSuccessCalls: 0,
  aiFailedCalls: 0,
  errorCounts: {
    AI_ERROR: 0,
    AUTH_ERROR: 0,
    STORAGE_ERROR: 0,
    LIMIT_ERROR: 0,
    VALIDATION_ERROR: 0,
    TIMEOUT_ERROR: 0,
    SERVER_ERROR: 0,
    UNKNOWN_ERROR: 0
  },
  statusCodeCounts: {},
  responseTimes: []
};

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random}`;
}

export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 12);
  return `trace-${timestamp}-${random}`;
}

export function setDevMode(enabled: boolean): void {
  devMode = enabled;
  console.log(`[Logger] Dev mode ${enabled ? 'enabled' : 'disabled'}`);
}

export function isDevMode(): boolean {
  return devMode;
}

function log(level: LogLevel, logEntry: StandardLog): void {
  logs.push(logEntry);
  if (logs.length > MAX_LOG_BUFFER) {
    logs.shift();
  }

  if (devMode || level === 'ERROR' || level === 'WARN') {
    console.log(`[${level}] [${logEntry.trace_id}] [${logEntry.request_id}] [${logEntry.service}] [${logEntry.step}] ${logEntry.status} (${logEntry.latency}ms)`, {
      input: logEntry.input,
      output: logEntry.output,
      error: logEntry.error,
      task_id: logEntry.task_id,
      user_id: logEntry.user_id
    });
  }
}

export function logInfo(
  requestId: string,
  traceId: string,
  step: string,
  service: string,
  status: StandardLog['status'],
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  taskId?: string,
  userId?: string,
  latency = 0
): void {
  const entry: StandardLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    step,
    service,
    status,
    latency,
    input,
    output,
    timestamp: new Date().toISOString(),
    level: 'INFO',
    task_id: taskId
  };
  log('INFO', entry);
}

export function logError(
  requestId: string,
  traceId: string,
  step: string,
  service: string,
  errorCode: string,
  errorMessage: string,
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  taskId?: string,
  userId?: string,
  stack?: string,
  latency = 0
): void {
  const entry: StandardLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    step,
    service,
    status: 'failed',
    latency,
    input,
    output,
    error: {
      code: errorCode,
      message: errorMessage,
      stack
    },
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    task_id: taskId
  };
  log('ERROR', entry);
}

export function logWarn(
  requestId: string,
  traceId: string,
  step: string,
  service: string,
  message: string,
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  taskId?: string,
  userId?: string,
  latency = 0
): void {
  const entry: StandardLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    step,
    service,
    status: 'warning',
    latency,
    input,
    output,
    timestamp: new Date().toISOString(),
    level: 'WARN',
    task_id: taskId
  };
  log('WARN', entry);
}

export function logDebug(
  requestId: string,
  traceId: string,
  step: string,
  service: string,
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  taskId?: string,
  userId?: string,
  latency = 0
): void {
  if (!devMode) return;
  
  const entry: StandardLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    step,
    service,
    status: 'processing',
    latency,
    input,
    output,
    timestamp: new Date().toISOString(),
    level: 'DEBUG',
    task_id: taskId
  };
  logs.push(entry);
}

export function logAIInvocation(
  requestId: string,
  traceId: string,
  modelId: string,
  prompt: string,
  imageUrl: string,
  response?: string,
  latency = 0,
  errorCode?: string,
  userId?: string,
  taskId?: string
): void {
  const entry: AIInvocationLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    task_id: taskId,
    model_id: modelId,
    prompt: prompt.substring(0, 200),
    image_url: imageUrl,
    response: response ? response.substring(0, 200) : undefined,
    latency,
    error_code: errorCode,
    timestamp: new Date().toISOString()
  };
  
  aiLogs.push(entry);
  if (aiLogs.length > MAX_LOG_BUFFER) {
    aiLogs.shift();
  }
}

export function logOSS(
  requestId: string,
  traceId: string,
  originalUrl: string,
  accessResult: 'success' | 'failed' | 'pending',
  signedUrl?: string,
  proxyUrl?: string,
  taskId?: string,
  userId?: string
): void {
  const entry: OSSLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    task_id: taskId,
    original_url: originalUrl,
    signed_url: signedUrl,
    proxy_url: proxyUrl,
    access_result: accessResult,
    timestamp: new Date().toISOString()
  };
  
  ossLogs.push(entry);
  if (ossLogs.length > MAX_LOG_BUFFER) {
    ossLogs.shift();
  }
}

export function logTask(
  requestId: string,
  traceId: string,
  taskId: string,
  status: 'created' | 'processing' | 'success' | 'failed',
  message?: string,
  userId?: string
): void {
  const entry: TaskLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    task_id: taskId,
    status,
    message,
    timestamp: new Date().toISOString()
  };
  
  taskLogs.push(entry);
  if (taskLogs.length > MAX_LOG_BUFFER) {
    taskLogs.shift();
  }
}

export function logUserAction(
  requestId: string,
  traceId: string,
  action: string,
  page: string,
  params?: Record<string, unknown>,
  userId?: string
): void {
  const entry: UserActionLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    action,
    page,
    params,
    timestamp: new Date().toISOString()
  };
  
  actionLogs.push(entry);
  if (actionLogs.length > MAX_LOG_BUFFER) {
    actionLogs.shift();
  }
}

export function recordRequest(startTime: number, status: 'success' | 'failed', errorCode?: string): void {
  metrics.totalRequests += 1;
  const latency = Date.now() - startTime;
  metrics.totalLatency += latency;
  
  if (metrics.responseTimes.length > 100) {
    metrics.responseTimes.shift();
  }
  metrics.responseTimes.push(latency);

  if (status === 'success') {
    metrics.successRequests += 1;
  } else {
    metrics.failedRequests += 1;
    
    let errorType = 'UNKNOWN_ERROR';
    if (errorCode?.includes('AI')) errorType = 'AI_ERROR';
    else if (errorCode?.includes('AUTH')) errorType = 'AUTH_ERROR';
    else if (errorCode?.includes('STORAGE')) errorType = 'STORAGE_ERROR';
    else if (errorCode?.includes('LIMIT')) errorType = 'LIMIT_ERROR';
    else if (errorCode?.includes('VALIDATION')) errorType = 'VALIDATION_ERROR';
    else if (errorCode?.includes('TIMEOUT')) errorType = 'TIMEOUT_ERROR';
    else if (errorCode?.includes('SERVER')) errorType = 'SERVER_ERROR';
    
    metrics.errorCounts[errorType] = (metrics.errorCounts[errorType] || 0) + 1;
  }
}

export function recordAiCall(success: boolean): void {
  metrics.aiCalls += 1;
  if (success) {
    metrics.aiSuccessCalls += 1;
  } else {
    metrics.aiFailedCalls += 1;
  }
}

export function recordStatusCode(code: number): void {
  metrics.statusCodeCounts[code] = (metrics.statusCodeCounts[code] || 0) + 1;
}

export function getMetrics(): {
  requestSuccessRate: number;
  aiSuccessRate: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalAiCalls: number;
  errorDistribution: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
} {
  const requestSuccessRate = metrics.totalRequests > 0 
    ? (metrics.successRequests / metrics.totalRequests) * 100 
    : 0;
  
  const aiSuccessRate = metrics.aiCalls > 0 
    ? (metrics.aiSuccessCalls / metrics.aiCalls) * 100 
    : 0;
  
  const avgLatency = metrics.totalRequests > 0 
    ? metrics.totalLatency / metrics.totalRequests 
    : 0;

  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p99Index = Math.floor(sortedTimes.length * 0.99);
  
  const p95Latency = sortedTimes[p95Index] || 0;
  const p99Latency = sortedTimes[p99Index] || 0;

  return {
    requestSuccessRate: Math.round(requestSuccessRate * 100) / 100,
    aiSuccessRate: Math.round(aiSuccessRate * 100) / 100,
    avgLatency: Math.round(avgLatency),
    p95Latency,
    p99Latency,
    totalRequests: metrics.totalRequests,
    successRequests: metrics.successRequests,
    failedRequests: metrics.failedRequests,
    totalAiCalls: metrics.aiCalls,
    errorDistribution: { ...metrics.errorCounts },
    statusCodeDistribution: { ...metrics.statusCodeCounts }
  };
}

export function resetMetrics(): void {
  metrics.totalRequests = 0;
  metrics.successRequests = 0;
  metrics.failedRequests = 0;
  metrics.totalLatency = 0;
  metrics.aiCalls = 0;
  metrics.aiSuccessCalls = 0;
  metrics.aiFailedCalls = 0;
  metrics.errorCounts = {
    AI_ERROR: 0,
    AUTH_ERROR: 0,
    STORAGE_ERROR: 0,
    LIMIT_ERROR: 0,
    VALIDATION_ERROR: 0,
    TIMEOUT_ERROR: 0,
    SERVER_ERROR: 0,
    UNKNOWN_ERROR: 0
  };
  metrics.statusCodeCounts = {};
  metrics.responseTimes = [];
}

export function getLogsByTraceId(traceId: string): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
} {
  return {
    standard: logs.filter(l => l.trace_id === traceId),
    ai: aiLogs.filter(l => l.trace_id === traceId),
    oss: ossLogs.filter(l => l.trace_id === traceId),
    task: taskLogs.filter(l => l.trace_id === traceId)
  };
}

export function getLogsByRequestId(requestId: string): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
} {
  return {
    standard: logs.filter(l => l.request_id === requestId),
    ai: aiLogs.filter(l => l.request_id === requestId),
    oss: ossLogs.filter(l => l.request_id === requestId),
    task: taskLogs.filter(l => l.request_id === requestId)
  };
}

export function getLogsByUserId(userId: string): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
} {
  return {
    standard: logs.filter(l => l.user_id === userId),
    ai: aiLogs.filter(l => l.user_id === userId),
    oss: ossLogs.filter(l => l.user_id === userId),
    task: taskLogs.filter(l => l.user_id === userId)
  };
}

export function exportLogs(): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
  actions: UserActionLog[];
  export_time: string;
} {
  return {
    standard: [...logs],
    ai: [...aiLogs],
    oss: [...ossLogs],
    task: [...taskLogs],
    actions: [...actionLogs],
    export_time: new Date().toISOString()
  };
}

export function downloadLogs(): void {
  const data = exportLogs();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clearAllLogs(): void {
  logs.length = 0;
  aiLogs.length = 0;
  ossLogs.length = 0;
  taskLogs.length = 0;
  actionLogs.length = 0;
}

export function getErrorStats(): {
  total: number;
  byCode: Record<string, number>;
  byService: Record<string, number>;
} {
  const errors = logs.filter(l => l.level === 'ERROR');
  const byCode: Record<string, number> = {};
  const byService: Record<string, number> = {};

  errors.forEach(e => {
    const code = e.error?.code || 'UNKNOWN';
    byCode[code] = (byCode[code] || 0) + 1;
    byService[e.service] = (byService[e.service] || 0) + 1;
  });

  return {
    total: errors.length,
    byCode,
    byService
  };
}