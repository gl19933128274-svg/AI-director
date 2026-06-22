import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/modules/analytics/service';

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

// 获取仪表盘概览
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'week';

    const overview = await analyticsService.getDashboardOverview(timeRange as any);
    return createResponse(overview);
  } catch (error) {
    return NextResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      error: {
        type: 'ServerError',
        detail: (error as Error).message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
      },
    }, { status: 500 });
  }
}