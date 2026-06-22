import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { analyticsService } from '../service';

const prisma = new PrismaClient();

describe('Analytics Service', () => {
  beforeEach(async () => {
    await prisma.generationTask.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    await prisma.generationTask.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('getTimeRange', () => {
    it('should return today range', () => {
      const { start, end } = analyticsService.getTimeRange('today');
      const now = new Date();
      
      expect(start.getDate()).toBe(now.getDate());
      expect(start.getHours()).toBe(0);
    });

    it('should return week range', () => {
      const { start, end } = analyticsService.getTimeRange('week');
      const expectedStart = new Date();
      expectedStart.setDate(expectedStart.getDate() - 7);
      
      expect(start.getDate()).toBe(expectedStart.getDate());
    });

    it('should return month range', () => {
      const { start, end } = analyticsService.getTimeRange('month');
      const expectedStart = new Date();
      expectedStart.setMonth(expectedStart.getMonth() - 1);
      
      expect(start.getMonth()).toBe(expectedStart.getMonth());
    });
  });

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      // 创建测试用户
      await prisma.user.create({
        data: {
          email: 'test1@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户1',
          memberLevel: 'free',
        },
      });
      await prisma.user.create({
        data: {
          email: 'test2@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户2',
          memberLevel: 'pro',
        },
      });

      const stats = await analyticsService.getUserStats('today');

      expect(stats.totalUsers).toBe(2);
      expect(stats.newUsers).toBe(2);
      expect(stats.memberDistribution.length).toBeGreaterThan(0);
    });
  });

  describe('getGenerationStats', () => {
    it('should return generation stats', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      // 创建生成任务
      await prisma.generationTask.create({
        data: {
          userId: user.id,
          type: 'storyboard',
          status: 'completed',
          input: { prompt: '测试' } as any,
        },
      });
      await prisma.generationTask.create({
        data: {
          userId: user.id,
          type: 'video',
          status: 'completed',
          input: { storyboardId: 'test' } as any,
        },
      });

      const stats = await analyticsService.getGenerationStats('today');

      expect(stats.totalGenerations).toBe(2);
      expect(stats.successRate).toBe(100);
      expect(stats.typeDistribution.length).toBe(2);
    });
  });

  describe('getRevenueStats', () => {
    it('should return revenue stats', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      // 创建订单
      await prisma.order.create({
        data: {
          userId: user.id,
          type: 'subscription',
          level: 'pro',
          period: 'monthly',
          amount: 29,
          status: 'paid',
        },
      });

      const stats = await analyticsService.getRevenueStats('today');

      expect(stats.totalRevenue).toBe(29);
      expect(stats.subscriptionRevenue).toBe(29);
      expect(stats.orderCount).toBe(1);
    });
  });

  describe('getSystemStats', () => {
    it('should return system stats', async () => {
      const stats = await analyticsService.getSystemStats('today');

      expect(stats.queueStatus).toHaveProperty('pending');
      expect(stats.queueStatus).toHaveProperty('processing');
      expect(stats.queueStatus).toHaveProperty('completed');
      expect(stats.queueStatus).toHaveProperty('failed');
    });
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview', async () => {
      const overview = await analyticsService.getDashboardOverview('today');

      expect(overview).toHaveProperty('users');
      expect(overview).toHaveProperty('generation');
      expect(overview).toHaveProperty('revenue');
      expect(overview).toHaveProperty('system');
    });
  });

  describe('getTrendData', () => {
    it('should return trend data for newUsers', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      const trend = await analyticsService.getTrendData('newUsers', 'day', 7);

      expect(trend.length).toBe(7);
      expect(trend[trend.length - 1].value).toBe(1);
    });

    it('should return trend data for generations', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      await prisma.generationTask.create({
        data: {
          userId: user.id,
          type: 'storyboard',
          status: 'completed',
          input: { prompt: '测试' } as any,
        },
      });

      const trend = await analyticsService.getTrendData('generations', 'day', 7);

      expect(trend.length).toBe(7);
      expect(trend[trend.length - 1].value).toBe(1);
    });

    it('should return trend data for revenue', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      await prisma.order.create({
        data: {
          userId: user.id,
          type: 'subscription',
          level: 'pro',
          amount: 29,
          status: 'paid',
        },
      });

      const trend = await analyticsService.getTrendData('revenue', 'day', 7);

      expect(trend.length).toBe(7);
      expect(trend[trend.length - 1].value).toBe(29);
    });
  });
});