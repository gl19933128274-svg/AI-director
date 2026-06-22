import { NextRequest } from 'next/server';
import { templateService } from '@/modules/template/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/templates/available');
  
  try {
    const userId = await authenticate(request);
    const templates = await templateService.getAvailableTemplates(userId);
    return createResponse(templates, true, 200, '操作成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = logRequest('POST', '/api/v1/templates/available');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json();
    const { templateId, inputData } = body;

    if (!templateId || !inputData) {
      return createErrorResponse(new Error('templateId 和 inputData 不能为空'), 400, { request_id: requestId, user_id: userId });
    }

    const hasAccess = await templateService.checkAccess(userId, templateId);
    if (!hasAccess) {
      return createResponse(null, false, 403, '权限不足，需要升级会员', { request_id: requestId, user_id: userId });
    }

    const config = await templateService.applyTemplate(templateId, inputData);
    return createResponse(config, true, 200, '模板应用成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}