/**
 * 可灵 AI 服务端鉴权 + 调用辅助
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
}

let cached: CachedToken | null = null;

function baseUrl(): string {
  // 默认国内站（北京节点）。海外站用户可在 .env.local 显式设置 KLING_API_BASE 覆盖
  return process.env.KLING_API_BASE || 'https://api-beijing.klingai.com';
}

/**
 * 读取 AK/SK，缺失则返回 null
 */
function readCredentials(): { ak: string; sk: string } | null {
  const ak = process.env.KLING_API_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  if (!ak || !sk) return null;
  return { ak, sk };
}

/**
 * 生成（或返回缓存的）可灵 JWT Token
 * - HS256 签名
 * - iss = AccessKey
 * - exp = now + 1800s (30 分钟)
 * - nbf = now - 5s   容忍 5 秒时钟偏差
 */
export function buildKlingAuthHeaders(_input: SignedRequestInput): Record<string, string> | null {
  const creds = readCredentials();
  if (!creds) return null;

  const token = getKlingToken(creds.ak, creds.sk);

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getKlingToken(ak: string, sk: string): string {
  const now = Math.floor(Date.now() / 1000);

  // 缓存提前 5 分钟刷新
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.token;
  }

  const token = jwt.sign(
    {
      iss: ak,
      exp: now + 1800,
      nbf: now - 5,
    },
    sk,
    {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT' },
    }
  );

  cached = {
    token,
    expiresAtMs: Date.now() + 25 * 60 * 1000,  // 25 分钟后过期
  };
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
 * 发起一次可灵 API 请求，自动带上 Authorization 头
 * 网络异常 / 非 2xx 都抛出 Error，调用方决定如何向客户端返回
 */
export async function callKling<T = unknown>(input: SignedRequestInput): Promise<T> {
  const headers = buildKlingAuthHeaders(input);
  if (!headers) {
    throw new Error('KLING_API_KEY / KLING_SECRET_KEY is not configured on the server.');
  }

  const url = `${baseUrl()}${input.path}${
    buildQueryString(input.query) ? `?${buildQueryString(input.query)}` : ''
  }`;

  const init: RequestInit = {
    method: input.method,
    headers: headers as unknown as HeadersInit,
  };
  if (input.body !== undefined) {
    init.body = JSON.stringify(input.body);
  }

  const response = await fetch(url, init);
  const text = await response.text().catch(() => '');
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
    throw new Error(`Kling request failed with status ${response.status}: ${detail}`);
  }

  return data as T;
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

  return {
    taskId,
    status,
    videoUrl,
    errorMessage: status === 'failed' ? payload?.message || 'video generation failed' : undefined,
  };
}
