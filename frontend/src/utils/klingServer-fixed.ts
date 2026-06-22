/**
 * 可灵 AI 服务端鉴权 + 调用辅助（修复版）
 *
 * 鉴权规范（与官方文档对齐）：
 *   - 国内站文档：https://app.klingai.com/cn/dev/document-api/quickStart/userManual
 *   - 国际站文档：https://app.klingai.com/global/dev/document-api/quickStart/userManual
 *
 *   1. 使用 JWT (HS256) 签名
 *      - payload: { iss: <AccessKey>, exp: now+1800s, nbf: now-5s }
 *      - secret : <SecretKey>
 *   2. Authorization 头：`Bearer <JWT>`
 *   3. API 域名（默认国内站）：
 *      - 国内（北京）：https://api-beijing.klingai.com
 *      - 国际（新加坡）：https://api-singapore.klingai.com
 *      国内/国际域名 Key **不互通**，需要在控制台分别申请
 *
 * 修复内容：
 *   1. 改进 JWT Token 生成逻辑
 *   2. 增强时间戳验证
 *   3. 优化签名算法配置
 *   4. 添加详细的调试日志
 *   5. 改进错误处理
 *
 * 环境变量：
 *   - KLING_API_KEY     官方叫 AccessKey（旧项目兼容名）
 *   - KLING_SECRET_KEY  官方叫 SecretKey
 *   - KLING_API_BASE    可选，覆盖默认 base URL（默认 = 国内北京节点）
 */

import jwt from 'jsonwebtoken';

export interface SignedRequestInput {
  method: 'GET' | 'POST';
  path: string;       // 必须以 / 开头，如 "/v1/videos/text2video"
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

interface CachedToken {
  token: string;
  expiresAtMs: number;   // 提前 5 分钟过期
  generatedAtMs: number; // 记录生成时间，用于调试
}

let cached: CachedToken | null = null;

// 调试模式开关
const DEBUG_MODE = process.env.KLING_DEBUG === 'true';

function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[Kling Debug] ${message}`, data || '');
  }
}

function baseUrl(): string {
  // 默认国内站（北京节点）。海外站用户可在 .env.local 显式设置 KLING_API_BASE 覆盖
  return process.env.KLING_API_BASE || 'https://api-beijing.klingai.com';
}

/**
 * 读取 AK/SK，缺失则返回 null
 * 增强验证：检查格式和长度
 */
function readCredentials(): { ak: string; sk: string } | null {
  const ak = process.env.KLING_API_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  
  debugLog('Reading credentials...', { 
    akLength: ak?.length, 
    skLength: sk?.length,
    akExists: !!ak,
    skExists: !!sk
  });
  
  if (!ak || !sk) {
    debugLog('Credentials missing', { ak: !!ak, sk: !!sk });
    return null;
  }
  
  // 验证格式
  if (ak.length < 10 || sk.length < 10) {
    debugLog('Credentials too short', { akLength: ak.length, skLength: sk.length });
    return null;
  }
  
  return { ak, sk };
}

/**
 * 生成（或返回缓存的）可灵 JWT Token（修复版）
 * - HS256 签名
 * - iss = AccessKey
 * - exp = now + 1800s (30 分钟)
 * - nbf = now - 5s   容忍 5 秒时钟偏差
 * 
 * 修复内容：
 * 1. 增强时间戳计算精度
 * 2. 改进 Token 缓存逻辑
 * 3. 添加详细的调试信息
 * 4. 优化错误处理
 */
export function buildKlingAuthHeaders(_input: SignedRequestInput): Record<string, string> | null {
  const creds = readCredentials();
  if (!creds) {
    debugLog('No credentials available');
    return null;
  }

  try {
    const token = getKlingToken(creds.ak, creds.sk);
    
    debugLog('Token generated successfully', { 
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    debugLog('Token generation failed', error);
    return null;
  }
}

function getKlingToken(ak: string, sk: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  debugLog('Generating new token...', {
    now,
    nowISO: new Date(now * 1000).toISOString(),
    ak: ak.substring(0, 10) + '...'
  });

  // 缓存提前 5 分钟刷新（修复：增加时间缓冲）
  if (cached && cached.expiresAtMs > Date.now() + 30000) {
    debugLog('Using cached token', {
      age: Date.now() - cached.generatedAtMs,
      expiresAt: new Date(cached.expiresAtMs).toISOString()
    });
    return cached.token;
  }

  // 生成 Token（修复：确保时间戳精度）
  const payload = {
    iss: ak,
    exp: now + 1800,  // 30 分钟后过期
    nbf: now - 5,     // 5 秒前生效
    iat: now          // 签发时间
  };

  debugLog('Token payload', payload);

  const token = jwt.sign(
    payload,
    sk,
    {
      algorithm: 'HS256',
      header: { 
        alg: 'HS256', 
        typ: 'JWT',
        kid: ak.substring(0, 8) // 可选：添加 key id 用于调试
      }
    }
  );

  // 验证生成的 Token（修复：添加验证步骤）
  try {
    const decoded = jwt.verify(token, sk) as any;
    debugLog('Token verification successful', {
      iss: decoded.iss,
      exp: decoded.exp,
      nbf: decoded.nbf,
      iat: decoded.iat
    });
  } catch (error) {
    debugLog('Token verification failed', error);
    throw new Error(`Token verification failed: ${error.message}`);
  }

  // 更新缓存（修复：使用更精确的过期时间）
  cached = {
    token,
    expiresAtMs: Date.now() + 25 * 60 * 1000,  // 25 分钟后过期（留 5 分钟缓冲）
    generatedAtMs: Date.now()
  };
  
  debugLog('Token cached', {
    expiresAt: new Date(cached.expiresAtMs).toISOString(),
    ttl: cached.expiresAtMs - Date.now()
  });
  
  return token;
}

function buildQueryString(
  query: Record<string, string | number | boolean | undefined> | undefined
): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join('&');
}

/**
 * 发起一次可灵 API 请求，自动带上 Authorization 头（修复版）
 * 网络异常 / 非 2xx 都抛出 Error，调用方决定如何向客户端返回
 * 
 * 修复内容：
 * 1. 增强错误处理
 * 2. 添加详细的调试日志
 * 3. 改进超时处理
 * 4. 优化响应解析
 */
export async function callKling<T = unknown>(input: SignedRequestInput): Promise<T> {
  const startTime = Date.now();
  
  debugLog('Calling Kling API...', {
    method: input.method,
    path: input.path,
    hasBody: !!input.body
  });

  const headers = buildKlingAuthHeaders(input);
  if (!headers) {
    const error = 'KLING_API_KEY / KLING_SECRET_KEY is not configured on the server.';
    debugLog('Authentication failed', error);
    throw new Error(error);
  }

  const url = `${baseUrl()}${input.path}${
    buildQueryString(input.query) ? `?${buildQueryString(input.query)}` : ''
  }`;

  debugLog('Request URL', url);

  const init: RequestInit = {
    method: input.method,
    headers: headers as unknown as HeadersInit,
    // 修复：添加超时控制
    signal: AbortSignal.timeout(60000) // 60 秒超时
  };
  
  if (input.body !== undefined) {
    init.body = JSON.stringify(input.body);
    debugLog('Request body', input.body);
  }

  try {
    const response = await fetch(url, init);
    const latency = Date.now() - startTime;
    
    debugLog('Response received', {
      status: response.status,
      statusText: response.statusText,
      latency: `${latency}ms`
    });

    const text = await response.text().catch(() => '');
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
      debugLog('Response data', data);
    } catch {
      data = text;
      debugLog('Response text', text);
    }

    if (!response.ok) {
      const detail = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
      const error = `Kling request failed with status ${response.status}: ${detail}`;
      debugLog('Request failed', error);
      throw new Error(error);
    }

    debugLog('Request successful', { latency: `${latency}ms` });
    return data as T;
  } catch (error) {
    const latency = Date.now() - startTime;
    debugLog('Request error', {
      error: error.message,
      latency: `${latency}ms`
    });
    
    if (error.name === 'AbortError') {
      throw new Error('Kling API request timeout');
    }
    
    throw error;
  }
}

/**
 * 规范化可灵任务响应（snake_case / camelCase 双兼容）
 */
export interface KlingTaskPayload {
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    taskId?: string;
    task_status?: 'submitted' | 'processing' | 'succeed' | 'failed';
    taskStatus?: 'submitted' | 'processing' | 'succeed' | 'failed';
    task_result?: { videos?: Array<{ url?: string }> };
    taskResult?: { videos?: Array<{ url?: string }> };
  };
}

export function normalizeKlingTask(payload: KlingTaskPayload): {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
} {
  const data = payload?.data || {};
  const taskId = (data.task_id || data.taskId || '').toString();
  const status = (data.task_status || data.taskStatus || 'processing') as
    | 'submitted'
    | 'processing'
    | 'succeed'
    | 'failed';

  let videoUrl: string | undefined;
  if (status === 'succeed') {
    const result = data.task_result || data.taskResult;
    const first = result?.videos?.[0];
    videoUrl = first?.url;
  }

  debugLog('Normalized Kling task', {
    taskId,
    status,
    hasVideoUrl: !!videoUrl
  });

  return {
    taskId,
    status,
    videoUrl,
    errorMessage: status === 'failed' ? payload?.message || 'video generation failed' : undefined,
  };
}

/**
 * 手动刷新 Token（用于调试）
 */
export function forceRefreshToken(): void {
  debugLog('Forcing token refresh');
  cached = null;
}

/**
 * 获取当前 Token 状态（用于调试）
 */
export function getTokenStatus(): {
  hasToken: boolean;
  tokenAge?: number;
  tokenTTL?: number;
  tokenPrefix?: string;
} {
  if (!cached) {
    return { hasToken: false };
  }
  
  return {
    hasToken: true,
    tokenAge: Date.now() - cached.generatedAtMs,
    tokenTTL: cached.expiresAtMs - Date.now(),
    tokenPrefix: cached.token.substring(0, 20) + '...'
  };
}