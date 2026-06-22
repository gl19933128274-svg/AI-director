import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 时间范围类型
export type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

// 统计周期
export type Period = 'day' | 'week' | 'month';

// 用户统计
export interface UserStats {
  totalUsers: number;           // 总用户数
  newUsers: number;             // 新增用户数
  activeUsers: number;          // 活跃用户数
  retentionRate: number;        // 留存率
  memberDistribution: { level: string; count: number; percentage: number }[]; // 会员等级分布
}

// 生成任务统计
export interface GenerationStats {
  totalGenerations: number;     // 总生成次数
  successRate: number;          // 成功率
  avgDuration: number;          // 平均耗时（秒）
  durationDistribution: { range: string; count: number }[]; // 耗时分布
  typeDistribution: { type: string; count: number; percentage: number }[]; // 类型分布
}

// 收入统计
export interface RevenueStats {
  totalRevenue: number;         // 总收入
  subscriptionRevenue: number;  // 订阅收入
  orderCount: number;           // 订单数
  conversionRate: number;       // 转化率
  revenueByLevel: { level: string; revenue: number; percentage: number }[]; // 各等级收入
}

// 系统统计
export interface SystemStats {
  apiCalls: number;             // API调用次数
  errorRate: number;            // 错误率
  avgResponseTime: number;      // 平均响应时间（毫秒）
  queueStatus: { pending: number; processing: number; completed: number; failed: number };
}

// 数据统计服务
export const analyticsService = {
  // 获取时间范围
  getTimeRange(range: TimeRange, startDate?: Date, endDate?: Date): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (range) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
      default:
        if (!startDate || !endDate) {
          throw new Error('自定义时间范围需要提供起始和结束日期');
        }
        start = startDate;
        end = endDate;
    }

    return { start, end };
  },

  // 用户统计（SQLite版本）
  async getUserStats(timeRange: TimeRange, startDate?: Date, endDate?: Date): Promise<UserStats> {
    const { start, end } = this.getTimeRange(timeRange, startDate, endDate);

    // 总用户数
    const totalUsers = await prisma.user.count();

    // 新增用户数
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    // 活跃用户（有生成记录）- SQLite不支持distinct，用findMany替代
    const activeUserIds = await prisma.generationTask.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { userId: true },
    });
    const activeUsers = new Set(activeUserIds.filter(u => u.userId).map(u => u.userId)).size;

    // 留存率（7日留存）- SQLite不支持distinct
    const retentionDate = new Date(start);
    retentionDate.setDate(retentionDate.getDate() - 7);
    const users7DaysAgo = await prisma.user.count({
      where: { createdAt: { gte: retentionDate, lte: start } },
    });
    
    let retainedUsers = 0;
    if (users7DaysAgo > 0) {
      const users7DaysAgoList = await prisma.user.findMany({
        where: { createdAt: { gte: retentionDate, lte: start } },
        select: { id: true },
      });
      const userIds7DaysAgo = users7DaysAgoList.map(u => u.id);
      
      const retainedUserIds = await prisma.generationTask.findMany({
        where: {
          userId: { in: userIds7DaysAgo },
          createdAt: { gte: start, lte: end },
        },
        select: { userId: true },
      });
      retainedUsers = new Set(retainedUserIds.filter(u => u.userId).map(u => u.userId)).size;
    }
    const retentionRate = users7DaysAgo > 0 ? (retainedUsers / users7DaysAgo) * 100 : 0;

    // 会员等级分布
    const memberDistribution = await prisma.user.groupBy({
      by: ['memberLevel'],
      _count: { memberLevel: true },
    });
    const memberStats = memberDistribution.map(item => ({
      level: item.memberLevel,
      count: item._count.memberLevel,
      percentage: totalUsers > 0 ? (item._count.memberLevel / totalUsers) * 100 : 0,
    }));

    return {
      totalUsers,
      newUsers,
      activeUsers,
      retentionRate: Math.round(retentionRate * 100) / 100,
      memberDistribution: memberStats,
    };
  },

  // 生成任务统计
  async getGenerationStats(timeRange: TimeRange, startDate?: Date, endDate?: Date): Promise<GenerationStats> {
    const { start, end } = this.getTimeRange(timeRange, startDate, endDate);

    // 总生成次数
    const totalGenerations = await prisma.generationTask.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    // 成功次数
    const successCount = await prisma.generationTask.count({
      where: { createdAt: { gte: start, lte: end }, status: 'completed' },
    });

    // 成功率
    const successRate = totalGenerations > 0 ? (successCount / totalGenerations) * 100 : 0;

    // 平均耗时（需要实际记录耗时）
    const avgDuration = 0; // 实际实现需要记录任务耗时

    // 耗时分布（模拟数据）
    const durationDistribution = [
      { range: '0-10秒', count: Math.floor(totalGenerations * 0.4) },
      { range: '10-30秒', count: Math.floor(totalGenerations * 0.35) },
      { range: '30-60秒', count: Math.floor(totalGenerations * 0.15) },
      { range: '60秒以上', count: Math.floor(totalGenerations * 0.1) },
    ];

    // 类型分布
    const typeDistribution = await prisma.generationTask.groupBy({
      by: ['type'],
      _count: { type: true },
    });
    const typeStats = typeDistribution.map(item => ({
      type: item.type,
      count: item._count.type,
      percentage: totalGenerations > 0 ? (item._count.type / totalGenerations) * 100 : 0,
    }));

    return {
      totalGenerations,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration,
      durationDistribution,
      typeDistribution: typeStats,
    };
  },

  // 收入统计（SQLite版本，Order模型不存在）
  async getRevenueStats(timeRange: TimeRange, startDate?: Date, endDate?: Date): Promise<RevenueStats> {
    // SQLite版本没有Order模型，返回空数据
    return {
      totalRevenue: 0,
      subscriptionRevenue: 0,
      orderCount: 0,
      conversionRate: 0,
      revenueByLevel: [],
    };
  },

  // 系统统计
  async getSystemStats(timeRange: TimeRange, startDate?: Date, endDate?: Date): Promise<SystemStats> {
    const { start, end } = this.getTimeRange(timeRange, startDate, endDate);

    // API调用次数（需要日志记录）
    const apiCalls = 0; // 实际实现需要API日志

    // 错误率
    const errorRate = 0; // 实际实现需要错误日志

    // 平均响应时间
    const avgResponseTime = 0; // 实际实现需要监控数据

    // 队列状态
    const queueStatus = {
      pending: await prisma.generationTask.count({ where: { status: 'pending' } }),
      processing: await prisma.generationTask.count({ where: { status: 'processing' } }),
      completed: await prisma.generationTask.count({ where: { status: 'completed' } }),
      failed: await prisma.generationTask.count({ where: { status: 'failed' } }),
    };

    return {
      apiCalls,
      errorRate,
      avgResponseTime,
      queueStatus,
    };
  },

  // 获取仪表盘概览
  async getDashboardOverview(timeRange: TimeRange = 'week'): Promise<{
    users: UserStats;
    generation: GenerationStats;
    revenue: RevenueStats;
    system: SystemStats;
  }> {
    const [users, generation, revenue, system] = await Promise.all([
      this.getUserStats(timeRange),
      this.getGenerationStats(timeRange),
      this.getRevenueStats(timeRange),
      this.getSystemStats(timeRange),
    ]);

    return { users, generation, revenue, system };
  },

  // 获取趋势数据
  async getTrendData(metric: string, period: Period, days: number = 30): Promise<{ date: string; value: number }[]> {
    const result: { date: string; value: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      let value = 0;

      switch (metric) {
        case 'newUsers':
          value = await prisma.user.count({
            where: {
              createdAt: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
          });
          break;
        case 'generations':
          value = await prisma.generationTask.count({
            where: {
              createdAt: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
          });
          break;
        case 'revenue':
          const orders = await prisma.order.findMany({
            where: {
              createdAt: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
              },
              status: 'paid',
            },
          });
          value = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
          break;
        case 'activeUsers':
          value = await prisma.generationTask.count({
            where: {
              createdAt: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
            distinct: ['userId'],
          });
          break;
      }

      result.push({
        date: date.toISOString().split('T')[0],
        value,
      });
    }

    return result;
  },
};

export default analyticsService;