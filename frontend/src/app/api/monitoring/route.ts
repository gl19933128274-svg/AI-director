import { NextRequest } from 'next/server';
import {
  getMetrics,
  getErrorStats,
  exportLogs,
  resetMetrics,
  generateRequestId,
  logInfo
} from '@/services/logger';
import { getCostStats } from '@/services/costControl';
import { getReleaseStatus } from '@/services/releaseControl';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  logInfo(requestId, 'MONITORING_REQUEST', 'monitoring', 'started', { action });

  try {
    switch (action) {
      case 'metrics': {
        const metrics = getMetrics();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: metrics,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'errors': {
        const errorStats = getErrorStats();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: errorStats,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'logs': {
        const logs = exportLogs();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: logs,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'cost': {
        const costStats = getCostStats(7);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: costStats,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'release': {
        const releaseStatus = getReleaseStatus();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: releaseStatus,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'overview': {
        const [metrics, errorStats, costStats, releaseStatus] = await Promise.all([
          getMetrics(),
          getErrorStats(),
          getCostStats(7),
          getReleaseStatus()
        ]);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              metrics,
              errors: errorStats,
              costs: costStats,
              release: releaseStatus
            },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      default: {
        const metrics = getMetrics();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: metrics,
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'MONITORING_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { action } = body;

    logInfo(requestId, 'MONITORING_POST_REQUEST', 'monitoring', 'started', { action });

    switch (action) {
      case 'reset_metrics': {
        resetMetrics();
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Metrics reset successfully',
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INVALID_ACTION', message: 'Unknown action' },
            request_id: requestId
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'MONITORING_POST_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}