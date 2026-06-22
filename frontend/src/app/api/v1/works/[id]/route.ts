import { NextRequest, NextResponse } from 'next/server';
import { workService } from '@/modules/work/service';
import { WorkError } from '@/modules/work/errors';

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
  if (error instanceof WorkError) {
    return NextResponse.json({
      success: false,
      code: error.code,
      message: error.message,
      error: {
        type: error.name,
        field: error.field,
        detail: error.message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
      },
    }, { status: error.code });
  }

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

// 获取作品详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const work = await workService.getById(params.id);
    if (!work) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '作品不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }

    return createResponse(work);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}