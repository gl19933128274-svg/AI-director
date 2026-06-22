import { NextRequest } from 'next/server';
import { videoService } from '@/modules/video/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest, ERROR_CODES } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const { request_id: requestId, trace_id: traceId } = logRequest('GET', '/api/v1/video/tasks');
  
  try {
    const userId = await authenticate(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const tasks = await videoService.getUserTasks(userId, status || undefined);
    return createResponse(tasks, true, 200, '操作成功', { 
      request_id: requestId, 
      trace_id: traceId,
      user_id: userId 
    });
  } catch (error) {
    return createErrorResponse(error as Error, ERROR_CODES.SERVER_ERROR, { 
      request_id: requestId,
      trace_id: traceId
    });
  }
}
