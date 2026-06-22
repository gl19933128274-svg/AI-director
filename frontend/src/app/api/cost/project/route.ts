import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateRequestId, logInfo } from '@/services/logger';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const userId = searchParams.get('user_id');

  logInfo(requestId, 'COST_PROJECT_REQUEST', 'cost-control', 'started', {
    projectId,
    userId
  });

  try {
    const tasks = await prisma.generationTask.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(userId && { userId })
      },
      select: {
        id: true,
        type: true,
        status: true,
        estimatedCost: true,
        createdAt: true,
        userId: true,
        projectId: true
      }
    });

    const totalCost = tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
    const successCount = tasks.filter(t => t.status === 'completed').length;
    const failedCount = tasks.filter(t => t.status === 'failed').length;

    const typeDistribution: Record<string, { count: number; cost: number }> = {};
    for (const task of tasks) {
      if (!typeDistribution[task.type]) {
        typeDistribution[task.type] = { count: 0, cost: 0 };
      }
      typeDistribution[task.type].count += 1;
      typeDistribution[task.type].cost += task.estimatedCost || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          project_id: projectId,
          user_id: userId,
          total_cost: totalCost,
          total_tasks: tasks.length,
          success_count: successCount,
          failed_count: failedCount,
          type_distribution: typeDistribution,
          tasks: tasks.slice(0, 50)
        },
        request_id: requestId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'COST_PROJECT_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}