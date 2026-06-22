import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 是否启用真实 AI（环境变量 USE_REAL_AI = true 时启用）
const USE_REAL_AI = process.env.USE_REAL_AI === 'true';

/**
 * GET /api/kling/health
 * 健康检查 / 配置探测，**不会泄露任何 Key**
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.KLING_API_KEY && process.env.KLING_SECRET_KEY),
    apiBase: process.env.KLING_API_BASE || 'https://api.klingai.com',
    useRealAI: USE_REAL_AI,
    mode: USE_REAL_AI ? 'production' : 'mock',
  });
}
