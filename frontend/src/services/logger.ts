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
let logSamplingRate = 1.0;

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

const runtimeInfo = {
  nodeVersion: typeof process !== 'undefined' ? process.version : 'browser',
  environment: typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'browser',
  timestamp: new Date().toISOString()
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

export function setLogSamplingRate(rate: number): void {
  logSamplingRate = Math.max(0, Math.min(1, rate));
  console.log(`[Logger] Log sampling rate set to ${logSamplingRate * 100}%`);
}

export function getRuntimeInfo() {
  return { ...runtimeInfo, uptime: typeof process !== 'undefined' ? process.uptime() : 0 };
}

function shouldSample(): boolean {
  return Math.random() < logSamplingRate;
}

function log(level: LogLevel, logEntry: StandardLog): void {
  if (!shouldSample()) return;
  
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

export interface RequestContext {
  requestId: string;
  traceId: string;
  startTime: number;
  userId?: string;
  taskId?: string;
  service: string;
  step: string;
}

export function createRequestContext(service: string, step: string, userId?: string): RequestContext {
  return {
    requestId: generateRequestId(),
    traceId: generateTraceId(),
    startTime: Date.now(),
    userId,
    service,
    step
  };
}

export function logRequestStart(ctx: RequestContext, input?: Record<string, unknown>): void {
  logInfo(ctx.requestId, ctx.traceId, ctx.step, ctx.service, 'started', input || {}, {}, ctx.taskId, ctx.userId, 0);
}

export function logRequestEnd(ctx: RequestContext, status: 'success' | 'failed', output?: Record<string, unknown>, error?: { code: string; message: string }): void {
  const latency = Date.now() - ctx.startTime;
  
  if (status === 'success') {
    logInfo(ctx.requestId, ctx.traceId, ctx.step, ctx.service, 'success', {}, output || {}, ctx.taskId, ctx.userId, latency);
    recordRequest(ctx.startTime, 'success');
  } else {
    logError(ctx.requestId, ctx.traceId, ctx.step, ctx.service, error?.code || 'UNKNOWN_ERROR', error?.message || 'Unknown error', {}, output || {}, ctx.taskId, ctx.userId, undefined, latency);
    recordRequest(ctx.startTime, 'failed', error?.code);
  }
}

export function logRequestError(ctx: RequestContext, errorCode: string, errorMessage: string, stack?: string): void {
  const latency = Date.now() - ctx.startTime;
  logError(ctx.requestId, ctx.traceId, ctx.step, ctx.service, errorCode, errorMessage, {}, {}, ctx.taskId, ctx.userId, stack, latency);
  recordRequest(ctx.startTime, 'failed', errorCode);
}

export interface FunctionTimer {
  startTime: number;
  requestId: string;
  traceId: string;
  functionName: string;
  service: string;
  params?: Record<string, unknown>;
}

export function startFunctionTimer(requestId: string, traceId: string, functionName: string, service: string, params?: Record<string, unknown>): FunctionTimer {
  return {
    startTime: Date.now(),
    requestId,
    traceId,
    functionName,
    service,
    params
  };
}

export function endFunctionTimer(timer: FunctionTimer, result?: Record<string, unknown>, error?: { code: string; message: string }): void {
  const latency = Date.now() - timer.startTime;
  
  if (latency > 1000 && !devMode) {
    logWarn(timer.requestId, timer.traceId, `${timer.functionName}_TIMEOUT`, timer.service, `Function ${timer.functionName} took ${latency}ms`, timer.params || {}, result || {});
  }
  
  if (error) {
    logError(timer.requestId, timer.traceId, `${timer.functionName}_ERROR`, timer.service, error.code, error.message, timer.params || {}, result || {}, undefined, undefined, undefined, latency);
  } else {
    logInfo(timer.requestId, timer.traceId, `${timer.functionName}_COMPLETE`, timer.service, 'success', timer.params || {}, result || {}, undefined, undefined, latency);
  }
}

export async function timeAsyncFunction<T>(
  requestId: string,
  traceId: string,
  functionName: string,
  service: string,
  fn: () => Promise<T>,
  params?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    logInfo(requestId, traceId, `${functionName}_START`, service, 'processing', params || {});
    
    const result = await fn();
    
    const latency = Date.now() - startTime;
    logInfo(requestId, traceId, `${functionName}_COMPLETE`, service, 'success', params || {}, { result: typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : result }, undefined, undefined, latency);
    
    if (latency > 5000) {
      logWarn(requestId, traceId, `${functionName}_SLOW`, service, `Async function ${functionName} exceeded 5s threshold: ${latency}ms`, params || {}, { latency });
    }
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    const err = error as Error;
    logError(requestId, traceId, `${functionName}_FAILED`, service, 'FUNCTION_ERROR', err.message, params || {}, {}, undefined, undefined, err.stack, latency);
    throw error;
  }
}

export function logAuthStart(requestId: string, traceId: string, userId?: string): void {
  logInfo(requestId, traceId, 'AUTH_START', 'auth', 'started', { userId });
}

export function logAuthSuccess(requestId: string, traceId: string, userId: string, latency: number): void {
  logInfo(requestId, traceId, 'AUTH_SUCCESS', 'auth', 'success', { userId }, {}, undefined, userId, latency);
}

export function logAuthFailed(requestId: string, traceId: string, errorCode: string, errorMessage: string, userId?: string, latency?: number): void {
  logError(requestId, traceId, 'AUTH_FAILED', 'auth', errorCode, errorMessage, { userId }, {}, undefined, userId, undefined, latency);
}

export function logVideoGenerationStart(requestId: string, traceId: string, taskId: string, imageUrl: string, userId?: string): void {
  logInfo(requestId, traceId, 'VIDEO_GEN_START', 'ai-video', 'started', { taskId, imageUrl }, {}, taskId, userId);
}

export function logVideoGenerationComplete(requestId: string, traceId: string, taskId: string, videoUrl: string, latency: number, userId?: string): void {
  logInfo(requestId, traceId, 'VIDEO_GEN_COMPLETE', 'ai-video', 'success', { taskId }, { videoUrl }, taskId, userId, latency);
}

export function logVideoGenerationFailed(requestId: string, traceId: string, taskId: string, errorCode: string, errorMessage: string, imageUrl?: string, userId?: string, latency?: number): void {
  logError(requestId, traceId, 'VIDEO_GEN_FAILED', 'ai-video', errorCode, errorMessage, { taskId, imageUrl }, {}, taskId, userId, undefined, latency);
}

export function logStoryboardGenerationStart(requestId: string, traceId: string, imageUrl: string, userId?: string): void {
  logInfo(requestId, traceId, 'STORYBOARD_GEN_START', 'storyboard', 'started', { imageUrl }, {}, undefined, userId);
}

export function logStoryboardGenerationComplete(requestId: string, traceId: string, storyboardData: Record<string, unknown>, latency: number, userId?: string): void {
  logInfo(requestId, traceId, 'STORYBOARD_GEN_COMPLETE', 'storyboard', 'success', {}, { storyboard: JSON.stringify(storyboardData).substring(0, 500) }, undefined, userId, latency);
}

export function logTaskCreated(requestId: string, traceId: string, taskId: string, taskType: string, userId?: string): void {
  logInfo(requestId, traceId, 'TASK_CREATED', 'task-system', 'success', { taskId, taskType }, {}, taskId, userId);
}

export function logTaskStatusUpdate(requestId: string, traceId: string, taskId: string, oldStatus: string, newStatus: string, message?: string, userId?: string): void {
  logInfo(requestId, traceId, 'TASK_STATUS_UPDATE', 'task-system', 'processing', { taskId, oldStatus, newStatus, message }, {}, taskId, userId);
}

export function logOSSUploadStart(requestId: string, traceId: string, fileName: string, fileSize: number, userId?: string): void {
  logInfo(requestId, traceId, 'OSS_UPLOAD_START', 'oss', 'started', { fileName, fileSize }, {}, undefined, userId);
}

export function logOSSUploadComplete(requestId: string, traceId: string, fileName: string, url: string, latency: number, userId?: string): void {
  logInfo(requestId, traceId, 'OSS_UPLOAD_COMPLETE', 'oss', 'success', { fileName }, { url }, undefined, userId, latency);
}

export function logOSSUrlAccess(requestId: string, traceId: string, originalUrl: string, accessResult: 'success' | 'failed' | 'pending', signedUrl?: string, proxyUrl?: string, userId?: string): void {
  logOSS(requestId, traceId, originalUrl, accessResult, signedUrl, proxyUrl, undefined, userId);
}

export function logCostCheck(requestId: string, traceId: string, userId: string, cost: number, limit: number, remaining: number, allowed: boolean): void {
  logInfo(requestId, traceId, 'COST_CHECK', 'cost-control', allowed ? 'success' : 'failed', { userId, cost, limit, remaining }, { allowed }, undefined, userId);
}

export function logRateLimitCheck(requestId: string, traceId: string, userId: string, current: number, limit: number, allowed: boolean): void {
  logInfo(requestId, traceId, 'RATE_LIMIT_CHECK', 'rate-limit', allowed ? 'success' : 'failed', { userId, current, limit }, { allowed }, undefined, userId);
}

export function logGrayReleaseCheck(requestId: string, traceId: string, userId: string, tier: string, isInGray: boolean, featureFlags?: Record<string, boolean>): void {
  logInfo(requestId, traceId, 'GRAY_RELEASE_CHECK', 'release-control', 'success', { userId, tier, isInGray }, { featureFlags }, undefined, userId);
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

export function traceByRequestId(requestId: string): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
  actions: UserActionLog[];
} {
  return {
    standard: logs.filter(l => l.request_id === requestId),
    ai: aiLogs.filter(l => l.request_id === requestId),
    oss: ossLogs.filter(l => l.request_id === requestId),
    task: taskLogs.filter(l => l.request_id === requestId),
    actions: actionLogs.filter(l => l.request_id === requestId)
  };
}

export function traceByTaskId(taskId: string): {
  standard: StandardLog[];
  ai: AIInvocationLog[];
  oss: OSSLog[];
  task: TaskLog[];
} {
  return {
    standard: logs.filter(l => l.task_id === taskId),
    ai: aiLogs.filter(l => l.task_id === taskId),
    oss: ossLogs.filter(l => l.task_id === taskId),
    task: taskLogs.filter(l => l.task_id === taskId)
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

export type LogTag = 'AUTH' | 'AI_VIDEO' | 'STORYBOARD' | 'TASK' | 'OSS' | 'COST' | 'RATE_LIMIT' | 'GRAY_RELEASE' | 'API' | 'DATABASE' | 'CACHE';

export interface LogEntryWithTags extends StandardLog {
  tags: LogTag[];
}

const tagRegistry: Record<string, LogTag[]> = {};

export function addLogTag(requestId: string, tag: LogTag): void {
  if (!tagRegistry[requestId]) {
    tagRegistry[requestId] = [];
  }
  if (!tagRegistry[requestId].includes(tag)) {
    tagRegistry[requestId].push(tag);
  }
}

export function getLogTags(requestId: string): LogTag[] {
  return tagRegistry[requestId] || [];
}

export function clearLogTags(requestId: string): void {
  delete tagRegistry[requestId];
}

export function logWithTags(
  requestId: string,
  traceId: string,
  step: string,
  service: string,
  status: StandardLog['status'],
  tags: LogTag[],
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  taskId?: string,
  userId?: string,
  latency = 0
): void {
  tags.forEach(tag => addLogTag(requestId, tag));
  
  const entry: StandardLog = {
    request_id: requestId,
    trace_id: traceId,
    user_id: userId,
    step,
    service,
    status,
    latency,
    input: { ...input, tags },
    output,
    timestamp: new Date().toISOString(),
    level: status === 'failed' ? 'ERROR' : status === 'warning' ? 'WARN' : 'INFO',
    task_id: taskId
  };
  
  log(entry.level, entry);
}

export interface LogSnapshot {
  timestamp: string;
  requestId: string;
  traceId: string;
  service: string;
  step: string;
  status: string;
  latency: number;
  tags: LogTag[];
  error?: {
    code: string;
    message: string;
  };
}

export function takeLogSnapshot(requestId: string): LogSnapshot | null {
  const recentLog = logs.find(l => l.request_id === requestId);
  if (!recentLog) return null;
  
  return {
    timestamp: recentLog.timestamp,
    requestId: recentLog.request_id,
    traceId: recentLog.trace_id,
    service: recentLog.service,
    step: recentLog.step,
    status: recentLog.status,
    latency: recentLog.latency,
    tags: getLogTags(requestId),
    error: recentLog.error
  };
}

export function logRuntimeSnapshot(): void {
  const snapshot = {
    timestamp: new Date().toISOString(),
    runtime: getRuntimeInfo(),
    metrics: getMetrics(),
    logBufferSizes: {
      standard: logs.length,
      ai: aiLogs.length,
      oss: ossLogs.length,
      task: taskLogs.length,
      actions: actionLogs.length
    },
    activeTags: Object.keys(tagRegistry).length
  };
  
  console.log('[Logger] Runtime Snapshot:', JSON.stringify(snapshot, null, 2));
}