import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/modules/video/service';

function createResponse(data: unknown, success: boolean = true, code: number = 200, message: string = '操作成功') {
  return NextResponse.json({
    success,
    code,
    message,
    data,
    meta: {
      timestamp: Date.now(),
      request_id: Math.random().toString(36).substr(2, 9),
    },
  }, { status: code });
}

function createErrorResponse(error: Error) {
  return NextResponse.json({
    success: false,
    code: 500,
    message: '服务器内部错误',
    error: {
      type: 'ServerError',
      detail: error.message,
    },
    meta: {
      timestamp: Date.now(),
      request_id: Math.random().toString(36).substr(2, 9),
    },
  }, { status: 500 });
}

// 获取任务状态
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await videoService.getTask(params.id);
    if (!task) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '任务不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }

    return createResponse(task);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 取消任务
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await videoService.cancelTask(params.id);
    return createResponse(null, true, 200, '任务已取消');
  } catch (error) {
    if ((error as any).code === 404) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '任务不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }
    return createErrorResponse(error as Error);
  }
}