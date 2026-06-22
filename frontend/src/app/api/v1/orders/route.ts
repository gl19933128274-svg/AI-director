import { NextRequest } from 'next/server';
import { orderService, CreateOrderRequest } from '@/modules/membership/orderService';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/orders');
  
  try {
    const userId = await authenticate(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const orders = await orderService.getUserOrders(userId, status || undefined);
    return createResponse(orders, true, 200, '获取订单成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}

export async function POST(request: NextRequest) {
  const requestId = logRequest('POST', '/api/v1/orders');
  
  try {
    const userId = await authenticate(request);
    const body = await request.json() as Omit<CreateOrderRequest, 'userId'>;

    if (!body || !body.productId) {
      return createErrorResponse(new Error('productId 不能为空'), 400, { request_id: requestId, user_id: userId });
    }

    const order = await orderService.createOrder({
      ...body,
      userId,
    });

    return createResponse(order, true, 201, '订单创建成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}
