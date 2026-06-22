/**
 * 视频生成客户端工具
 * 业务页面通过该方法与 /api/kling 通信，避免在前端直接持有可灵 Key
 *
 * 接口约定（与 src/app/api/kling 下的路由文件对齐）
 */

export interface KlingImagePayload {
  /** 图片 base64 dataURL（包含 "data:image/...;base64," 前缀） */
  data: string;
}

export interface KlingGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  duration?: number;          // 秒
  aspectRatio?: string;       // "16:9" / "9:16" / "1:1"
  model?: 'kling-v1' | 'kling-v1-5' | 'kling-v1-6';
  image?: KlingImagePayload;  // 图生视频时传图
  seed?: number;
}

export interface KlingGenerateResponse {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  /** 当 status === 'succeed' 时，videoUrl 会有值 */
  videoUrl?: string;
  /** 当 status === 'failed' 时，errorMessage 会有值 */
  errorMessage?: string;
}

export interface KlingTaskResponse {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  progress?: number;
}

/**
 * 提交一个视频生成任务
 * @throws Error 当 HTTP 状态非 2xx 或网络异常时抛出
 */
export async function submitKlingVideo(
  payload: KlingGenerateRequest,
  options: { signal?: AbortSignal } = {}
): Promise<KlingGenerateResponse> {
  const response = await fetch('/api/kling/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(extractError(data, `Request failed with status ${response.status}`));
  }

  return data as KlingGenerateResponse;
}

/**
 * 轮询查询视频生成任务状态
 */
export async function pollKlingTask(
  taskId: string,
  options: { signal?: AbortSignal } = {}
): Promise<KlingTaskResponse> {
  const response = await fetch(`/api/kling/task/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    signal: options.signal,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(extractError(data, `Request failed with status ${response.status}`));
  }

  return data as KlingTaskResponse;
}

/**
 * 健康检查：判断后端是否配置了可灵 Key
 */
export async function isKlingAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/kling/health', { method: 'GET' });
    if (!response.ok) return false;
    const data = (await response.json()) as { apiKeyConfigured?: boolean };
    return Boolean(data?.apiKeyConfigured);
  } catch {
    return false;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === 'string') return e;
  }
  return fallback;
}
