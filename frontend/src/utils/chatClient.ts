/**
 * 客户端调用 /api/chat 的工具函数
 * 业务页面通过该方法与 OpenAI 通信，避免在前端直接持有 API Key
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  model: string;
  usage: Record<string, unknown> | null;
}

/**
 * 调用后端 /api/chat 代理
 * @throws Error 当 HTTP 状态非 2xx 或网络异常时抛出
 */
export async function chatWithAI(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    }),
    signal: options.signal,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // 响应不是 JSON 时保持 null
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : null) || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const result = data as { content?: unknown; model?: unknown; usage?: unknown };
  return {
    content: typeof result.content === 'string' ? result.content : '',
    model: typeof result.model === 'string' ? result.model : 'unknown',
    usage:
      result.usage && typeof result.usage === 'object'
        ? (result.usage as Record<string, unknown>)
        : null,
  };
}

/**
 * 健康检查：判断后端是否配置了 OPENAI_API_KEY
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/chat', { method: 'GET' });
    if (!response.ok) return false;
    const data = (await response.json()) as { apiKeyConfigured?: boolean };
    return Boolean(data?.apiKeyConfigured);
  } catch {
    return false;
  }
}
