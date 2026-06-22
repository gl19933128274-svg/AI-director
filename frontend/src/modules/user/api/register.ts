import { NextRequest, NextResponse } from 'next/server';
import { userService } from '../service';
import { UserError } from '../errors';

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
  if (error instanceof UserError) {
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

// 注册接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await userService.register(body);
    return createResponse(result, true, 201, '注册成功');
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}