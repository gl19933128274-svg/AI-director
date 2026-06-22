import { PrismaClient, GenerationTask } from '@prisma/client';
import { VideoError, ValidationError } from './errors';

const prisma = new PrismaClient();

// 视频质量配置
export type VideoQuality = '480p' | '720p' | '1080p' | '2k' | '4k';

// 视频帧率
export type VideoFps = 24 | 30 | 60;

// 视频生成状态
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'delivered';

// 视频生成请求
export interface VideoRequest {
  storyboardId: string;          // 分镜ID
  userId?: string;               // 用户ID
  quality?: VideoQuality;        // 视频质量
  fps?: VideoFps;                // 帧率
  aspectRatio?: string;          // 宽高比
  audioEnabled?: boolean;        // 是否添加音频
  style?: string;                // 风格
}

// 视频生成任务
export interface VideoTask extends GenerationTask {
  progress?: number;             // 进度 0-100
  estimatedTime?: number;        // 预计剩余时间（秒）
}

// 队列配置
const QUEUE_CONFIG = {
  maxConcurrent: 10,             // 最大并发数
  maxQueueSize: 100,             // 最大队列长度
  retryCount: 3,                 // 最大重试次数
  baseDelay: 1000,               // 基础重试延迟（毫秒）
};

// 视频质量配置
const QUALITY_CONFIG: Record<VideoQuality, { width: number; height: number; bitrate: string }> = {
  '480p': { width: 854, height: 480, bitrate: '1500k' },
  '720p': { width: 1280, height: 720, bitrate: '3000k' },
  '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
  '2k': { width: 2560, height: 1440, bitrate: '12000k' },
  '4k': { width: 3840, height: 2160, bitrate: '24000k' },
};

// 当前处理中的任务数
let currentProcessing = 0;

// 视频生成服务
export const videoService = {
  // 创建视频生成任务
  async createTask(request: VideoRequest): Promise<VideoTask> {
    // 验证参数
    if (!request.storyboardId) {
      throw new ValidationError('分镜ID不能为空', 'storyboardId');
    }

    // 检查队列长度
    const pendingCount = await prisma.generationTask.count({
      where: { type: 'video', status: 'pending' },
    });

    if (pendingCount >= QUEUE_CONFIG.maxQueueSize) {
      throw new VideoError('队列已满，请稍后再试', 429);
    }

    // 创建任务
    const task = await prisma.generationTask.create({
      data: {
        type: 'video',
        userId: request.userId,
        status: 'pending',
        input: JSON.stringify({
          storyboardId: request.storyboardId,
          quality: request.quality || '1080p',
          fps: request.fps || 30,
          aspectRatio: request.aspectRatio || '16:9',
          audioEnabled: request.audioEnabled !== false,
          style: request.style || 'cinematic',
        }),
      },
    });

    // 尝试立即处理
    this.processQueue();

    return task as VideoTask;
  },

  // 获取任务状态
  async getTask(taskId: string): Promise<VideoTask | null> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    return task as VideoTask | null;
  },

  // 获取用户任务列表
  async getUserTasks(userId: string, status?: string): Promise<VideoTask[]> {
    const where: any = { userId, type: 'video' };
    if (status) {
      where.status = status;
    }

    const tasks = await prisma.generationTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return tasks as VideoTask[];
  },

  // 更新任务状态
  async updateTask(taskId: string, updates: Partial<Pick<GenerationTask, 'status' | 'output' | 'error'>>): Promise<VideoTask> {
    const task = await prisma.generationTask.update({
      where: { id: taskId },
      data: updates,
    });
    return task as VideoTask;
  },

  // 任务队列处理
  async processQueue(): Promise<void> {
    // 检查并发限制
    if (currentProcessing >= QUEUE_CONFIG.maxConcurrent) {
      return;
    }

    // 获取待处理的任务
    const pendingTasks = await prisma.generationTask.findMany({
      where: { type: 'video', status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: QUEUE_CONFIG.maxConcurrent - currentProcessing,
    });

    // 并行处理任务
    for (const task of pendingTasks) {
      this.processTask(task.id);
    }
  },

  // 处理单个任务
  async processTask(taskId: string): Promise<void> {
    currentProcessing++;

    try {
      // 更新状态为处理中
      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: 'processing' },
      });

      const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new Error('任务不存在');
      }

      const input = JSON.parse(task.input) as VideoRequest;
      const quality = input.quality || '1080p';
      const qualityConfig = QUALITY_CONFIG[quality];

      // 模拟视频生成过程
      await this.simulateVideoGeneration(taskId, qualityConfig);

      // 完成任务
      await prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          output: JSON.stringify({
            videoUrl: `https://example.com/videos/${taskId}.mp4`,
            thumbnailUrl: `https://example.com/videos/${taskId}-thumb.jpg`,
            quality,
            fps: input.fps || 30,
            duration: 30, // 模拟时长
          }),
        },
      });

      // 通知回调（如果有）
      await this.notifyCompletion(taskId);

    } catch (error) {
      // 处理失败
      const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
      if (task) {
        const outputData = task.output ? JSON.parse(task.output) : {};
        const retryCount = outputData.retryCount || 0;

        if (retryCount < QUEUE_CONFIG.retryCount) {
          // 重试
          await prisma.generationTask.update({
            where: { id: taskId },
            data: {
              status: 'pending',
              output: JSON.stringify({ ...outputData, retryCount: retryCount + 1 }),
            },
          });

          // 延迟重试
          const delay = QUEUE_CONFIG.baseDelay * Math.pow(2, retryCount);
          setTimeout(() => this.processQueue(), delay);
        } else {
          // 最终失败
          await prisma.generationTask.update({
            where: { id: taskId },
            data: {
              status: 'failed',
              error: (error as Error).message,
            },
          });
        }
      }
    } finally {
      currentProcessing--;
      // 继续处理队列
      this.processQueue();
    }
  },

  // 模拟视频生成
  async simulateVideoGeneration(taskId: string, qualityConfig: { width: number; height: number }): Promise<void> {
    const totalSteps = 10;
    const stepDuration = 500; // 每步500ms

    for (let i = 1; i <= totalSteps; i++) {
      const progress = Math.round((i / totalSteps) * 100);
      
      // 更新进度
      await prisma.generationTask.update({
        where: { id: taskId },
        data: {
          output: JSON.stringify({ progress, estimatedTime: (totalSteps - i) * stepDuration / 1000 }),
        },
      });

      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  },

  // 通知任务完成
  async notifyCompletion(taskId: string): Promise<void> {
    // 这里可以实现Webhook回调或消息通知
    console.log(`任务 ${taskId} 已完成，可通知用户`);
  },

  // 获取队列状态
  async getQueueStatus(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.generationTask.count({ where: { type: 'video', status: 'pending' } }),
      prisma.generationTask.count({ where: { type: 'video', status: 'processing' } }),
      prisma.generationTask.count({ where: { type: 'video', status: 'completed' } }),
      prisma.generationTask.count({ where: { type: 'video', status: 'failed' } }),
    ]);

    return { pending, processing, completed, failed };
  },

  // 取消任务
  async cancelTask(taskId: string): Promise<void> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new VideoError('任务不存在', 404);
    }

    if (task.status === 'processing') {
      throw new VideoError('任务正在处理中，无法取消', 400);
    }

    await prisma.generationTask.update({
      where: { id: taskId },
      data: { status: 'failed', error: '任务已取消' },
    });
  },
};

export default videoService;