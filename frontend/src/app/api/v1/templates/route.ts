import { NextRequest, NextResponse } from 'next/server';
import { templateService, CreateTemplateDto } from '@/modules/template/service';
import { TemplateError } from '@/modules/template/errors';

function createResponse(data: unknown, success: boolean = true, code: number = 200, message: string = '操作成功') {
  return NextResponse.json({
    success,
    code,
    message,
    data,
    meta: {
      timestamp: Date.now(),
      request_id: Math.random().toString(36).substr(2, 9),
    },
  }, { status: code });
}

function createErrorResponse(error: Error) {
  if (error instanceof TemplateError) {
    return NextResponse.json({
      success: false,
      code: error.code,
      message: error.message,
      error: {
        type: error.name,
        field: error.field,
        detail: error.message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
      },
    }, { status: error.code });
  }

  return NextResponse.json({
    success: false,
    code: 500,
    message: '服务器内部错误',
    error: {
      type: 'ServerError',
      detail: error.message,
    },
    meta: {
      timestamp: Date.now(),
      request_id: Math.random().toString(36).substr(2, 9),
    },
  }, { status: 500 });
}

// 创建模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTemplateDto;
    const template = await templateService.create(body);
    return createResponse(template, true, 201, '模板创建成功');
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      requiredLevel: searchParams.get('requiredLevel') as any,
    };

    const result = await templateService.getTemplates(query);
    return createResponse(result);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}