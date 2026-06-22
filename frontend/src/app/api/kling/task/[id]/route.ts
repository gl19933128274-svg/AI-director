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

// Mock 任务状态模拟
const mockTasks = new Map<string, { createdAt: number; status: 'pending' | 'running' | 'completed' | 'failed' }>();

/**
 * 模拟任务状态变化
 */
function getMockTaskStatus(taskId: string) {
  let task = mockTasks.get(taskId);
  
  // 如果任务不存在，创建一个新的模拟任务
  if (!task) {
    task = {
      createdAt: Date.now(),
      status: 'pending'
    };
    mockTasks.set(taskId, task);
  }
  
  // 根据时间模拟状态变化
  const elapsed = Date.now() - task.createdAt;
  
  // 前 3 秒：pending
  if (elapsed < 3000) {
    task.status = 'pending';
  }
  // 3-8 秒：running
  else if (elapsed < 8000) {
    task.status = 'running';
  }
  // 8 秒后：completed
  else {
    task.status = 'completed';
  }
  
  return task.status;
}

/**
 * GET /api/kling/task/[id]
 * 查询一个可灵视频生成任务的状态
 *
 * 响应：
 *   200 { taskId, status, videoUrl?, errorMessage?, isMock? }
 *   400 { error }            参数错误
 *   502 { error, detail? }   上游失败
 *   503 { error }            未配置 Key
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params?.id;
  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'task id is required.' }, { status: 400 });
  }

  // Mock 模式：模拟任务状态
  if (!isRealAIEnabled()) {
    const status = getMockTaskStatus(taskId);
    const response: Record<string, unknown> = {
      taskId,
      status,
      isMock: true,
    };
    
    if (status === 'completed') {
      response.videoUrl = 'https://example.com/mock-video.mp4';
      response.message = 'Mock 模式：视频生成完成（模拟）';
    } else if (status === 'running') {
      response.progress = Math.floor(Math.random() * 80) + 10;
    }
    
    console.log(`[MOCK] 查询任务状态 - taskId: ${taskId}, status: ${status}`);
    return NextResponse.json(response);
  }

  // 国内可灵官方：任务查询路径是 /v1/videos/text2video/{task_id} 或 /v1/videos/image2video/{task_id}
  // 这里采用官方示例的 GET /v1/videos/text2video/{task_id} 形式，把 task_id 拼到 path 后面
  const safeId = encodeURIComponent(taskId);
  try {
    const result = await callKling<KlingTaskPayload>({
      method: 'GET',
      path: `/v1/videos/text2video/${safeId}`,
    });
    const normalized = normalizeKlingTask(result);
    return NextResponse.json({ ...normalized, taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('is not configured')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
