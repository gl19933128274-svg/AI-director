/**
 * @jest-environment node
 */
import { submitKlingVideo, pollKlingTask, isKlingAvailable } from '@/utils/klingClient';

const originalFetch = global.fetch;

describe('klingClient', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('submitKlingVideo', () => {
    test('成功响应解析为 KlingGenerateResponse', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ taskId: 't1', status: 'submitted' }),
      } as never);

      const result = await submitKlingVideo({ prompt: 'a cat' });
      expect(result.taskId).toBe('t1');
      expect(result.status).toBe('submitted');
    });

    test('非 2xx 抛出带错误信息的 Error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Kling request failed: timeout' }),
      } as never);

      await expect(submitKlingVideo({ prompt: 'x' })).rejects.toThrow('Kling request failed: timeout');
    });
  });

  describe('pollKlingTask', () => {
    test('解析为 KlingTaskResponse', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ taskId: 't1', status: 'succeed', videoUrl: 'https://cdn/x.mp4' }),
      } as never);

      const result = await pollKlingTask('t1');
      expect(result.status).toBe('succeed');
      expect(result.videoUrl).toBe('https://cdn/x.mp4');
    });
  });

  describe('isKlingAvailable', () => {
    test('后端未配置 Key 时返回 false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, apiKeyConfigured: false }),
      } as never);
      expect(await isKlingAvailable()).toBe(false);
    });

    test('后端已配置 Key 时返回 true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, apiKeyConfigured: true }),
      } as never);
      expect(await isKlingAvailable()).toBe(true);
    });

    test('网络异常返回 false', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      expect(await isKlingAvailable()).toBe(false);
    });
  });
});
