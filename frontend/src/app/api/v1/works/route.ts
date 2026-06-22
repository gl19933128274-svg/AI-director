import { NextRequest } from 'next/server';
import { workService, CreateWorkDto } from '@/modules/work/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function POST(request: NextRequest) {
  const requestId = logRequest('POST', '/api/v1/works');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json() as CreateWorkDto;
    
    if (!body.title || !body.type) {
      return createErrorResponse(new Error('title 和 type 不能为空'), 400, { request_id: requestId, user_id: userId });
    }
    
    const work = await workService.create(userId, body);
    return createResponse(work, true, 201, '作品创建成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/works');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') as 'createdAt' | 'updatedAt' || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };

    const result = await workService.getPublicWorks(query);
    return createResponse(result, true, 200, '操作成功', { request_id: requestId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}