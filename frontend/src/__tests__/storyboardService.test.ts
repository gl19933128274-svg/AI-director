/**
 * Storyboard Service 测试用例
 * 测试导演级分镜生成功能
 */

import { VideoParams } from '@/types';
import {
  analyzeProductFeatures,
  buildStoryboardPrompt,
  buildAIMessages,
  generateLocalStoryboard,
  parseAIResponse,
  scoreStoryboard,
  calculateDuration,
  ProductFeatures,
  ShotDetail
} from '@/services/storyboardService';

describe('Storyboard Service', () => {
  describe('analyzeProductFeatures', () => {
    it('should correctly identify backpack category', () => {
      const features = analyzeProductFeatures('高端书包，低饱和、高级感');
      expect(features.productCategory).toBe('backpack');
      expect(features.productType).toBe('书包');
      expect(features.keyElements).toContain('背负系统');
      expect(features.keyElements).toContain('隔层');
    });

    it('should correctly identify bag category', () => {
      const features = analyzeProductFeatures('高端手提包，时尚潮流');
      expect(features.productCategory).toBe('bag');
      expect(features.productType).toBe('箱包');
    });

    it('should analyze mood correctly', () => {
      expect(analyzeProductFeatures('高端奢华包包').mood).toBe('高端奢华');
      expect(analyzeProductFeatures('温馨治愈宠物用品').mood).toBe('温馨治愈');
      expect(analyzeProductFeatures('简约清新家具').mood).toBe('简约清新');
    });

    it('should analyze audience correctly', () => {
      expect(analyzeProductFeatures('适合年轻人的服装').targetAudience).toBe('年轻人');
      expect(analyzeProductFeatures('商务人士的公文包').targetAudience).toBe('商务人士');
    });
  });

  describe('calculateDuration', () => {
    it('should calculate durations correctly', () => {
      const durations = calculateDuration(7, 15);
      expect(durations.length).toBe(7);
      expect(durations.reduce((a, b) => a + b, 0)).toBe(15);
    });

    it('should handle weights correctly', () => {
      const weights = [0.2, 0.15, 0.15, 0.15, 0.15, 0.1, 0.1];
      const durations = calculateDuration(7, 15, weights);
      expect(durations.length).toBe(7);
      expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(15, 0);
    });
  });

  describe('generateLocalStoryboard', () => {
    it('should generate backpack storyboard with 7 shots', () => {
      const features: ProductFeatures = {
        productType: '书包',
        productCategory: 'backpack',
        keyElements: ['材质', '容量', '隔层', '背负系统'],
        mood: '高端奢华',
        targetAudience: '年轻人',
        hasModel: true,
        hasScene: true
      };

      const shots = generateLocalStoryboard(features, 15, 7);
      
      expect(shots.length).toBe(7);
      expect(shots.reduce((sum, s) => sum + s.duration, 0)).toBe(15);
      
      // 检查每个镜头的必填字段
      shots.forEach(shot => {
        expect(shot.num).toBeDefined();
        expect(shot.duration).toBeDefined();
        expect(shot.scene).toBeDefined();
        expect(shot.camera).toBeDefined();
        expect(shot.action).toBeDefined();
        expect(shot.emotion).toBeDefined();
        expect(shot.purpose).toBeDefined();
        expect(shot.description).toBeDefined();
        expect(shot.composition).toBeDefined();
        expect(shot.lighting).toBeDefined();
        expect(shot.soundEffect).toBeDefined();
        expect(shot.notes).toBeDefined();
        expect(shot.aiPrompt).toBeDefined();
      });
    });

    it('should generate bag storyboard', () => {
      const features: ProductFeatures = {
        productType: '箱包',
        productCategory: 'bag',
        keyElements: ['材质', '容量', '细节'],
        mood: '时尚潮流',
        targetAudience: '女性用户',
        hasModel: true,
        hasScene: true
      };

      const shots = generateLocalStoryboard(features, 12, 5);
      expect(shots.length).toBe(5);
      expect(shots.reduce((sum, s) => sum + s.duration, 0)).toBe(12);
    });
  });

  describe('buildStoryboardPrompt', () => {
    it('should build a comprehensive prompt for backpack', () => {
      const features: ProductFeatures = {
        productType: '书包',
        productCategory: 'backpack',
        keyElements: ['材质', '容量', '隔层'],
        mood: '高端奢华',
        targetAudience: '年轻人',
        hasModel: true,
        hasScene: true
      };

      const params: VideoParams = {
        duration: '15',
        aspectRatio: '16:9',
        resolution: '8K',
        style: 'premium'
      };

      const styles = ['low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute'];
      const prompt = buildStoryboardPrompt('高端书包', features, params, styles, 7);

      expect(prompt).toContain('8K超清');
      expect(prompt).toContain('电影级写实光影');
      expect(prompt).toContain('低饱和');
      expect(prompt).toContain('高级感');
      expect(prompt).toContain('细节切入');
      expect(prompt).toContain('功能展示');
      expect(prompt).toContain('场景融入');
      expect(prompt).toContain('品牌强化');
      expect(prompt).toContain('结尾定格');
    });
  });

  describe('buildAIMessages', () => {
    it('should build AI messages correctly', () => {
      const prompt = 'test prompt';
      const messages = buildAIMessages(prompt, '15', ['premium', 'healing']);

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[0].content).toContain('导演级');
      expect(messages[0].content).toContain('电影级写实光影');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', () => {
      const content = JSON.stringify({
        shots: [
          {
            num: 1,
            duration: 2.5,
            scene: '测试场景',
            camera: '推镜头',
            action: '测试动作',
            emotion: '测试情绪',
            purpose: '测试目的',
            description: '测试描述',
            composition: '测试构图',
            lighting: '测试灯光',
            soundEffect: '测试音效',
            notes: '测试备注',
            aiPrompt: '测试AI提示'
          }
        ]
      });

      const result = parseAIResponse(content, 15);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(1);
      expect(result?.[0].scene).toBe('测试场景');
    });

    it('should handle missing fields', () => {
      const content = JSON.stringify({
        shots: [
          {
            num: 1,
            duration: 2.5,
            scene: '测试场景'
          }
        ]
      });

      const result = parseAIResponse(content, 15);
      expect(result).not.toBeNull();
      expect(result?.[0].camera).toBe('固定镜头');
      expect(result?.[0].soundEffect).toBe('环境音效');
      expect(result?.[0].notes).toBe('电影级写实光影，专业构图');
    });

    it('should return null for invalid JSON', () => {
      expect(parseAIResponse('invalid json', 15)).toBeNull();
      expect(parseAIResponse('{}', 15)).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      expect(parseAIResponse('{ invalid }', 15)).toBeNull();
      expect(parseAIResponse('{ "shots": [ }', 15)).toBeNull();
      expect(parseAIResponse('{ "shots": "not an array" }', 15)).toBeNull();
    });

    it('should return null for empty shots array', () => {
      const content = JSON.stringify({ shots: [] });
      const result = parseAIResponse(content, 15);
      expect(result).toBeNull();
    });

    it('should return null for missing shots field', () => {
      const content = JSON.stringify({ data: 'something else' });
      expect(parseAIResponse(content, 15)).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseAIResponse('', 15)).toBeNull();
    });

    it('should handle JSON with extra fields', () => {
      const content = JSON.stringify({
        shots: [
          {
            num: 1,
            duration: 2.5,
            scene: '测试场景',
            camera: '推镜头',
            action: '测试动作',
            emotion: '测试情绪',
            purpose: '测试目的',
            description: '测试描述',
            composition: '测试构图',
            lighting: '测试灯光',
            soundEffect: '测试音效',
            notes: '测试备注',
            aiPrompt: '测试AI提示'
          }
        ],
        extraField: 'should be ignored',
        metadata: {
          version: '1.0',
          timestamp: '2024-01-01'
        }
      });

      const result = parseAIResponse(content, 15);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(1);
    });

    it('should handle duration adjustment', () => {
      const content = JSON.stringify({
        shots: [
          { num: 1, duration: 5, scene: '场景1', camera: '固定镜头', action: '动作1', emotion: '情绪1', purpose: '目的1', description: '描述1', composition: '构图1', lighting: '灯光1', soundEffect: '音效1', notes: '备注1', aiPrompt: '提示1' },
          { num: 2, duration: 5, scene: '场景2', camera: '固定镜头', action: '动作2', emotion: '情绪2', purpose: '目的2', description: '描述2', composition: '构图2', lighting: '灯光2', soundEffect: '音效2', notes: '备注2', aiPrompt: '提示2' }
        ]
      });

      const result = parseAIResponse(content, 10);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(2);
      const totalDuration = result!.reduce((sum, shot) => sum + shot.duration, 0);
      expect(totalDuration).toBeCloseTo(10, 1);
    });

    it('should handle large number of shots', () => {
      const shots = Array.from({ length: 20 }, (_, i) => ({
        num: i + 1,
        duration: 1,
        scene: `场景${i + 1}`,
        camera: '固定镜头',
        action: `动作${i + 1}`,
        emotion: '情绪',
        purpose: '目的',
        description: `描述${i + 1}`,
        composition: '构图',
        lighting: '灯光',
        soundEffect: '音效',
        notes: '备注',
        aiPrompt: `提示${i + 1}`
      }));

      const content = JSON.stringify({ shots });
      const result = parseAIResponse(content, 20);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(20);
    });
  });

  describe('scoreStoryboard', () => {
    it('should score storyboard correctly', () => {
      const shots: ShotDetail[] = [
        {
          num: 1,
          duration: 2.5,
          scene: '场景1',
          camera: '推镜头',
          action: '动作1',
          emotion: '情绪1',
          purpose: '吸引注意',
          description: '描述1',
          composition: '中心构图',
          lighting: '专业灯光',
          soundEffect: '音效1',
          notes: '备注1',
          aiPrompt: 'prompt1'
        },
        {
          num: 2,
          duration: 3,
          scene: '场景2',
          camera: '拉镜头',
          action: '动作2',
          emotion: '情绪2',
          purpose: '展示卖点',
          description: '描述2',
          composition: '三分法构图',
          lighting: '自然光',
          soundEffect: '音效2',
          notes: '备注2',
          aiPrompt: 'prompt2'
        }
      ];

      const features: ProductFeatures = {
        productType: '书包',
        productCategory: 'backpack',
        keyElements: ['材质', '容量'],
        mood: '高端奢华',
        targetAudience: '年轻人',
        hasModel: true,
        hasScene: true
      };

      const score = scoreStoryboard(shots, features);
      expect(score.score).toBeGreaterThan(0);
      expect(score.details.richness).toBeDefined();
      expect(score.details.commercialValue).toBeDefined();
      expect(score.details.productCoverage).toBeDefined();
      expect(score.details.visualExpression).toBeDefined();
      expect(score.details.conversionAbility).toBeDefined();
    });
  });
});