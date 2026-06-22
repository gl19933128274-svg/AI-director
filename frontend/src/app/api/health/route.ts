import { NextRequest } from 'next/server';
import { createResponse, logRequest, ERROR_CODES } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const { request_id: requestId, trace_id: traceId } = logRequest('GET', '/api/health');
  
  try {
    return createResponse({
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: '1.0.0'
    }, true, 200, '服务运行正常', { 
      request_id: requestId, 
      trace_id: traceId 
    });
  } catch (error) {
    return createResponse({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 500, '服务异常', { 
      request_id: requestId, 
      trace_id: traceId,
      code: ERROR_CODES.SERVER_ERROR
    });
  }
}