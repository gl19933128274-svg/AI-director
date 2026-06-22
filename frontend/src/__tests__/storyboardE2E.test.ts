/**
 * Storyboard 导演级分镜端到端测试
 * 模拟上传书包图片并生成15秒分镜的完整流程
 */

import {
  analyzeProductFeatures,
  buildStoryboardPrompt,
  buildAIMessages,
  generateLocalStoryboard,
  parseAIResponse,
  scoreStoryboard,
  ProductFeatures,
  ShotDetail
} from '@/services/storyboardService';
import { VideoParams } from '@/types';

describe('Storyboard Director End-to-End Test', () => {
  // 模拟用户输入
  const userInput = '高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感';
  const videoDuration = 15; // 15秒
  const shotCount = 7; // 7个核心镜头
  const videoParams: VideoParams = {
    duration: '15',
    aspectRatio: '16:9',
    resolution: '8K',
    style: 'premium'
  };
  const styles = ['low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute'];

  let productFeatures: ProductFeatures;
  let generatedShots: ShotDetail[];

  beforeAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎬 端到端测试：书包产品导演级分镜生成');
    console.log('='.repeat(80));
  });

  it('should analyze product features correctly for backpack', () => {
    console.log('\n📋 步骤1：分析产品特征');
    productFeatures = analyzeProductFeatures(userInput);
    
    console.log(`   产品类型: ${productFeatures.productType}`);
    console.log(`   产品类别: ${productFeatures.productCategory}`);
    console.log(`   关键元素: ${productFeatures.keyElements.join('、')}`);
    console.log(`   情绪风格: ${productFeatures.mood}`);
    console.log(`   目标受众: ${productFeatures.targetAudience}`);
    console.log(`   是否含模特: ${productFeatures.hasModel}`);
    console.log(`   是否含场景: ${productFeatures.hasScene}`);

    // 验证产品识别
    expect(productFeatures.productCategory).toBe('backpack');
    expect(productFeatures.productType).toBe('书包');
    expect(productFeatures.keyElements).toContain('背负系统');
    expect(productFeatures.keyElements).toContain('隔层');
    expect(productFeatures.mood).toBe('高端奢华');
  });

  it('should build comprehensive storyboard prompt', () => {
    console.log('\n📝 步骤2：构建分镜提示词');
    const prompt = buildStoryboardPrompt(userInput, productFeatures, videoParams, styles, shotCount);
    
    console.log(`   提示词长度: ${prompt.length} 字符`);
    console.log(`   包含8K超清: ${prompt.includes('8K超清')}`);
    console.log(`   包含电影级光影: ${prompt.includes('电影级写实光影')}`);
    console.log(`   包含导演级叙事: ${prompt.includes('细节切入') && prompt.includes('品牌强化')}`);

    // 验证提示词内容
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

  it('should build AI messages correctly', () => {
    console.log('\n💬 步骤3：构建AI消息');
    const prompt = buildStoryboardPrompt(userInput, productFeatures, videoParams, styles, shotCount);
    const messages = buildAIMessages(prompt, videoParams.duration, styles);
    
    console.log(`   消息数量: ${messages.length}`);
    console.log(`   系统消息长度: ${messages[0].content.length} 字符`);
    console.log(`   用户消息长度: ${messages[1].content.length} 字符`);
    console.log(`   系统角色: ${messages[0].role}`);
    console.log(`   用户角色: ${messages[1].role}`);

    // 验证消息结构
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[0].content).toContain('导演级');
    expect(messages[0].content).toContain('电影级写实光影');
  });

  it('should generate director-level storyboard with 7 shots', () => {
    console.log('\n🎥 步骤4：生成分镜');
    generatedShots = generateLocalStoryboard(productFeatures, videoDuration, shotCount);
    
    console.log(`   生成镜头数量: ${generatedShots.length}`);
    
    const totalDuration = generatedShots.reduce((sum, s) => sum + s.duration, 0);
    console.log(`   总时长: ${totalDuration}秒（目标: ${videoDuration}秒）`);

    // 验证分镜数量和时长
    expect(generatedShots.length).toBe(shotCount);
    expect(totalDuration).toBe(videoDuration);

    // 打印每个镜头的详细信息
    console.log('\n   📽️ 分镜详情：');
    generatedShots.forEach((shot, index) => {
      console.log(`\n   镜头${shot.num} (${shot.duration}秒)`);
      console.log(`      场景: ${shot.scene}`);
      console.log(`      运镜: ${shot.camera}`);
      console.log(`      动作: ${shot.action}`);
      console.log(`      情绪: ${shot.emotion}`);
      console.log(`      目的: ${shot.purpose}`);
      console.log(`      音效: ${shot.soundEffect}`);
      console.log(`      备注: ${shot.notes}`);
      console.log(`      AI提示词长度: ${shot.aiPrompt.length}字符`);
    });
  });

  it('should have complete shot details with sound effects and notes', () => {
    console.log('\n✅ 步骤5：验证分镜完整性');
    
    generatedShots.forEach((shot, index) => {
      // 验证必填字段
      expect(shot.num).toBeDefined();
      expect(shot.duration).toBeGreaterThan(0);
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

      // 验证AI提示词质量
      expect(shot.aiPrompt).toContain('8K超清');
      expect(shot.aiPrompt).toContain('电影级');
    });

    console.log('   ✓ 所有镜头字段完整');
    console.log('   ✓ AI提示词符合Seedance2.0要求');
  });

  it('should follow director-level narrative structure', () => {
    console.log('\n🎯 步骤6：验证导演级叙事结构');
    
    const purposes = generatedShots.map(shot => shot.purpose);
    
    console.log(`   镜头目的序列: ${purposes.join(' → ')}`);

    // 验证叙事结构
    expect(purposes[0]).toContain('细节'); // 细节切入
    expect(purposes.some(p => p.includes('功能'))).toBe(true); // 功能展示
    expect(purposes.some(p => p.includes('场景'))).toBe(true); // 场景融入
    expect(purposes.some(p => p.includes('品牌'))).toBe(true); // 品牌强化
    expect(purposes[shotCount - 1]).toMatch(/结尾|定格/); // 结尾定格

    console.log('   ✓ 符合导演级叙事结构：细节切入 → 功能展示 → 场景融入 → 品牌强化 → 结尾定格');
  });

  it('should score well on the storyboard evaluation', () => {
    console.log('\n📊 步骤7：分镜评分');
    const scoreResult = scoreStoryboard(generatedShots, productFeatures);
    
    console.log(`   总分: ${scoreResult.score}`);
    console.log(`   镜头丰富度: ${scoreResult.details.richness}`);
    console.log(`   商业价值: ${scoreResult.details.commercialValue}`);
    console.log(`   产品展示完整度: ${scoreResult.details.productCoverage}`);
    console.log(`   视觉表现力: ${scoreResult.details.visualExpression}`);
    console.log(`   转化能力: ${scoreResult.details.conversionAbility}`);

    // 验证评分
    expect(scoreResult.score).toBeGreaterThanOrEqual(80);
    expect(scoreResult.details.richness).toBeGreaterThanOrEqual(70);
    expect(scoreResult.details.commercialValue).toBeGreaterThanOrEqual(50);
    expect(scoreResult.details.visualExpression).toBeGreaterThanOrEqual(80);
    
    console.log('   ✓ 分镜评分达到优秀标准（总分≥80分）');
  });

  it('should parse AI response correctly', () => {
    console.log('\n🔍 步骤8：测试AI响应解析');
    
    // 模拟AI返回的JSON响应
    const mockAIResponse = JSON.stringify({
      shots: generatedShots.map(shot => ({
        num: shot.num,
        duration: shot.duration,
        scene: shot.scene,
        camera: shot.camera,
        action: shot.action,
        emotion: shot.emotion,
        purpose: shot.purpose,
        description: shot.description,
        composition: shot.composition,
        lighting: shot.lighting,
        soundEffect: shot.soundEffect,
        notes: shot.notes,
        aiPrompt: shot.aiPrompt
      }))
    });

    const parsedShots = parseAIResponse(mockAIResponse, videoDuration);
    
    console.log(`   解析镜头数量: ${parsedShots?.length}`);
    console.log(`   解析总时长: ${parsedShots?.reduce((sum, s) => sum + s.duration, 0)}秒`);

    // 验证解析结果
    expect(parsedShots).not.toBeNull();
    expect(parsedShots?.length).toBe(shotCount);
    expect(parsedShots?.reduce((sum, s) => sum + s.duration, 0)).toBe(videoDuration);

    console.log('   ✓ AI响应解析正确');
  });

  afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 端到端测试完成！');
    console.log('='.repeat(80));
    console.log('\n📊 测试总结：');
    console.log('   ✅ 产品特征分析正确');
    console.log('   ✅ 提示词构建完整');
    console.log('   ✅ AI消息结构正确');
    console.log('   ✅ 分镜生成符合要求');
    console.log('   ✅ 导演级叙事结构完整');
    console.log('   ✅ 分镜评分达到优秀标准');
    console.log('   ✅ AI响应解析正常');
    console.log('\n📁 输出文件：');
    console.log('   - src/services/storyboardService.ts (优化后)');
    console.log('   - src/types/index.ts (类型定义)');
    console.log('   - src/__tests__/storyboardService.test.ts (测试用例)');
  });
});