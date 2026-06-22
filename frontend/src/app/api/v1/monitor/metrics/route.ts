import { NextRequest, NextResponse } from 'next/server';
import {
  generateRequestId,
  generateTraceId,
  logInfo,
  getMetrics,
  getErrorStats,
  recordRequest,
  recordStatusCode
} from '@/services/logger';
import { getReleaseStatus } from '@/services/releaseControl';
import { getCostConfig } from '@/services/costControl';
import { authenticate } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const startTime = Date.now();
  
  try {
    const userId = await authenticate(request);
    
    logInfo(requestId, traceId, 'MONITOR_METRICS', 'monitoring', 'started', { userId }, {}, undefined, userId);

    const metrics = getMetrics();
    const errorStats = getErrorStats();
    const releaseStatus = getReleaseStatus();
    const costConfig = getCostConfig();

    const latency = Date.now() - startTime;
    
    recordRequest(startTime, 'success');
    recordStatusCode(200);

    return NextResponse.json({
      success: true,
      data: {
        requestMetrics: {
          totalRequests: metrics.totalRequests,
          successRequests: metrics.successRequests,
          failedRequests: metrics.failedRequests,
          successRate: metrics.requestSuccessRate,
          avgLatency: metrics.avgLatency,
          p95Latency: metrics.p95Latency,
          p99Latency: metrics.p99Latency
        },
        aiMetrics: {
          totalCalls: metrics.totalAiCalls,
          successRate: metrics.aiSuccessRate
        },
        errorDistribution: metrics.errorDistribution,
        statusCodeDistribution: metrics.statusCodeDistribution,
        errorStats,
        releaseStatus,
        costConfig
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