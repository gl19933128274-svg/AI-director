import { NextRequest } from 'next/server';
import { workService } from '@/modules/work/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/users/me/works');
  
  try {
    const userId = await authenticate(request);
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: searchParams.get('status') as any,
      visibility: searchParams.get('visibility') as any,
      sortBy: searchParams.get('sortBy') as 'createdAt' | 'updatedAt' || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };

    const result = await workService.getUserWorks(userId, query);
    return createResponse(result, true, 200, '操作成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}