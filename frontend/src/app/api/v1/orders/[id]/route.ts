import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/modules/membership/orderService';

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

// 获取订单详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await orderService.getOrder(params.id);
    if (!order) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '订单不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }

    return createResponse(order);
  } catch (error) {
    return NextResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      error: {
        type: 'ServerError',
        detail: (error as Error).message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
      },
    }, { status: 500 });
  }
}

// 取消订单
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await orderService.cancelOrder(params.id);
    return createResponse(order, true, 200, '订单已取消');
  } catch (error) {
    if ((error as any).code === 404) {
      return NextResponse.json({
        success: false,
        code: 404,
        message: '订单不存在',
        meta: {
          timestamp: Date.now(),
          request_id: Math.random().toString(36).substr(2, 9),
        },
      }, { status: 404 });
    }
    return NextResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      error: {
        type: 'ServerError',
        detail: (error as Error).message,
      },
      meta: {
        timestamp: Date.now(),
        request_id: Math.random().toString(36).substr(2, 9),
      },
    }, { status: 500 });
  }
}