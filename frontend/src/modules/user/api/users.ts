import { NextRequest, NextResponse } from 'next/server';
import { userService, verifyToken } from '../service';
import { UserError, AuthError } from '../errors';

// 生成响应
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

// 生成错误响应
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

// 认证中间件
async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await userService.register(body);
    return createResponse(result);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 用户登录
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      throw new AuthError('未登录');
    }

    const user = await userService.getUserById(userId);
    return createResponse(user);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      throw new AuthError('未登录');
    }

    const body = await request.json();
    const user = await userService.updateUser(userId, body);
    return createResponse(user);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      throw new AuthError('未登录');
    }

    // 这里应该实现删除逻辑，但实际应用中通常不会真正删除用户
    return createResponse(null, true, 200, '账户已注销');
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}