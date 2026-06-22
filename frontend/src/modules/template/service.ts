import { PrismaClient, Template, MemberLevel } from '@prisma/client';
import { TemplateError, ValidationError, PermissionError } from './errors';

const prisma = new PrismaClient();

// 模板配置类型
export interface TemplateConfig {
  // 场景设置
  scene?: {
    style: string;        // 风格：写实/动画/漫画等
    aspectRatio: string;   // 宽高比：16:9 / 9:16 / 4:3
    duration?: number;     // 时长（秒）
  };
  
  // 镜头配置
  shots?: Array<{
    type: string;         // 镜头类型：全景/中景/特写等
    duration: number;     // 镜头时长
    cameraMovement?: string; // 运镜方式：推/拉/摇/移
    lighting?: string;    // 光影风格：明亮/暗调/对比强烈
  }>;
  
  // AI参数
  ai?: {
    model?: string;       // 使用的模型
    stylePreset?: string; // 风格预设
    quality?: 'low' | 'medium' | 'high' | 'ultra';
  };
  
  // 音乐配置
  music?: {
    genre?: string;       // 音乐类型
    mood?: string;        // 情绪：欢快/悲伤/紧张等
    volume?: number;      // 音量
  };
}

// 模板DTO
export interface CreateTemplateDto {
  name: string;
  description?: string;
  thumbnail?: string;
  config: TemplateConfig;
  requiredLevel?: MemberLevel;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  thumbnail?: string;
  config?: TemplateConfig;
  requiredLevel?: MemberLevel;
}

// 模板服务
export const templateService = {
  // 创建模板
  async create(dto: CreateTemplateDto): Promise<Template> {
    // 验证名称
    if (!dto.name || dto.name.length < 2) {
      throw new ValidationError('模板名称至少需要2个字符', 'name');
    }

    // 验证配置
    if (!dto.config || typeof dto.config !== 'object') {
      throw new ValidationError('模板配置必须是有效的JSON对象', 'config');
    }

    return prisma.template.create({
      data: {
        name: dto.name,
        description: dto.description,
        thumbnail: dto.thumbnail,
        config: dto.config as any,
        requiredLevel: dto.requiredLevel || 'free',
      },
    });
  },

  // 根据ID获取模板
  async getById(id: string): Promise<Template | null> {
    return prisma.template.findUnique({ where: { id } });
  },

  // 获取模板列表
  async getTemplates(query?: {
    requiredLevel?: MemberLevel;
    page?: number;
    limit?: number;
  }): Promise<{ templates: Template[]; total: number }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.requiredLevel) {
      where.requiredLevel = query.requiredLevel;
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.template.count({ where }),
    ]);

    return { templates, total };
  },

  // 更新模板
  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new TemplateError('模板不存在', 404, 'id');
    }

    return prisma.template.update({
      where: { id },
      data: dto,
    });
  },

  // 删除模板
  async delete(id: string): Promise<void> {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new TemplateError('模板不存在', 404, 'id');
    }

    await prisma.template.delete({ where: { id } });
  },

  // 检查用户是否有权限使用模板
  async checkAccess(userId: string, templateId: string): Promise<boolean> {
    const [user, template] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.template.findUnique({ where: { id: templateId } }),
    ]);

    if (!user || !template) {
      return false;
    }

    const levelOrder: Record<MemberLevel, number> = {
      free: 1,
      pro: 2,
      studio: 3,
    };

    return levelOrder[user.memberLevel] >= levelOrder[template.requiredLevel];
  },

  // 获取用户可用的模板列表
  async getAvailableTemplates(userId: string): Promise<Template[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new PermissionError('用户不存在');
    }

    const levelOrder: Record<MemberLevel, number> = {
      free: 1,
      pro: 2,
      studio: 3,
    };
    const userLevel = levelOrder[user.memberLevel];

    const templates = await prisma.template.findMany({
      where: {
        requiredLevel: {
          in: Object.entries(levelOrder)
            .filter(([, level]) => level <= userLevel)
            .map(([key]) => key),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  },

  // 应用模板到作品生成
  async applyTemplate(templateId: string, inputData: any): Promise<any> {
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new TemplateError('模板不存在', 404, 'id');
    }

    const config = template.config as TemplateConfig;

    // 合并模板配置和用户输入
    const mergedConfig = {
      ...config,
      ...inputData,
      shots: config.shots?.map((shot, index) => ({
        ...shot,
        ...inputData.shots?.[index],
      })),
    };

    return mergedConfig;
  },
};

export default templateService;