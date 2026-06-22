import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { storyboardService, StoryboardRequest, ShotType } from '../service';
import { ValidationError } from '../errors';

const prisma = new PrismaClient();

describe('Storyboard Service', () => {
  beforeEach(async () => {
    await prisma.generationTask.deleteMany({});
  });

  afterEach(async () => {
    await prisma.generationTask.deleteMany({});
    await prisma.$disconnect();
  });

  describe('generate', () => {
    it('should generate storyboard with default settings', async () => {
      const request: StoryboardRequest = {
        prompt: '一个人在森林中行走，阳光透过树叶洒下来',
        sceneConfig: {
          setting: '森林',
          timeOfDay: '早晨',
          mood: '宁静',
        },
      };

      const result = await storyboardService.generate(request);

      expect(result.id).toBeDefined();
      expect(result.prompt).toBe(request.prompt);
      expect(result.shots.length).toBe(5);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('should generate storyboard with custom shot count', async () => {
      const request: StoryboardRequest = {
        prompt: '城市夜景',
        sceneConfig: {
          setting: '城市',
          timeOfDay: '夜晚',
          mood: '繁华',
        },
        shotCount: 8,
      };

      const result = await storyboardService.generate(request);

      expect(result.shots.length).toBe(8);
    });

    it('should throw error if prompt is too short', async () => {
      const request: StoryboardRequest = {
        prompt: '测试',
        sceneConfig: {
          setting: '室内',
          timeOfDay: '中午',
          mood: '平静',
        },
      };

      await expect(storyboardService.generate(request)).rejects.toThrow(ValidationError);
    });

    it('should throw error if shot count is invalid', async () => {
      const request: StoryboardRequest = {
        prompt: '测试场景',
        sceneConfig: {
          setting: '室内',
          timeOfDay: '中午',
          mood: '平静',
        },
        shotCount: 25,
      };

      await expect(storyboardService.generate(request)).rejects.toThrow(ValidationError);
    });
  });

  describe('generateShotSequence', () => {
    it('should generate diverse shot types', async () => {
      const request: StoryboardRequest = {
        prompt: '动作电影场景',
        sceneConfig: {
          setting: '城市街道',
          timeOfDay: '傍晚',
          mood: '紧张刺激',
        },
        shotCount: 6,
      };

      const shots = await storyboardService.generateShotSequence(request, 6, 30);

      expect(shots.length).toBe(6);
      
      // 检查是否包含多种镜头类型
      const shotTypes = new Set(shots.map(s => s.type));
      expect(shotTypes.size).toBeGreaterThan(1);
    });

    it('should include camera movements for compatible shots', async () => {
      const request: StoryboardRequest = {
        prompt: '追逐场景',
        sceneConfig: {
          setting: '城市街道',
          timeOfDay: '夜晚',
          mood: '追逐',
        },
        shotCount: 5,
      };

      const shots = await storyboardService.generateShotSequence(request, 5, 30);

      // 检查是否有运镜方式
      const shotsWithMovement = shots.filter(s => s.cameraMovement);
      expect(shotsWithMovement.length).toBeGreaterThan(0);
    });
  });

  describe('selectShotTypes', () => {
    it('should select appropriate shot types for outdoor scene', () => {
      const scene = {
        setting: '室外森林',
        timeOfDay: '早晨',
        mood: '宁静',
      };

      const shotTypes = storyboardService.selectShotTypes(scene);

      expect(shotTypes).toContain('long_shot');
      expect(shotTypes).toContain('medium_long');
    });

    it('should include extreme closeup for intense mood', () => {
      const scene = {
        setting: '室内',
        timeOfDay: '夜晚',
        mood: '紧张激烈',
      };

      const shotTypes = storyboardService.selectShotTypes(scene);

      expect(shotTypes).toContain('extreme_closeup');
    });
  });

  describe('selectCameraMovements', () => {
    it('should include track and follow for chase scenes', () => {
      const scene = {
        setting: '城市街道',
        timeOfDay: '夜晚',
        mood: '追逐',
      };

      const movements = storyboardService.selectCameraMovements(scene);

      expect(movements).toContain('track');
      expect(movements).toContain('follow');
    });

    it('should include dolly for grand scenes', () => {
      const scene = {
        setting: '广阔草原',
        timeOfDay: '傍晚',
        mood: '宏大',
      };

      const movements = storyboardService.selectCameraMovements(scene);

      expect(movements).toContain('dolly');
    });
  });

  describe('selectLighting', () => {
    it('should select bright lighting for happy mood', () => {
      const lighting = storyboardService.selectLighting('欢快的场景');
      expect(lighting).toBe('bright');
    });

    it('should select dark lighting for mysterious mood', () => {
      const lighting = storyboardService.selectLighting('神秘的夜晚');
      expect(lighting).toBe('dark');
    });

    it('should select high contrast for dramatic mood', () => {
      const lighting = storyboardService.selectLighting('戏剧性的场景');
      expect(lighting).toBe('high_contrast');
    });
  });

  describe('getShotTypes', () => {
    it('should return all shot types with descriptions', () => {
      const shotTypes = storyboardService.getShotTypes();

      expect(shotTypes.length).toBe(6);
      expect(shotTypes[0]).toHaveProperty('type');
      expect(shotTypes[0]).toHaveProperty('description');
    });
  });

  describe('getCameraMovements', () => {
    it('should return all camera movements with descriptions', () => {
      const movements = storyboardService.getCameraMovements();

      expect(movements.length).toBe(7);
      expect(movements[0]).toHaveProperty('type');
      expect(movements[0]).toHaveProperty('description');
    });
  });

  describe('getLightingStyles', () => {
    it('should return all lighting styles with descriptions', () => {
      const lighting = storyboardService.getLightingStyles();

      expect(lighting.length).toBe(6);
      expect(lighting[0]).toHaveProperty('type');
      expect(lighting[0]).toHaveProperty('description');
    });
  });
});