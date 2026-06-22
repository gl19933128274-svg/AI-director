import { NextRequest } from 'next/server';
import { userService } from '@/modules/user/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/users/me');
  
  try {
    const userId = await authenticate(request);
    const user = await userService.getUserById(userId);
    return createResponse(user, true, 200, '获取成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function PUT(request: NextRequest) {
  const requestId = logRequest('PUT', '/api/v1/users/me');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return createErrorResponse(new Error('请求体不能为空'), 400, { request_id: requestId, user_id: userId });
    }
    
    const user = await userService.updateUser(userId, body);
    return createResponse(user, true, 200, '更新成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}
