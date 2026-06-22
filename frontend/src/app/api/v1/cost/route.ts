import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  generateRequestId,
  generateTraceId,
  logInfo,
  logError,
  recordRequest,
  recordStatusCode
} from '@/services/logger';
import { authenticate } from '@/middleware/auth';
import { getCostConfig } from '@/services/costControl';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const startTime = Date.now();
  
  try {
    const userId = await authenticate(request);
    
    logInfo(requestId, traceId, 'COST_QUERY_START', 'cost-control', 'started', { userId }, {}, undefined, userId);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const groupBy = searchParams.get('group_by') || 'day';

    const where: Record<string, unknown> = { userId };
    
    if (startDate) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown>),
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown>),
        lte: new Date(endDate)
      };
    }

    const costRecords = await prisma.costRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const totalCost = costRecords.reduce((sum, record) => sum + record.actualCost, 0);
    const todayCost = costRecords
      .filter(r => {
        const today = new Date();
        return r.createdAt.getDate() === today.getDate() &&
               r.createdAt.getMonth() === today.getMonth() &&
               r.createdAt.getFullYear() === today.getFullYear();
      })
      .reduce((sum, record) => sum + record.actualCost, 0);

    const costConfig = getCostConfig();

    const latency = Date.now() - startTime;
    logInfo(requestId, traceId, 'COST_QUERY_SUCCESS', 'cost-control', 'success', {
      recordCount: costRecords.length,
      totalCost,
      todayCost
    }, {}, undefined, userId, latency);

    recordRequest(startTime, 'success');
    recordStatusCode(200);

    return NextResponse.json({
      success: true,
      data: {
        records: costRecords,
        totalCost: Math.round(totalCost * 100) / 100,
        todayCost: Math.round(todayCost * 100) / 100,
        dailyLimit: costConfig.dailyLimit,
        remainingQuota: Math.max(0, costConfig.dailyLimit - todayCost)
      },
      meta: {
        request_id: requestId,
        trace_id: traceId,
        user_id: userId,
        timestamp: Date.now(),
        latency
      }
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const latency = Date.now() - startTime;
    
    logError(requestId, traceId, 'COST_QUERY_EXCEPTION', 'cost-control', 'EXCEPTION', 
      errorMessage, {}, {}, undefined, undefined, error instanceof Error ? error.stack : undefined, latency);
    
    recordRequest(startTime, 'failed', 'SERVER_ERROR');
    recordStatusCode(500);

    return NextResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      error: {
        type: 'ServerError',
        detail: errorMessage
      },
      meta: {
        request_id: requestId,
        trace_id: traceId,
        timestamp: Date.now(),
        latency
      }
    }, { status: 500 });
  }
}