import { PrismaClient, MemberLevel, Order } from '@prisma/client';
import { OrderError, ValidationError } from './errors';
import { membershipService, SubscriptionPeriod } from './service';

const prisma = new PrismaClient();

// 订单状态
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

// 订单类型
export type OrderType = 'subscription' | 'one_time';

// 创建订单请求
export interface CreateOrderRequest {
  userId: string;
  type: OrderType;
  level?: MemberLevel;
  period?: SubscriptionPeriod;
  amount: number;
  currency?: string;
  description?: string;
}

// 支付回调请求
export interface PaymentCallbackRequest {
  orderId: string;
  transactionId: string;
  status: 'success' | 'failed';
  paidAmount?: number;
  paidAt?: Date;
}

// 订单服务
export const orderService = {
  // 创建订单
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const { userId, type, level, period, amount } = request;

    // 验证订单类型
    if (type === 'subscription' && (!level || !period)) {
      throw new ValidationError('订阅订单需要指定会员等级和周期', 'level');
    }

    // 验证金额
    if (amount <= 0) {
      throw new ValidationError('订单金额必须大于0', 'amount');
    }

    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId,
        type,
        level,
        period,
        amount,
        currency: request.currency || 'CNY',
        status: 'pending',
        description: request.description || this.generateDescription(type, level, period),
      },
    });

    return order;
  },

  // 生成订单描述
  generateDescription(type: OrderType, level?: MemberLevel, period?: SubscriptionPeriod): string {
    if (type === 'subscription' && level && period) {
      const levelName = {
        free: '免费版',
        pro: 'Pro版',
        studio: 'Studio版',
      }[level];
      const periodName = period === 'monthly' ? '月度' : '年度';
      return `${levelName}${periodName}订阅`;
    }
    return '订单';
  },

  // 获取订单详情
  async getOrder(orderId: string): Promise<Order | null> {
    return prisma.order.findUnique({ where: { id: orderId } });
  },

  // 获取用户订单列表
  async getUserOrders(userId: string, status?: OrderStatus): Promise<Order[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  // 更新订单状态
  async updateOrder(orderId: string, updates: Partial<Pick<Order, 'status' | 'transactionId' | 'paidAmount' | 'paidAt'>>): Promise<Order> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updates,
    });
    return order;
  },

  // 支付回调处理
  async handlePaymentCallback(request: PaymentCallbackRequest): Promise<Order> {
    const { orderId, transactionId, status, paidAmount, paidAt } = request;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderError('订单不存在', 404);
    }

    if (order.status !== 'pending') {
      throw new OrderError('订单状态不正确', 400);
    }

    if (status === 'success') {
      // 更新订单状态为已支付
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          transactionId,
          paidAmount: paidAmount || order.amount,
          paidAt: paidAt || new Date(),
        },
      });

      // 如果是订阅订单，创建订阅并激活
      if (order.type === 'subscription' && order.level) {
        await membershipService.subscribe({
          userId: order.userId,
          level: order.level,
          period: order.period || 'monthly',
        });

        // 找到刚创建的订阅并激活
        const subscriptions = await membershipService.getUserSubscriptions(order.userId);
        const pendingSubscription = subscriptions.find(s => s.status === 'pending' && s.level === order.level);
        if (pendingSubscription) {
          await membershipService.activateSubscription(pendingSubscription.id);
        }
      }

      return updatedOrder;
    } else {
      // 更新订单状态为失败
      return prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          transactionId,
        },
      });
    }
  },

  // 取消订单
  async cancelOrder(orderId: string): Promise<Order> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderError('订单不存在', 404);
    }

    if (order.status !== 'pending') {
      throw new OrderError('订单状态不正确', 400);
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });
  },

  // 退款
  async refundOrder(orderId: string, refundAmount?: number): Promise<Order> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderError('订单不存在', 404);
    }

    if (order.status !== 'paid') {
      throw new OrderError('订单未支付，无法退款', 400);
    }

    // 如果是订阅订单，取消订阅
    if (order.type === 'subscription' && order.level) {
      await membershipService.cancelSubscription(order.userId);
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'refunded',
        refundAmount: refundAmount || order.amount,
      },
    });
  },

  // 计算订阅价格
  calculateSubscriptionPrice(level: MemberLevel, period: SubscriptionPeriod): number {
    const config = membershipService.getMembershipConfig(level) as any;
    return period === 'monthly' ? config.monthlyPrice : config.yearlyPrice;
  },
};

export default orderService;