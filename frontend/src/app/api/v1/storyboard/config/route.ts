import { NextRequest, NextResponse } from 'next/server';
import { storyboardService } from '@/modules/storyboard/service';

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

// 获取镜头类型列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let data: any;
    
    switch (type) {
      case 'shotTypes':
        data = storyboardService.getShotTypes();
        break;
      case 'movements':
        data = storyboardService.getCameraMovements();
        break;
      case 'lighting':
        data = storyboardService.getLightingStyles();
        break;
      default:
        // 返回所有配置
        data = {
          shotTypes: storyboardService.getShotTypes(),
          movements: storyboardService.getCameraMovements(),
          lighting: storyboardService.getLightingStyles(),
        };
    }

    return createResponse(data);
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