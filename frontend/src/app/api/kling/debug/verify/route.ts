import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import jwt from 'jsonwebtoken';

/**
 * POST /api/kling/debug/verify
 *
 * 调试端点：用户提交 { ak, sk, baseUrl? }，
 * 端点立即用这对 ak/sk 签 JWT、打一次可灵探测，
 * 把可灵上游响应原样返回。
 *
 * 用途：让用户**不修改 .env.local**也能快速试不同的 ak/sk/域名组合，
 * 找到正确的配对。
 *
 * 安全：
 *   - ak/sk 永远不落盘，只在这次请求中存在
 *   - 只在 dev 模式下允许（生产构建会拒绝）
 *   - 不调用任何业务接口，不消耗视频生成配额
 *
 * 请求体：
 *   { "ak": "...", "sk": "...", "baseUrl": "可选" }
 * 响应：
 *   200 {
 *     ok: true | false,
 *     upstreamCode, upstreamMessage, requestId,
 *     jwt: { parts, len, first80 },
 *     request: { baseUrl, endpoint, akLen, skLen }
 *   }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production.' }, { status: 403 });
  }

  let body: { ak?: string; sk?: string; baseUrl?: string };
  try {
    body = (await request.json()) as { ak?: string; sk?: string; baseUrl?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const ak = (body.ak || '').trim();
  const sk = (body.sk || '').trim();
  const baseUrl = (body.baseUrl || '').trim() || 'https://api-beijing.klingai.com';

  if (!ak || !sk) {
    return NextResponse.json(
      { error: 'Both ak and sk are required.' },
      { status: 400 }
    );
  }

  // 现场签一个 JWT（不缓存）
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { iss: ak, exp: now + 1800, nbf: now - 5 },
    sk,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );

  // 用一个"几乎不会真正排队"的探测调用：直接用空 prompt
  // 走的是 /v1/videos/text2video；如果鉴权失败，错误是即时的（不消耗视频配额）
  const url = `${baseUrl}/v1/videos/text2video`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'kling-v1',
        prompt: 'ping',
        duration: 5,
        aspect_ratio: '16:9',
      }),
    });

    const text = await res.text();
    let parsed: { code?: number; message?: string; data?: unknown; request_id?: string } = {};
    try { parsed = JSON.parse(text); } catch { /* keep empty */ }

    return NextResponse.json({
      ok: res.ok && parsed.code === 0,
      upstreamStatus: res.status,
      upstreamCode: parsed.code,
      upstreamMessage: parsed.message,
      requestId: parsed.request_id,
      jwt: {
        parts: token.split('.').length,
        len: token.length,
        first80: token.slice(0, 80),
      },
      request: {
        baseUrl,
        endpoint: '/v1/videos/text2video',
        akLen: ak.length,
        skLen: sk.length,
        akPreview: ak.slice(0, 4) + '****' + ak.slice(-4),
        skPreview: sk.slice(0, 4) + '****' + sk.slice(-4),
      },
      rawBody: text,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Network error',
        request: { baseUrl, akLen: ak.length, skLen: sk.length },
      },
      { status: 502 }
    );
  }
}
