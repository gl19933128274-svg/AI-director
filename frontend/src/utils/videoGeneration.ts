/**
 * 视频生成逻辑工具函数
 * 将 setInterval 相关逻辑提取为独立函数，便于测试
 */

import { ShotData } from '@/app/video/page';

/**
 * 处理单个镜头的生成
 * @param shots 当前镜头列表
 * @param currentShotIndex 当前处理的镜头索引
 * @returns 更新后的镜头列表
 */
export const processShotRendering = (
  shots: ShotData[],
  currentShotIndex: number
): ShotData[] => {
  return shots.map((shot, index) =>
    index === currentShotIndex ? { ...shot, status: 'rendering' } : shot
  );
};

/**
 * 完成单个镜头的生成
 * @param shots 当前镜头列表
 * @param currentShotIndex 当前处理的镜头索引
 * @returns 更新后的镜头列表
 */
export const completeShot = (
  shots: ShotData[],
  currentShotIndex: number
): ShotData[] => {
  return shots.map((shot, index) =>
    index === currentShotIndex ? { ...shot, status: 'done' } : shot
  );
};

/**
 * 计算生成进度
 * @param completedShots 已完成的镜头数
 * @param totalShots 总镜头数
 * @returns 进度百分比
 */
export const calculateProgress = (
  completedShots: number,
  totalShots: number
): number => {
  return Math.round((completedShots / totalShots) * 100);
};

/**
 * 检查是否应该模拟失败
 * @param failureProbability 失败概率 (0-1)
 * @returns 是否应该失败
 */
export const shouldSimulateFailure = (failureProbability: number): boolean => {
  return Math.random() < failureProbability;
};

/**
 * 重置所有镜头状态为等待中
 * @param shots 当前镜头列表
 * @returns 重置后的镜头列表
 */
export const resetAllShots = (shots: ShotData[]): ShotData[] => {
  return shots.map(shot => ({ ...shot, status: 'waiting' }));
};

/**
 * 更新项目状态到 localStorage
 * @param status 新状态
 */
export const updateProjectStatus = (status: string): void => {
  const existingData = localStorage.getItem('currentProject');
  if (existingData) {
    const currentProject = JSON.parse(existingData);
    localStorage.setItem('currentProject', JSON.stringify({
      ...currentProject,
      status,
    }));
  }
};

/**
 * 创建视频下载数据
 * @param projectData 项目数据
 * @param shots 镜头列表
 * @returns 视频数据对象
 */
interface ProjectData {
  status?: string;
  shots?: Array<{ num: number; duration: number }>;
  description?: string;
  params?: Record<string, unknown>;
}

export const createVideoData = (
  projectData: ProjectData | null,
  shots: ShotData[]
): object => {
  return {
    title: projectData?.description || 'AI生成的视频',
    shots: shots,
    params: projectData?.params || {},
    createdAt: new Date().toISOString(),
  };
};

/**
 * 视频生成状态管理器
 * 用于管理视频生成过程中的状态变化
 */
export class VideoGenerationManager {
  private shots: ShotData[];
  private currentShotIndex: number;
  private isGenerating: boolean;
  private hasError: boolean;
  private errorMessage: string;
  private progress: number;

  constructor(shots: ShotData[]) {
    this.shots = shots;
    this.currentShotIndex = 0;
    this.isGenerating = false;
    this.hasError = false;
    this.errorMessage = '';
    this.progress = 0;
  }

  /**
   * 开始生成
   */
  start(): void {
    this.isGenerating = true;
    this.hasError = false;
    this.errorMessage = '';
    this.progress = 0;
    this.currentShotIndex = 0;
    this.shots = resetAllShots(this.shots);
  }

  /**
   * 处理下一个镜头
   * @returns 是否还有更多镜头需要处理
   */
  processNextShot(): boolean {
    if (this.currentShotIndex >= this.shots.length) {
      return false;
    }

    this.shots = processShotRendering(this.shots, this.currentShotIndex);
    return true;
  }

  /**
   * 完成当前镜头
   */
  completeCurrentShot(): void {
    this.shots = completeShot(this.shots, this.currentShotIndex);
    this.currentShotIndex++;
    this.progress = calculateProgress(this.currentShotIndex, this.shots.length);
  }

  /**
   * 设置错误状态
   * @param message 错误消息
   */
  setError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isGenerating = false;
  }

  /**
   * 完成生成
   */
  complete(): void {
    this.progress = 100;
    this.isGenerating = false;
    updateProjectStatus('video-ready');
  }

  /**
   * 获取当前状态
   */
  getState(): {
    shots: ShotData[];
    currentShotIndex: number;
    isGenerating: boolean;
    hasError: boolean;
    errorMessage: string;
    progress: number;
  } {
    return {
      shots: this.shots,
      currentShotIndex: this.currentShotIndex,
      isGenerating: this.isGenerating,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      progress: this.progress,
    };
  }

  /**
   * 检查是否完成所有镜头
   */
  isComplete(): boolean {
    return this.currentShotIndex >= this.shots.length;
  }

  /**
   * 检查是否有错误
   */
  hasFailed(): boolean {
    return this.hasError;
  }
}