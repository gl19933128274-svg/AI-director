import { PrismaClient, MemberLevel, Subscription } from '@prisma/client';
import { MembershipError, ValidationError, PermissionError } from './errors';

const prisma = new PrismaClient();

// 会员等级配置
export const MEMBERSHIP_CONFIG: Record<MemberLevel, {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  maxVideoQuality: string;
  dailyLimit: number;
}> = {
  free: {
    name: '免费版',
    description: '体验基础功能',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['基础分镜生成', '720p视频生成', '基础模板', '每日5次生成'],
    maxVideoQuality: '720p',
    dailyLimit: 5,
  },
  pro: {
    name: 'Pro版',
    description: '专业创作能力',
    monthlyPrice: 29,
    yearlyPrice: 299,
    features: ['高级分镜生成', '1080p视频生成', '全部模板', '每日50次生成', '优先队列'],
    maxVideoQuality: '1080p',
    dailyLimit: 50,
  },
  studio: {
    name: 'Studio版',
    description: '商业级创作能力',
    monthlyPrice: 99,
    yearlyPrice: 999,
    features: ['AI导演增强', '4K视频生成', '全部模板', '无限生成', '批量生成', '专属客服'],
    maxVideoQuality: '4k',
    dailyLimit: 999,
  },
};

// 订阅周期
export type SubscriptionPeriod = 'monthly' | 'yearly';

// 订阅请求
export interface SubscribeRequest {
  userId: string;
  level: MemberLevel;
  period: SubscriptionPeriod;
  paymentMethod?: string;
}

// 订单状态
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

// 订单类型
export type OrderType = 'subscription' | 'one_time';

// 会员服务
export const membershipService = {
  // 获取会员配置
  getMembershipConfig(level?: MemberLevel): Record<MemberLevel, typeof MEMBERSHIP_CONFIG[MemberLevel]> | typeof MEMBERSHIP_CONFIG[MemberLevel] {
    if (level) {
      return MEMBERSHIP_CONFIG[level];
    }
    return MEMBERSHIP_CONFIG;
  },

  // 获取用户当前会员等级
  async getUserMembership(userId: string): Promise<MemberLevel> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new MembershipError('用户不存在', 404);
    }
    return user.memberLevel;
  },

  // 检查用户是否有权限
  async checkPermission(userId: string, requiredLevel: MemberLevel): Promise<boolean> {
    const userLevel = await this.getUserMembership(userId);
    const levelOrder: Record<MemberLevel, number> = {
      free: 1,
      pro: 2,
      studio: 3,
    };
    return levelOrder[userLevel] >= levelOrder[requiredLevel];
  },

  // 创建订阅
  async subscribe(request: SubscribeRequest): Promise<Subscription> {
    const { userId, level, period } = request;

    // 验证会员等级
    if (!Object.keys(MEMBERSHIP_CONFIG).includes(level)) {
      throw new ValidationError('无效的会员等级', 'level');
    }

    // 检查用户是否已订阅相同等级
    const currentSubscription = await prisma.subscription.findFirst({
      where: { userId, level, status: 'active' },
    });

    if (currentSubscription) {
      throw new MembershipError('您已订阅此会员等级', 409);
    }

    // 计算订阅时长
    const startDate = new Date();
    let endDate: Date | null = null;

    if (level !== 'free') {
      endDate = new Date(startDate);
      if (period === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
    }

    // 创建订阅记录
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        level,
        startDate,
        endDate,
        status: level === 'free' ? 'active' : 'pending',
        paymentMethod: request.paymentMethod,
      },
    });

    // 如果是免费版，直接升级用户等级
    if (level === 'free') {
      await prisma.user.update({
        where: { id: userId },
        data: { memberLevel: level },
      });
    }

    return subscription;
  },

  // 激活订阅（支付成功后）
  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new MembershipError('订阅不存在', 404);
    }

    if (subscription.status !== 'pending') {
      throw new MembershipError('订阅状态不正确', 400);
    }

    // 更新订阅状态
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'active' },
    });

    // 更新用户会员等级
    await prisma.user.update({
      where: { id: subscription.userId },
      data: { memberLevel: subscription.level },
    });

    return updated;
  },

  // 取消订阅
  async cancelSubscription(userId: string, subscriptionId?: string): Promise<void> {
    const where: any = { userId, status: 'active' };
    if (subscriptionId) {
      where.id = subscriptionId;
    }

    const subscription = await prisma.subscription.findFirst({ where });
    if (!subscription) {
      throw new MembershipError('未找到活跃订阅', 404);
    }

    // 如果是免费版，不能取消
    if (subscription.level === 'free') {
      throw new PermissionError('免费版无法取消');
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    // 如果当前订阅到期，降级为免费版
    if (new Date() > (subscription.endDate || new Date())) {
      await prisma.user.update({
        where: { id: userId },
        data: { memberLevel: 'free' },
      });
    }
  },

  // 获取用户订阅记录
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // 获取当前活跃订阅
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  },

  // 检查每日生成限制
  async checkDailyLimit(userId: string): Promise<{ remaining: number; limit: number }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new MembershipError('用户不存在', 404);
    }

    const config = MEMBERSHIP_CONFIG[user.memberLevel];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 统计今日生成次数（这里需要根据实际的生成记录来统计）
    const todayCount = await prisma.generationTask.count({
      where: {
        userId,
        createdAt: { gte: today },
        type: 'video',
        status: 'completed',
      },
    });

    return {
      remaining: Math.max(0, config.dailyLimit - todayCount),
      limit: config.dailyLimit,
    };
  },

  // 续费订阅
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new MembershipError('订阅不存在', 404);
    }

    // 计算新的结束日期
    const currentEndDate = subscription.endDate || new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endDate: newEndDate },
    });
  },
};

export default membershipService;