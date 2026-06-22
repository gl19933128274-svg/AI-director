import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { callKling, KlingTaskPayload, normalizeKlingTask } from '@/utils/klingServer';

/**
 * 检查是否启用真实 AI（运行时计算，支持测试动态修改）
 */
function isRealAIEnabled(): boolean {
  return process.env.USE_REAL_AI === 'true';
}

/**
 * 生成 Mock 任务 ID
 */
function generateMockTaskId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface GenerateBody {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  model?: 'kling-v1' | 'kling-v1-5' | 'kling-v1-6';
  image?: { data: string };  // base64 dataURL
  seed?: number;
}

/**
 * POST /api/kling/generate
 * 提交一个可灵视频生成任务
 *
 * 请求体：
 *   {
 *     prompt: string,                  // 必填
 *     negativePrompt?: string,
 *     duration?: 5 | 10,               // 默认 5
 *     aspectRatio?: "16:9" | "9:16" | "1:1",
 *     model?: "kling-v1" | "kling-v1-5" | "kling-v1-6",
 *     image?: { data: string },        // 图生视频：base64 dataURL
 *     seed?: number
 *   }
 *
 * 响应：
 *   200 { taskId, status, videoUrl?, errorMessage? }
 *   400 { error }
 *   502 { error, detail? }   上游失败
 *   503 { error }            未配置 Key
 */
export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return NextResponse.json(
      { error: 'prompt is required and must be a non-empty string.' },
      { status: 400 }
    );
  }

  // Mock 模式：直接返回成功响应
  if (!isRealAIEnabled()) {
    console.log('[MOCK] 可灵视频生成 - 返回模拟任务');
    const mockTaskId = generateMockTaskId();
    return NextResponse.json({
      taskId: mockTaskId,
      status: 'pending',
      isMock: true,
      message: 'Mock 模式：视频生成任务已提交（模拟）',
    });
  }

  const isImage2Video = Boolean(body.image?.data);
  const path = isImage2Video ? '/v1/videos/image2video' : '/v1/videos/text2video';

  const klingPayload: Record<string, unknown> = {
    model_name: body.model || 'kling-v1',
    prompt: body.prompt,
    negative_prompt: body.negativePrompt,
    duration: body.duration || 5,
    aspect_ratio: body.aspectRatio || '16:9',
    seed: body.seed,
  };

  if (isImage2Video) {
    klingPayload.image = body.image?.data;
  }

  try {
    const result = await callKling<KlingTaskPayload>({
      method: 'POST',
      path,
      body: klingPayload,
    });
    const normalized = normalizeKlingTask(result);
    if (!normalized.taskId) {
      return NextResponse.json(
        { error: 'Kling response did not include a task id.' },
        { status: 502 }
      );
    }
    return NextResponse.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // 配置缺失时直接抛 503
    if (message.includes('is not configured')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
