import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { videoService, VideoRequest } from '../service';
import { ValidationError, VideoError } from '../errors';

const prisma = new PrismaClient();

describe('Video Service', () => {
  beforeEach(async () => {
    await prisma.generationTask.deleteMany({});
  });

  afterEach(async () => {
    await prisma.generationTask.deleteMany({});
    await prisma.$disconnect();
  });

  describe('createTask', () => {
    it('should create a video task successfully', async () => {
      const request: VideoRequest = {
        storyboardId: 'storyboard-123',
        quality: '1080p',
        fps: 30,
      };

      const task = await videoService.createTask(request);

      expect(task.id).toBeDefined();
      expect(task.type).toBe('video');
      expect(task.status).toBe('pending');
      expect((task.input as any).storyboardId).toBe('storyboard-123');
    });

    it('should throw error if storyboardId is missing', async () => {
      const request: any = {
        quality: '1080p',
      };

      await expect(videoService.createTask(request)).rejects.toThrow(ValidationError);
    });

    it('should use default values for optional fields', async () => {
      const request: VideoRequest = {
        storyboardId: 'storyboard-123',
      };

      const task = await videoService.createTask(request);

      expect((task.input as any).quality).toBe('1080p');
      expect((task.input as any).fps).toBe(30);
      expect((task.input as any).audioEnabled).toBe(true);
    });
  });

  describe('getTask', () => {
    it('should get task by id', async () => {
      const request: VideoRequest = {
        storyboardId: 'storyboard-123',
      };

      const created = await videoService.createTask(request);
      const task = await videoService.getTask(created.id);

      expect(task).not.toBeNull();
      expect(task?.id).toBe(created.id);
    });

    it('should return null if task does not exist', async () => {
      const task = await videoService.getTask('non-existent-id');
      expect(task).toBeNull();
    });
  });

  describe('getUserTasks', () => {
    it('should get user tasks', async () => {
      // 创建测试用户
      const user = await prisma.user.create({
        data: {
          email: 'video-test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      // 创建多个任务
      await videoService.createTask({
        storyboardId: 'storyboard-1',
        userId: user.id,
      });
      await videoService.createTask({
        storyboardId: 'storyboard-2',
        userId: user.id,
      });

      const tasks = await videoService.getUserTasks(user.id);

      expect(tasks.length).toBe(2);

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should filter tasks by status', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'video-test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
        },
      });

      await videoService.createTask({
        storyboardId: 'storyboard-1',
        userId: user.id,
      });

      const tasks = await videoService.getUserTasks(user.id, 'pending');

      expect(tasks.length).toBe(1);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('updateTask', () => {
    it('should update task status', async () => {
      const request: VideoRequest = {
        storyboardId: 'storyboard-123',
      };

      const created = await videoService.createTask(request);
      const updated = await videoService.updateTask(created.id, { status: 'processing' });

      expect(updated.status).toBe('processing');
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      const status = await videoService.getQueueStatus();

      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });
  });

  describe('cancelTask', () => {
    it('should cancel pending task', async () => {
      const request: VideoRequest = {
        storyboardId: 'storyboard-123',
      };

      const created = await videoService.createTask(request);
      await videoService.cancelTask(created.id);

      const task = await videoService.getTask(created.id);
      expect(task?.status).toBe('failed');
      expect(task?.error).toBe('任务已取消');
    });

    it('should throw error if task does not exist', async () => {
      await expect(videoService.cancelTask('non-existent-id')).rejects.toThrow(VideoError);
    });
  });
});