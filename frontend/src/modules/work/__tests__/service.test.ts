import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { workService, CreateWorkDto } from '../service';
import { ValidationError, PermissionError } from '../errors';

const prisma = new PrismaClient();

describe('Work Service', () => {
  const testUser = {
    email: 'worktest@example.com',
    password: 'password123',
    nickname: '测试用户',
  };

  let userId: string;

  beforeEach(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: 'hashed-password',
        nickname: testUser.nickname,
      },
    });
    userId = user.id;

    // 清理测试作品
    await prisma.work.deleteMany({ where: { userId } });
  });

  afterEach(async () => {
    await prisma.work.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create a work successfully', async () => {
      const dto: CreateWorkDto = {
        title: '测试作品',
        description: '这是一个测试作品',
        tags: ['测试', 'demo'],
      };

      const work = await workService.create(userId, dto);

      expect(work.title).toBe(dto.title);
      expect(work.description).toBe(dto.description);
      expect(work.tags).toEqual(dto.tags);
      expect(work.userId).toBe(userId);
      expect(work.status).toBe('draft');
    });

    it('should set status to completed if videoUrl is provided', async () => {
      const dto: CreateWorkDto = {
        title: '完成的作品',
        videoUrl: 'https://example.com/video.mp4',
      };

      const work = await workService.create(userId, dto);

      expect(work.status).toBe('completed');
    });

    it('should throw error if title is too short', async () => {
      const dto: CreateWorkDto = {
        title: 'a',
      };

      await expect(workService.create(userId, dto)).rejects.toThrow(ValidationError);
    });

    it('should throw error if too many tags', async () => {
      const dto: CreateWorkDto = {
        title: '测试作品',
        tags: Array(11).fill('tag'),
      };

      await expect(workService.create(userId, dto)).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should get work by id with user info', async () => {
      const dto: CreateWorkDto = {
        title: '测试作品',
      };
      const createdWork = await workService.create(userId, dto);

      const work = await workService.getById(createdWork.id);

      expect(work).not.toBeNull();
      expect(work?.id).toBe(createdWork.id);
      expect(work?.user).toBeDefined();
      expect(work?.user.nickname).toBe(testUser.nickname);
    });

    it('should return null if work does not exist', async () => {
      const work = await workService.getById('non-existent-id');
      expect(work).toBeNull();
    });
  });

  describe('getUserWorks', () => {
    it('should get user works with pagination', async () => {
      // 创建多个作品
      for (let i = 0; i < 5; i++) {
        await workService.create(userId, {
          title: `作品 ${i}`,
        });
      }

      const result = await workService.getUserWorks(userId, { page: 1, limit: 3 });

      expect(result.works.length).toBe(3);
      expect(result.total).toBe(5);
    });
  });

  describe('getPublicWorks', () => {
    it('should get public works', async () => {
      // 创建公开作品
      await workService.create(userId, {
        title: '公开作品',
        videoUrl: 'https://example.com/video.mp4',
      });

      // 更新为公开
      await prisma.work.updateMany({
        where: { userId },
        data: { visibility: 'public', status: 'published' },
      });

      const result = await workService.getPublicWorks();

      expect(result.total).toBe(1);
      expect(result.works[0].user).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update work successfully', async () => {
      const createdWork = await workService.create(userId, { title: '原始标题' });

      const updatedWork = await workService.update(userId, createdWork.id, {
        title: '更新后的标题',
        description: '更新后的描述',
      });

      expect(updatedWork.title).toBe('更新后的标题');
      expect(updatedWork.description).toBe('更新后的描述');
    });

    it('should throw error if user is not owner', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          passwordHash: 'hashed',
          nickname: '另一个用户',
        },
      });

      const createdWork = await workService.create(userId, { title: '测试作品' });

      await expect(workService.update(anotherUser.id, createdWork.id, {
        title: '尝试修改',
      })).rejects.toThrow(PermissionError);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });

  describe('publish', () => {
    it('should publish work successfully', async () => {
      const createdWork = await workService.create(userId, {
        title: '测试作品',
        videoUrl: 'https://example.com/video.mp4',
      });

      const publishedWork = await workService.publish(userId, createdWork.id);

      expect(publishedWork.status).toBe('published');
      expect(publishedWork.visibility).toBe('public');
    });

    it('should throw error if no videoUrl', async () => {
      const createdWork = await workService.create(userId, { title: '测试作品' });

      await expect(workService.publish(userId, createdWork.id)).rejects.toThrow(ValidationError);
    });
  });

  describe('search', () => {
    it('should search works by title', async () => {
      await workService.create(userId, {
        title: 'AI生成视频',
        videoUrl: 'https://example.com/video.mp4',
      });

      await prisma.work.updateMany({
        where: { userId },
        data: { visibility: 'public', status: 'published' },
      });

      const result = await workService.search('AI生成');

      expect(result.total).toBe(1);
      expect(result.works[0].title).toBe('AI生成视频');
    });
  });
});