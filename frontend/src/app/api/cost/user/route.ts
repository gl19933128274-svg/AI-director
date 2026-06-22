import { NextRequest } from 'next/server';
import {
  getUserDailyCost,
  getUserMonthlyCost,
  getUserCostHistory,
  getRecordsByUserId,
  checkUserCostLimit,
  generateRequestId,
  logInfo
} from '@/services/costControl';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const action = searchParams.get('action');
  const days = parseInt(searchParams.get('days') || '7');

  logInfo(requestId, 'COST_USER_REQUEST', 'cost-control', 'started', {
    userId,
    action,
    days
  });

  if (!userId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'user_id is required',
          request_id: requestId
        }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    if (action === 'history') {
      const history = getUserCostHistory(userId, days);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: history,
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'records') {
      const records = getRecordsByUserId(userId, 50);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: records,
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'limit') {
      const limitCheck = checkUserCostLimit(userId);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: limitCheck,
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const dailyCost = getUserDailyCost(userId);
      const monthlyCost = getUserMonthlyCost(userId);
      const limitCheck = checkUserCostLimit(userId);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user_id: userId,
            daily_cost: dailyCost,
            monthly_cost: monthlyCost,
            ...limitCheck
          },
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'COST_QUERY_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}