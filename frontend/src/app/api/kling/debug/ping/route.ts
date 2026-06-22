import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { callKling, buildKlingAuthHeaders } from '@/utils/klingServer';

/**
 * POST /api/kling/_debug/ping
 *
 * 临时调试端点：用服务端持有的 ak/sk 真实调一次可灵最小 API，
 * 用来验证 JWT 鉴权头是否被可灵接受。
 *
 * 调用：发一个最简单的 text2video 任务（5 秒、16:9），
 * 期望看到以下返回码之一：
 *   - 上游 2xx + 拿到 task_id    → 鉴权成功
 *   - 上游 401 Unauthorized       → 鉴权失败（ak/sk 不对）
 *   - 上游 4xx (其他)             → 请求格式/配额问题
 *   - 网络异常 / 配置缺失         → 503/502
 *
 * 注意：**会真实消耗 1 次 API 调用配额**。
 * 仅供本地开发调试，请勿在生产环境暴露。
 */
export async function POST(_request: NextRequest) {
  const headers = buildKlingAuthHeaders({
    method: 'POST',
    path: '/v1/videos/text2video',
  });
  if (!headers) {
    return NextResponse.json(
      { ok: false, error: 'KLING_API_KEY / KLING_SECRET_KEY not configured' },
      { status: 503 }
    );
  }

  // 用最小的 prompt 试探，避免 30 秒视频浪费配额
  const probeBody = {
    model_name: 'kling-v1',
    prompt: 'a single white dot on a black background',
    duration: 5,
    aspect_ratio: '16:9',
  };

  try {
    const data = await callKling<{
      code?: number;
      message?: string;
      data?: { task_id?: string; taskId?: string; task_status?: string };
    }>({
      method: 'POST',
      path: '/v1/videos/text2video',
      body: probeBody,
    });

    const upstreamCode = (data as { code?: number }).code;
    return NextResponse.json({
      ok: upstreamCode === 0,
      upstreamCode,
      upstreamMessage: (data as { message?: string }).message,
      taskId:
        (data as { data?: { task_id?: string } }).data?.task_id ??
        (data as { data?: { taskId?: string } }).data?.taskId,
      taskStatus: (data as { data?: { task_status?: string } }).data?.task_status,
      request: {
        baseUrl: process.env.KLING_API_BASE || 'https://api-beijing.klingai.com',
        endpoint: '/v1/videos/text2video',
        bodySent: probeBody,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: message,
        // 解析状态码（如果有）
        upstreamStatus: /status (\d+)/.exec(message)?.[1] ?? null,
      },
      { status: 502 }
    );
  }
}
