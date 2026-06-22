/**
 * @jest-environment node
 */
import { POST as generatePost } from '@/app/api/kling/generate/route';
import { GET as taskGet } from '@/app/api/kling/task/[id]/route';
import { GET as healthGet } from '@/app/api/kling/health/route';

describe('/api/kling/* routes', () => {
  const originalKey = process.env.KLING_API_KEY;
  const originalSecret = process.env.KLING_SECRET_KEY;
  const originalUseRealAI = process.env.USE_REAL_AI;
  const originalFetch = global.fetch;

  const buildRequest = (body: unknown): Request =>
    new Request('http://localhost/api/kling/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    process.env.KLING_API_KEY = 'ak-test';
    process.env.KLING_SECRET_KEY = 'sk-test';
    delete process.env.USE_REAL_AI; // 默认 Mock 模式
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.KLING_API_KEY;
    else process.env.KLING_API_KEY = originalKey;
    if (originalSecret === undefined) delete process.env.KLING_SECRET_KEY;
    else process.env.KLING_SECRET_KEY = originalSecret;
    if (originalUseRealAI === undefined) delete process.env.USE_REAL_AI;
    else process.env.USE_REAL_AI = originalUseRealAI;
    global.fetch = originalFetch;
  });

  describe('GET /api/kling/health', () => {
    test('已配置 Key 时 apiKeyConfigured = true', async () => {
      const res = await healthGet();
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.apiKeyConfigured).toBe(true);
      expect(JSON.stringify(data)).not.toContain('ak-test');
    });

    test('未配置 Key 时返回 false', async () => {
      delete process.env.KLING_API_KEY;
      delete process.env.KLING_SECRET_KEY;
      const res = await healthGet();
      const data = await res.json();
      expect(data.apiKeyConfigured).toBe(false);
    });
  });

  describe('POST /api/kling/generate', () => {
    test('Mock 模式下返回模拟任务', async () => {
      const res = await generatePost(buildRequest({ prompt: 'test' }) as never);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.isMock).toBe(true);
      expect(data.taskId).toMatch(/^mock-/);
    });

    test('真实模式下未配置 Key 返回 503', async () => {
      process.env.USE_REAL_AI = 'true';
      delete process.env.KLING_API_KEY;
      delete process.env.KLING_SECRET_KEY;
      const res = await generatePost(
        buildRequest({ prompt: 'a cat' }) as never
      );
      expect(res.status).toBe(503);
    });

    test('prompt 缺失返回 400', async () => {
      const res = await generatePost(buildRequest({}) as never);
      expect(res.status).toBe(400);
    });

    test('非法 JSON 返回 400', async () => {
      const req = new Request('http://localhost/api/kling/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      });
      const res = await generatePost(req as never);
      expect(res.status).toBe(400);
    });

    test('真实模式下上游成功：text2video', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ code: 0, data: { task_id: 't1', task_status: 'submitted' } }),
      } as never);

      const res = await generatePost(
        buildRequest({ prompt: 'a cat' }) as never
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.taskId).toBe('t1');
      expect(data.status).toBe('submitted');
    });

    test('真实模式下上游成功：image2video 选择正确路径', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ code: 0, data: { task_id: 't2', task_status: 'submitted' } }),
      } as never);

      const res = await generatePost(
        buildRequest({
          prompt: 'animate it',
          image: { data: 'data:image/png;base64,XYZ' },
        }) as never
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.taskId).toBe('t2');

      // 确认 fetch 调用了 image2video 路径
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/v1/videos/image2video');
    });

    test('真实模式下上游非 2xx 返回 502', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'oops',
      } as never);
      const res = await generatePost(buildRequest({ prompt: 'x' }) as never);
      expect(res.status).toBe(502);
    });

    test('真实模式下上游未返回 taskId 时返回 502', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ code: 0, data: {} }),
      } as never);
      const res = await generatePost(buildRequest({ prompt: 'x' }) as never);
      expect(res.status).toBe(502);
    });
  });

  describe('GET /api/kling/task/[id]', () => {
    test('Mock 模式下返回模拟状态', async () => {
      const res = await taskGet({} as never, { params: { id: 'mock-t1' } } as never);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.isMock).toBe(true);
      expect(data.status).toBe('pending');
    });

    test('缺少 id 返回 400', async () => {
      const res = await taskGet({} as never, { params: { id: '' } } as never);
      expect(res.status).toBe(400);
    });

    test('真实模式下上游成功：归一化响应', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            data: {
              task_id: 't1',
              task_status: 'succeed',
              task_result: { videos: [{ url: 'https://cdn/x.mp4' }] },
            },
          }),
      } as never);

      const res = await taskGet({} as never, { params: { id: 't1' } } as never);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.taskId).toBe('t1');
      expect(data.status).toBe('succeed');
      expect(data.videoUrl).toBe('https://cdn/x.mp4');
    });

    test('真实模式下上游失败返回 502', async () => {
      process.env.USE_REAL_AI = 'true';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'oops',
      } as never);
      const res = await taskGet({} as never, { params: { id: 't1' } } as never);
      expect(res.status).toBe(502);
    });
  });
});
