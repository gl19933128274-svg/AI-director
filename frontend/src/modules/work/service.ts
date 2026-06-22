import { PrismaClient, Work } from '@prisma/client';
import { UserError, ValidationError, PermissionError } from './errors';

const prisma = new PrismaClient();

// 作品状态类型
export type WorkStatus = 'draft' | 'generating' | 'completed' | 'published' | 'deleted';

// 作品可见性类型
export type WorkVisibility = 'public' | 'private' | 'unlisted';

// 作品DTO
export interface CreateWorkDto {
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  visibility?: WorkVisibility;
  tags?: string[];
}

export interface UpdateWorkDto {
  title?: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  visibility?: WorkVisibility;
  tags?: string[];
  status?: WorkStatus;
}

export interface WorkQuery {
  userId?: string;
  status?: WorkStatus;
  visibility?: WorkVisibility;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkWithUser extends Work {
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

// 作品服务
export const workService = {
  // 创建作品
  async create(userId: string, dto: CreateWorkDto): Promise<Work> {
    // 验证标题
    if (!dto.title || dto.title.length < 2) {
      throw new ValidationError('标题至少需要2个字符', 'title');
    }

    // 验证标签数量
    if (dto.tags && dto.tags.length > 10) {
      throw new ValidationError('标签数量不能超过10个', 'tags');
    }

    return prisma.work.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        thumbnail: dto.thumbnail,
        videoUrl: dto.videoUrl,
        visibility: (dto.visibility || 'private') as string,
        tags: JSON.stringify(dto.tags || []),
        status: (dto.videoUrl ? 'completed' : 'draft') as string,
      },
    });
  },

  // 根据ID获取作品
  async getById(id: string): Promise<WorkWithUser | null> {
    return prisma.work.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });
  },

  // 获取用户作品列表
  async getUserWorks(userId: string, query?: WorkQuery): Promise<{ works: Work[]; total: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      status: query?.status as string,
      visibility: query?.visibility as string,
    };

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query?.sortBy || 'createdAt']: query?.sortOrder || 'desc',
        },
      }),
      prisma.work.count({ where }),
    ]);

    return { works, total };
  },

  // 获取公开作品列表（作品广场）
  async getPublicWorks(query?: WorkQuery): Promise<{ works: WorkWithUser[]; total: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      visibility: 'public',
      status: 'completed',
    };

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query?.sortBy || 'createdAt']: query?.sortOrder || 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.work.count({ where }),
    ]);

    return { works, total };
  },

  // 更新作品
  async update(userId: string, workId: string, dto: UpdateWorkDto): Promise<Work> {
    // 检查作品是否存在
    const work = await prisma.work.findUnique({ where: { id: workId } });
    if (!work) {
      throw new UserError('作品不存在', 404, 'id');
    }

    // 检查权限
    if (work.userId !== userId) {
      throw new PermissionError('无权修改该作品');
    }

    // 处理 tags 字段
    const updateData: any = { ...dto };
    if (dto.tags !== undefined) {
      updateData.tags = JSON.stringify(dto.tags);
    }
    if (dto.visibility !== undefined) {
      updateData.visibility = dto.visibility as string;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status as string;
    }

    return prisma.work.update({
      where: { id: workId },
      data: updateData,
    });
  },

  // 删除作品（软删除）
  async delete(userId: string, workId: string): Promise<void> {
    const work = await prisma.work.findUnique({ where: { id: workId } });
    if (!work) {
      throw new UserError('作品不存在', 404, 'id');
    }

    if (work.userId !== userId) {
      throw new PermissionError('无权删除该作品');
    }

    await prisma.work.update({
      where: { id: workId },
      data: { status: 'deleted' },
    });
  },

  // 发布作品
  async publish(userId: string, workId: string): Promise<Work> {
    const work = await prisma.work.findUnique({ where: { id: workId } });
    if (!work) {
      throw new UserError('作品不存在', 404, 'id');
    }

    if (work.userId !== userId) {
      throw new PermissionError('无权发布该作品');
    }

    if (!work.videoUrl) {
      throw new ValidationError('作品还未生成完成', 'videoUrl');
    }

    return prisma.work.update({
      where: { id: workId },
      data: {
        status: 'published',
        visibility: 'public',
      },
    });
  },

  // 搜索作品
  async search(query: string, page: number = 1, limit: number = 20): Promise<{ works: WorkWithUser[]; total: number }> {
    const skip = (page - 1) * limit;

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
          visibility: 'public',
          status: 'completed',
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.work.count({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
          visibility: 'public',
          status: 'completed',
        },
      }),
    ]);

    return { works, total };
  },

  // 获取热门标签（SQLite版本）
  async getPopularTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
    // SQLite 不支持 aggregateRaw，返回空数组
    return [];
  },
};

export default workService;