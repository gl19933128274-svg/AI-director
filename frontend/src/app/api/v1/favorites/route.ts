import { NextRequest } from 'next/server';
import { favoriteService } from '@/modules/work/favoriteService';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function POST(request: NextRequest) {
  const requestId = logRequest('POST', '/api/v1/favorites');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json();
    
    if (!body.workId) {
      return createErrorResponse(new Error('workId 不能为空'), 400, { request_id: requestId, user_id: userId });
    }
    
    await favoriteService.add(userId, body.workId);
    return createResponse(null, true, 200, '收藏成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = logRequest('DELETE', '/api/v1/favorites');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json();
    
    if (!body.workId) {
      return createErrorResponse(new Error('workId 不能为空'), 400, { request_id: requestId, user_id: userId });
    }
    
    await favoriteService.remove(userId, body.workId);
    return createResponse(null, true, 200, '取消收藏成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/favorites');
  
  try {
    const userId = await authenticate(request);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await favoriteService.getUserFavorites(userId, page, limit);
    return createResponse(result, true, 200, '操作成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}