import { PrismaClient } from '@prisma/client';
import { UserError } from './errors';

const prisma = new PrismaClient();

// 收藏服务
export const favoriteService = {
  // 添加收藏
  async add(userId: string, workId: string): Promise<void> {
    // 检查作品是否存在
    const work = await prisma.work.findUnique({ where: { id: workId } });
    if (!work) {
      throw new UserError('作品不存在', 404, 'workId');
    }

    // 检查是否已收藏
    const existing = await prisma.favorite.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    if (existing) {
      throw new UserError('已收藏该作品', 409, 'workId');
    }

    await prisma.favorite.create({
      data: { userId, workId },
    });
  },

  // 取消收藏
  async remove(userId: string, workId: string): Promise<void> {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    if (!favorite) {
      throw new UserError('未收藏该作品', 404, 'workId');
    }

    await prisma.favorite.delete({
      where: { userId_workId: { userId, workId } },
    });
  },

  // 获取用户收藏列表
  async getUserFavorites(userId: string, page: number = 1, limit: number = 20): Promise<{ works: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          work: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const works = favorites.map(f => f.work);

    return { works, total };
  },

  // 检查是否收藏
  async isFavorite(userId: string, workId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    return !!favorite;
  },

  // 获取作品收藏数
  async getWorkFavoriteCount(workId: string): Promise<number> {
    return prisma.favorite.count({ where: { workId } });
  },
};

export default favoriteService;