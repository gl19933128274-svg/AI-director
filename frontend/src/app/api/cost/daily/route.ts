import { NextRequest } from 'next/server';
import {
  getDailyCost,
  getCostStats,
  getRecordsByDate
} from '@/services/costControl';
import { generateRequestId, logInfo } from '@/services/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const action = searchParams.get('action');

  logInfo(requestId, 'COST_DAILY_REQUEST', 'cost-control', 'started', {
    date,
    action
  });

  try {
    if (action === 'records') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const records = getRecordsByDate(targetDate);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            date: targetDate,
            records
          },
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'stats') {
      const stats = getCostStats(7);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: stats,
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const cost = getDailyCost(targetDate);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            date: targetDate,
            cost
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
          code: 'COST_DAILY_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}