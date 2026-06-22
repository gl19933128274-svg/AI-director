/**
 * @jest-environment node
 */
import jwt from 'jsonwebtoken';
import {
  buildKlingAuthHeaders,
  callKling,
  normalizeKlingTask,
} from '@/utils/klingServer';

const originalKey = process.env.KLING_API_KEY;
const originalSecret = process.env.KLING_SECRET_KEY;

describe('klingServer (server-side helpers, JWT auth)', () => {
  beforeEach(() => {
    process.env.KLING_API_KEY = 'ak-test';
    process.env.KLING_SECRET_KEY = 'sk-test';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.KLING_API_KEY;
    else process.env.KLING_API_KEY = originalKey;
    if (originalSecret === undefined) delete process.env.KLING_SECRET_KEY;
    else process.env.KLING_SECRET_KEY = originalSecret;
  });

  describe('buildKlingAuthHeaders (JWT)', () => {
    test('未配置 ak/sk 时返回 null', () => {
      delete process.env.KLING_API_KEY;
      delete process.env.KLING_SECRET_KEY;
      const headers = buildKlingAuthHeaders({ method: 'POST', path: '/v1/videos/text2video' });
      expect(headers).toBeNull();
    });

    test('Authorization 头必须是 "Bearer <JWT>" 格式', () => {
      const headers = buildKlingAuthHeaders({
        method: 'POST',
        path: '/v1/videos/text2video',
        body: { prompt: 'hi' },
      });
      expect(headers).not.toBeNull();
      expect(headers!['Content-Type']).toBe('application/json');
      expect(headers!.Authorization).toMatch(/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    test('生成的 JWT 解码后 payload 符合官方规范 (iss/exp/nbf)', () => {
      const headers = buildKlingAuthHeaders({ method: 'GET', path: '/v1/videos/task' });
      const token = headers!.Authorization.replace(/^Bearer /, '');
      const decoded = jwt.verify(token, 'sk-test') as { iss: string; exp: number; nbf: number; iat: number };
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.iss).toBe('ak-test');
      // exp 应该 ≈ now + 1800（30 分钟有效期）
      expect(decoded.exp - now).toBeGreaterThanOrEqual(1790);
      expect(decoded.exp - now).toBeLessThanOrEqual(1810);
      // nbf 应该 ≤ now（容忍时钟偏差）
      expect(decoded.nbf).toBeLessThanOrEqual(now);
    });
  });

  describe('callKling', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('未配置 ak/sk 时抛配置错误', async () => {
      delete process.env.KLING_API_KEY;
      delete process.env.KLING_SECRET_KEY;
      await expect(
        callKling({ method: 'POST', path: '/v1/videos/text2video' })
      ).rejects.toThrow('is not configured');
    });

    test('上游失败时抛出包含状态码的错误', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"code":401,"message":"invalid token"}',
      } as never);

      await expect(
        callKling({ method: 'POST', path: '/v1/videos/text2video', body: { prompt: 'hi' } })
      ).rejects.toThrow(/status 401/);
    });

    test('上游成功时返回 data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ code: 0, data: { task_id: 't1' } }),
      } as never);

      const data = await callKling<{ code: number; data: { task_id: string } }>({
        method: 'POST',
        path: '/v1/videos/text2video',
        body: { prompt: 'hi' },
      });
      expect(data.code).toBe(0);
      expect(data.data.task_id).toBe('t1');
    });

    test('请求 URL 默认走 api-beijing.klingai.com', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ code: 0, data: { task_id: 't1' } }),
      } as never);
      await callKling({ method: 'POST', path: '/v1/videos/text2video', body: {} });
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toMatch(/^https:\/\/api-beijing\.klingai\.com\//);
    });
  });

  describe('normalizeKlingTask', () => {
    test('成功响应提取 videoUrl', () => {
      const result = normalizeKlingTask({
        code: 0,
        data: {
          task_id: 'abc',
          task_status: 'succeed',
          task_result: { videos: [{ url: 'https://cdn/abc.mp4' }] },
        },
      });
      expect(result.taskId).toBe('abc');
      expect(result.status).toBe('succeed');
      expect(result.videoUrl).toBe('https://cdn/abc.mp4');
    });

    test('失败响应保留 message 作为 errorMessage', () => {
      const result = normalizeKlingTask({
        code: 1,
        message: 'NSFW rejected',
        data: { task_id: 'xyz', task_status: 'failed' },
      });
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('NSFW rejected');
    });

    test('snake_case / camelCase 都能识别', () => {
      const r1 = normalizeKlingTask({ data: { taskId: '1', taskStatus: 'processing' } });
      const r2 = normalizeKlingTask({ data: { task_id: '2', task_status: 'submitted' } });
      expect(r1.taskId).toBe('1');
      expect(r1.status).toBe('processing');
      expect(r2.taskId).toBe('2');
      expect(r2.status).toBe('submitted');
    });
  });
});
