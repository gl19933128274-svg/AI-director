/**
 * @jest-environment node
 */
import { POST, GET } from '@/app/api/chat/route';

const buildRequest = (body: unknown): Request =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('/api/chat (Hunyuan)', () => {
  const originalKey = process.env.HUNYUAN_API_KEY;
  const originalFetch = global.fetch;
  const originalUseRealAI = process.env.USE_REAL_AI;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.HUNYUAN_API_KEY;
    } else {
      process.env.HUNYUAN_API_KEY = originalKey;
    }
    if (originalUseRealAI === undefined) {
      delete process.env.USE_REAL_AI;
    } else {
      process.env.USE_REAL_AI = originalUseRealAI;
    }
    global.fetch = originalFetch;
  });

  describe('GET', () => {
    test('返回健康状态且不泄露 Key', async () => {
      process.env.HUNYUAN_API_KEY = 'hy-test';
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.apiKeyConfigured).toBe(true);
      expect(JSON.stringify(data)).not.toContain('hy-test');
    });

    test('未配置 Key 时 apiKeyConfigured 为 false', async () => {
      delete process.env.HUNYUAN_API_KEY;
      const res = await GET();
      const data = await res.json();
      expect(data.apiKeyConfigured).toBe(false);
    });
  });

  describe('POST', () => {
    test('未配置 Key 且启用真实 AI 返回 503', async () => {
      process.env.USE_REAL_AI = 'true';
      delete process.env.HUNYUAN_API_KEY;
      const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'hi' }] }) as never);
      expect(res.status).toBe(503);
    });

    test('Mock 模式下未配置 Key 仍返回 200', async () => {
      process.env.USE_REAL_AI = 'false';
      delete process.env.HUNYUAN_API_KEY;
      const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'hi' }] }) as never);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isMock).toBe(true);
    });

    test('非法 JSON 返回 400', async () => {
      const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    test('Mock 模式下 messages 为空返回 Mock 响应', async () => {
      process.env.USE_REAL_AI = 'false';
      const res = await POST(buildRequest({ messages: [] }) as never);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isMock).toBe(true);
    });

    test('启用真实 AI 时 messages 为空返回 400', async () => {
      process.env.USE_REAL_AI = 'true';
      process.env.HUNYUAN_API_KEY = 'hy-test';
      const res = await POST(buildRequest({ messages: [] }) as never);
      expect(res.status).toBe(400);
    });

    test('启用真实 AI 时消息字段无效返回 400', async () => {
      process.env.USE_REAL_AI = 'true';
      process.env.HUNYUAN_API_KEY = 'hy-test';
      const res = await POST(
        buildRequest({ messages: [{ role: 'admin', content: 'hi' }] }) as never
      );
      expect(res.status).toBe(400);
    });

    test('Mock 模式返回模拟响应', async () => {
      process.env.USE_REAL_AI = 'false';
      const res = await POST(
        buildRequest({ messages: [{ role: 'user', content: '帮我生成分镜脚本' }] }) as never
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.isMock).toBe(true);
      expect(data.model).toBe('mock-hunyuan-pro');
    });

    test('上游返回 200 时透传 content', async () => {
      process.env.USE_REAL_AI = 'true';
      process.env.HUNYUAN_API_KEY = 'hy-test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'hello world' } }],
          model: 'hunyuan-pro',
          usage: { total_tokens: 10 },
        }),
        text: async () => '',
      } as never);

      const res = await POST(
        buildRequest({ messages: [{ role: 'user', content: 'hi' }] }) as never
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.content).toBe('hello world');
      expect(data.model).toBe('hunyuan-pro');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('上游失败返回 502', async () => {
      process.env.USE_REAL_AI = 'true';
      process.env.HUNYUAN_API_KEY = 'hy-test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'internal error',
        json: async () => ({}),
      } as never);

      const res = await POST(
        buildRequest({ messages: [{ role: 'user', content: 'hi' }] }) as never
      );
      expect(res.status).toBe(502);
    });

    test('网络异常返回 502', async () => {
      process.env.USE_REAL_AI = 'true';
      process.env.HUNYUAN_API_KEY = 'hy-test';
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      const res = await POST(
        buildRequest({ messages: [{ role: 'user', content: 'hi' }] }) as never
      );
      expect(res.status).toBe(502);
    });
  });
});
