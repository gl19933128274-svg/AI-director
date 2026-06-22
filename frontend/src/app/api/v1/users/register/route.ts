import { NextRequest } from 'next/server';
import { userService } from '@/modules/user/service';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function POST(request: NextRequest) {
  const requestId = logRequest('POST', '/api/v1/users/register');
  
  try {
    const body = await request.json();
    
    if (!body.email || !body.password || !body.username) {
      return createErrorResponse(new Error('email、password 和 username 不能为空'), 400, { request_id: requestId });
    }
    
    const result = await userService.register(body);
    return createResponse(result, true, 201, '注册成功', { request_id: requestId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}