import { createResponse, logRequest } from '@/utils/apiResponse';

export async function GET() {
  const requestId = logRequest('GET', '/api/v1/health');
  
  return createResponse({
    status: 'healthy',
    timestamp: Date.now(),
  }, true, 200, 'Service is healthy', { request_id: requestId });
}