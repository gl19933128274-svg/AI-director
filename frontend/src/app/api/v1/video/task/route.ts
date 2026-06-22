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

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const startTime = Date.now();
  
  try {
    const userId = await authenticate(request);
    
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('task_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    logInfo(requestId, traceId, 'TASK_QUERY_START', 'task-service', 'started', {
      userId,
      taskId: !!taskId,
      status,
      page,
      limit
    }, {}, undefined, userId);

    let tasks;
    
    if (taskId) {
      tasks = await prisma.task.findUnique({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              tier: true
            }
          }
        }
      });

      if (!tasks) {
        logError(requestId, traceId, 'TASK_QUERY_NOT_FOUND', 'task-service', 'NOT_FOUND', 
          `Task ${taskId} not found`, { taskId }, {}, taskId, userId);
        
        recordRequest(startTime, 'failed', 'NOT_FOUND');
        recordStatusCode(404);
        
        return NextResponse.json({
          success: false,
          code: 404,
          message: '任务不存在',
          error: {
            type: 'TaskNotFound',
            detail: `未找到任务 ${taskId}`
          },
          meta: {
            request_id: requestId,
            trace_id: traceId,
            user_id: userId,
            timestamp: Date.now()
          }
        }, { status: 404 });
      }
    } else {
      const where: Record<string, unknown> = { userId };
      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.task.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                tier: true
              }
            }
          }
        }),
        prisma.task.count({ where })
      ]);

      tasks = {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    }

    const latency = Date.now() - startTime;
    logInfo(requestId, traceId, 'TASK_QUERY_SUCCESS', 'task-service', 'success', {
      resultCount: Array.isArray(tasks?.items) ? tasks.items.length : tasks ? 1 : 0
    }, { tasks }, undefined, userId, latency);

    recordRequest(startTime, 'success');
    recordStatusCode(200);

    return NextResponse.json({
      success: true,
      data: tasks,
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
    
    logError(requestId, traceId, 'TASK_QUERY_EXCEPTION', 'task-service', 'EXCEPTION', 
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