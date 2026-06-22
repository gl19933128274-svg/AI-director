import { NextRequest, NextResponse } from 'next/server';
import { workService } from '@/modules/work/service';

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

// 获取热门标签
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const tags = await workService.getPopularTags(limit);
    return createResponse(tags);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}