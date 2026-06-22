import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/modules/user/service';
import { AuthError, PermissionError } from '@/modules/user/errors';
import { ERROR_CODES } from '@/utils/apiResponse';

const PROTECTED_ROUTES = [
  '/api/v1/users/me',
  '/api/v1/video/tasks',
  '/api/v1/video/task',
  '/api/v1/video/generate',
  '/api/v1/membership/me',
  '/api/v1/orders',
  '/api/v1/works',
  '/api/v1/favorites',
  '/api/v1/storyboard/generate',
  '/api/v1/monitor/metrics',
  '/api/v1/cost',
];

const PUBLIC_ROUTES = [
  '/api/v1/users/register',
  '/api/v1/users/login',
  '/api/v1/membership/config',
  '/api/v1/templates/available',
  '/api/v1/works/search',
  '/api/metrics',
];

export function createErrorResponse(error: Error) {
  if (error instanceof AuthError) {
    return NextResponse.json({
      success: false,
      code: ERROR_CODES.AUTH_ERROR,
      message: error.message,
      error: {
        type: error.name,
        detail: error.message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
        trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    }, { status: 401 });
  }

  if (error instanceof PermissionError) {
    return NextResponse.json({
      success: false,
      code: ERROR_CODES.AUTH_ERROR,
      message: error.message,
      error: {
        type: error.name,
        detail: error.message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
        trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    }, { status: 403 });
  }

  return NextResponse.json({
    success: false,
    code: ERROR_CODES.SERVER_ERROR,
    message: '服务器内部错误',
    error: {
      type: 'ServerError',
      detail: error.message,
    },
    meta: {
      timestamp: Date.now(),
      request_id: Math.random().toString(36).substr(2, 9),
      trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
  }, { status: 500 });
}

export async function authenticate(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  
  if (process.env.NODE_ENV === 'development') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth] Development mode: bypassing auth, using test user');
      return 'test-user-001';
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('未登录', ERROR_CODES.AUTH_ERROR);
  }

  const token = authHeader.substring(7);
  
  if (!token || token.trim() === '') {
    throw new AuthError('无效的token', ERROR_CODES.AUTH_ERROR);
  }

  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch (error) {
    throw new AuthError('无效的token', ERROR_CODES.AUTH_ERROR);
  }
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) || pathname === route
  );
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname.startsWith(route) || pathname === route
  );
}
