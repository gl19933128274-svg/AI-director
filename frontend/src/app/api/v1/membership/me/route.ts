import { NextRequest } from 'next/server';
import { membershipService } from '@/modules/membership/service';
import { authenticate } from '@/middleware/auth';
import { createResponse, createErrorResponse, logRequest } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const requestId = logRequest('GET', '/api/v1/membership/me');
  
  try {
    const userId = await authenticate(request);
    
    const level = await membershipService.getUserMembership(userId);
    const config = membershipService.getMembershipConfig(level) as any;
    const dailyLimit = await membershipService.checkDailyLimit(userId);
    const subscription = await membershipService.getActiveSubscription(userId);

    return createResponse({
      level,
      config,
      dailyLimit,
      subscription: subscription ? {
        id: subscription.id,
        level: subscription.level,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
      } : null,
    }, true, 200, '操作成功', { request_id: requestId, user_id: userId });
  } catch (error) {
    return createErrorResponse(error as Error, 500, { request_id: requestId });
  }
}
