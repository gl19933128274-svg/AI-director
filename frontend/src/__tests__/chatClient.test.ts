import { chatWithAI, isAIAvailable } from '@/utils/chatClient';

const originalFetch = global.fetch;

describe('chatClient', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('chatWithAI', () => {
    test('成功响应解析为 ChatResult', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: 'hi',
          model: 'gpt-4o-mini',
          usage: { total_tokens: 1 },
        }),
      } as never);

      const result = await chatWithAI([{ role: 'user', content: 'hello' }]);
      expect(result.content).toBe('hi');
      expect(result.model).toBe('gpt-4o-mini');
    });

    test('非 2xx 抛出包含 error 信息的 Error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'OPENAI_API_KEY is not configured on the server.' }),
      } as never);

      await expect(
        chatWithAI([{ role: 'user', content: 'hi' }])
      ).rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    test('请求体携带 model / temperature / maxTokens', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: '', model: 'x', usage: null }),
      } as never);
      global.fetch = mockFetch;

      await chatWithAI([{ role: 'user', content: 'hi' }], {
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 256,
      });

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        messages: [{ role: 'user', content: 'hi' }],
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 256,
      });
    });
  });

  describe('isAIAvailable', () => {
    test('后端未配置 Key 时返回 false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, apiKeyConfigured: false }),
      } as never);
      expect(await isAIAvailable()).toBe(false);
    });

    test('后端已配置 Key 时返回 true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, apiKeyConfigured: true }),
      } as never);
      expect(await isAIAvailable()).toBe(true);
    });

    test('网络异常返回 false', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      expect(await isAIAvailable()).toBe(false);
    });
  });
});
