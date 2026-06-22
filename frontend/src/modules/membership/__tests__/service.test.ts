import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient, MemberLevel } from '@prisma/client';
import { membershipService } from '../service';
import { ValidationError, PermissionError } from '../errors';

const prisma = new PrismaClient();

describe('Membership Service', () => {
  beforeEach(async () => {
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('getMembershipConfig', () => {
    it('should return all membership configs', () => {
      const config = membershipService.getMembershipConfig();
      expect(Object.keys(config).length).toBe(3);
      expect(config.free).toHaveProperty('name');
      expect(config.pro).toHaveProperty('monthlyPrice');
      expect(config.studio).toHaveProperty('features');
    });

    it('should return specific level config', () => {
      const config = membershipService.getMembershipConfig('pro');
      expect(config).toHaveProperty('name', 'Pro版');
      expect(config).toHaveProperty('monthlyPrice', 29);
    });
  });

  describe('getUserMembership', () => {
    it('should get user membership level', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'pro',
        },
      });

      const level = await membershipService.getUserMembership(user.id);
      expect(level).toBe('pro');

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('checkPermission', () => {
    it('should return true if user has permission', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'pro',
        },
      });

      const hasPermission = await membershipService.checkPermission(user.id, 'free');
      expect(hasPermission).toBe(true);

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return false if user does not have permission', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const hasPermission = await membershipService.checkPermission(user.id, 'pro');
      expect(hasPermission).toBe(false);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('subscribe', () => {
    it('should create subscription for pro level', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const subscription = await membershipService.subscribe({
        userId: user.id,
        level: 'pro',
        period: 'monthly',
      });

      expect(subscription.userId).toBe(user.id);
      expect(subscription.level).toBe('pro');
      expect(subscription.status).toBe('pending');

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should activate free subscription immediately', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const subscription = await membershipService.subscribe({
        userId: user.id,
        level: 'free',
        period: 'monthly',
      });

      expect(subscription.status).toBe('active');

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.memberLevel).toBe('free');

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should throw error for invalid level', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      await expect(membershipService.subscribe({
        userId: user.id,
        level: 'invalid' as MemberLevel,
        period: 'monthly',
      })).rejects.toThrow(ValidationError);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('activateSubscription', () => {
    it('should activate pending subscription', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          level: 'pro',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'pending',
        },
      });

      const activated = await membershipService.activateSubscription(subscription.id);

      expect(activated.status).toBe('active');

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.memberLevel).toBe('pro');

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'pro',
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          level: 'pro',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
      });

      await membershipService.cancelSubscription(user.id, subscription.id);

      const updated = await prisma.subscription.findUnique({ where: { id: subscription.id } });
      expect(updated?.status).toBe('cancelled');

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should throw error for free subscription', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      await expect(membershipService.cancelSubscription(user.id)).rejects.toThrow(PermissionError);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('checkDailyLimit', () => {
    it('should return daily limit info', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const limit = await membershipService.checkDailyLimit(user.id);
      expect(limit.limit).toBe(5);
      expect(limit.remaining).toBe(5);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});