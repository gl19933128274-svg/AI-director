/**
 * 视频生成逻辑工具函数测试
 * 测试提取出来的独立函数
 */

import {
  processShotRendering,
  completeShot,
  calculateProgress,
  shouldSimulateFailure,
  resetAllShots,
  updateProjectStatus,
  createVideoData,
  VideoGenerationManager,
} from '@/utils/videoGeneration';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('视频生成工具函数', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processShotRendering', () => {
    test('正确设置指定镜头为渲染状态', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
        { num: 2, duration: 8, status: 'waiting' },
        { num: 3, duration: 10, status: 'waiting' },
      ];

      const result = processShotRendering(shots, 0);

      expect(result[0].status).toBe('rendering');
      expect(result[1].status).toBe('waiting');
      expect(result[2].status).toBe('waiting');
    });

    test('处理中间镜头', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
        { num: 2, duration: 8, status: 'waiting' },
        { num: 3, duration: 10, status: 'waiting' },
      ];

      const result = processShotRendering(shots, 1);

      expect(result[0].status).toBe('done');
      expect(result[1].status).toBe('rendering');
      expect(result[2].status).toBe('waiting');
    });

    test('处理最后一个镜头', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
        { num: 2, duration: 8, status: 'done' },
        { num: 3, duration: 10, status: 'waiting' },
      ];

      const result = processShotRendering(shots, 2);

      expect(result[0].status).toBe('done');
      expect(result[1].status).toBe('done');
      expect(result[2].status).toBe('rendering');
    });
  });

  describe('completeShot', () => {
    test('正确设置指定镜头为完成状态', () => {
      const shots = [
        { num: 1, duration: 5, status: 'rendering' },
        { num: 2, duration: 8, status: 'waiting' },
      ];

      const result = completeShot(shots, 0);

      expect(result[0].status).toBe('done');
      expect(result[1].status).toBe('waiting');
    });

    test('不改变其他镜头状态', () => {
      const shots = [
        { num: 1, duration: 5, status: 'rendering' },
        { num: 2, duration: 8, status: 'rendering' },
      ];

      const result = completeShot(shots, 0);

      expect(result[0].status).toBe('done');
      expect(result[1].status).toBe('rendering');
    });
  });

  describe('calculateProgress', () => {
    test('计算0%进度', () => {
      const progress = calculateProgress(0, 10);
      expect(progress).toBe(0);
    });

    test('计算50%进度', () => {
      const progress = calculateProgress(5, 10);
      expect(progress).toBe(50);
    });

    test('计算100%进度', () => {
      const progress = calculateProgress(10, 10);
      expect(progress).toBe(100);
    });

    test('处理小数进度', () => {
      const progress = calculateProgress(1, 3);
      expect(progress).toBe(33);
    });
  });

  describe('shouldSimulateFailure', () => {
    test('概率为0时不应失败', () => {
      // Mock Math.random to return 0.5
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const result = shouldSimulateFailure(0);
      expect(result).toBe(false);
      
      mockRandom.mockRestore();
    });

    test('概率为1时应总是失败', () => {
      // Mock Math.random to return 0.5
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const result = shouldSimulateFailure(1);
      expect(result).toBe(true);
      
      mockRandom.mockRestore();
    });

    test('概率0.1时返回值小于0.1则失败', () => {
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.05);
      
      const result = shouldSimulateFailure(0.1);
      expect(result).toBe(true);
      
      mockRandom.mockRestore();
    });

    test('概率0.1时返回值大于0.1则不失败', () => {
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const result = shouldSimulateFailure(0.1);
      expect(result).toBe(false);
      
      mockRandom.mockRestore();
    });
  });

  describe('resetAllShots', () => {
    test('重置所有镜头为等待状态', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
        { num: 2, duration: 8, status: 'rendering' },
        { num: 3, duration: 10, status: 'done' },
      ];

      const result = resetAllShots(shots);

      expect(result[0].status).toBe('waiting');
      expect(result[1].status).toBe('waiting');
      expect(result[2].status).toBe('waiting');
    });

    test('保持其他属性不变', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
      ];

      const result = resetAllShots(shots);

      expect(result[0].num).toBe(1);
      expect(result[0].duration).toBe(5);
    });
  });

  describe('updateProjectStatus', () => {
    test('更新localStorage中的项目状态', () => {
      const mockData = {
        description: '测试项目',
        status: 'storyboard-ready',
      };
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockData));

      updateProjectStatus('video-ready');

      expect(window.localStorage.setItem).toHaveBeenCalled();
      const setItemCall = (window.localStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(setItemCall[1]);
      expect(savedData.status).toBe('video-ready');
    });

    test('localStorage为空时不更新', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

      updateProjectStatus('video-ready');

      expect(window.localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('createVideoData', () => {
    test('创建完整的视频数据对象', () => {
      const projectData = {
        description: '测试视频',
        params: { resolution: '1080p' },
      };
      const shots = [
        { num: 1, duration: 5, status: 'done' },
        { num: 2, duration: 8, status: 'done' },
      ];

      const result = createVideoData(projectData, shots);

      expect(result.title).toBe('测试视频');
      expect(result.shots).toEqual(shots);
      expect(result.params.resolution).toBe('1080p');
      expect(result.createdAt).toBeDefined();
    });

    test('项目数据为空时使用默认值', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
      ];

      const result = createVideoData(null, shots);

      expect(result.title).toBe('AI生成的视频');
      expect(result.params).toEqual({});
    });
  });

  describe('VideoGenerationManager', () => {
    test('初始化状态正确', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
        { num: 2, duration: 8, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      const state = manager.getState();

      expect(state.currentShotIndex).toBe(0);
      expect(state.isGenerating).toBe(false);
      expect(state.hasError).toBe(false);
      expect(state.progress).toBe(0);
    });

    test('开始生成后状态正确', () => {
      const shots = [
        { num: 1, duration: 5, status: 'done' },
        { num: 2, duration: 8, status: 'rendering' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      const state = manager.getState();

      expect(state.isGenerating).toBe(true);
      expect(state.hasError).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.shots[0].status).toBe('waiting');
      expect(state.shots[1].status).toBe('waiting');
    });

    test('处理镜头后状态正确', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
        { num: 2, duration: 8, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      manager.processNextShot();
      const state = manager.getState();

      expect(state.shots[0].status).toBe('rendering');
      expect(state.shots[1].status).toBe('waiting');
    });

    test('完成镜头后进度更新', () => {
      const shots = [
        { num: 1, duration: 5, status: 'rendering' },
        { num: 2, duration: 8, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      manager.processNextShot();
      manager.completeCurrentShot();
      const state = manager.getState();

      expect(state.currentShotIndex).toBe(1);
      expect(state.progress).toBe(50);
      expect(state.shots[0].status).toBe('done');
    });

    test('设置错误状态', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      manager.setError('镜头 1 生成失败');
      const state = manager.getState();

      expect(state.hasError).toBe(true);
      expect(state.errorMessage).toBe('镜头 1 生成失败');
      expect(state.isGenerating).toBe(false);
    });

    test('完成生成', () => {
      const mockData = {
        description: '测试项目',
        status: 'storyboard-ready',
      };
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockData));

      const shots = [
        { num: 1, duration: 5, status: 'done' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      manager.complete();
      const state = manager.getState();

      expect(state.progress).toBe(100);
      expect(state.isGenerating).toBe(false);
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    test('检查是否完成所有镜头', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
        { num: 2, duration: 8, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      
      expect(manager.isComplete()).toBe(false);
      
      manager.processNextShot();
      manager.completeCurrentShot();
      expect(manager.isComplete()).toBe(false);
      
      manager.processNextShot();
      manager.completeCurrentShot();
      expect(manager.isComplete()).toBe(true);
    });

    test('检查是否有错误', () => {
      const shots = [
        { num: 1, duration: 5, status: 'waiting' },
      ];

      const manager = new VideoGenerationManager(shots);
      manager.start();
      
      expect(manager.hasFailed()).toBe(false);
      
      manager.setError('生成失败');
      expect(manager.hasFailed()).toBe(true);
    });
  });
});