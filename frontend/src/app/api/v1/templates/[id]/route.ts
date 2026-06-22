import { NextRequest, NextResponse } from 'next/server';
import { templateService } from '@/modules/template/service';
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

// 获取模板详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await templateService.getById(params.id);
    if (!template) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '模板不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }

    return createResponse(template);
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 更新模板
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const template = await templateService.update(params.id, body);
    return createResponse(template, true, 200, '模板更新成功');
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}

// 删除模板
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await templateService.delete(params.id);
    return createResponse(null, true, 200, '模板删除成功');
  } catch (error) {
    return createErrorResponse(error as Error);
  }
}