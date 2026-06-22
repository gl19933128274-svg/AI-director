/**
 * Storyboard Director System - 书包产品导演级分镜演示
 * 
 * 演示如何使用优化后的系统生成商业导演级分镜
 */

import {
  analyzeProductFeatures,
  generateLocalStoryboard,
  buildStoryboardPrompt,
  buildAIMessages,
  ShotDetail
} from './storyboardService';

/**
 * 书包产品分镜生成演示
 */
export function generateBackpackStoryboardDemo(): ShotDetail[] {
  console.log('=== 书包产品导演级分镜演示 ===\n');
  
  // 1. 用户输入参数
  const userDescription = '高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感';
  const duration = 15; // 15秒
  const imageCount = 7; // 7个核心镜头
  
  console.log('【用户输入】');
  console.log(`产品描述: ${userDescription}`);
  console.log(`视频时长: ${duration}秒`);
  console.log(`镜头数量: ${imageCount}个`);
  console.log(`视频比例: 16:9`);
  console.log(`分辨率: 8K超清\n`);
  
  // 2. 分析产品特征
  const features = analyzeProductFeatures(userDescription);
  console.log('【产品特征分析】');
  console.log(`产品类型: ${features.productType}`);
  console.log(`产品类别: ${features.productCategory}`);
  console.log(`关键元素: ${features.keyElements.join('、')}`);
  console.log(`情绪风格: ${features.mood}`);
  console.log(`目标受众: ${features.targetAudience}\n`);
  
  // 3. 生成分镜
  const shots = generateLocalStoryboard(features, duration, imageCount);
  
  // 4. 输出分镜详情
  console.log('【导演级分镜脚本】');
  console.log('='.repeat(80));
  
  shots.forEach((shot, index) => {
    console.log(`\n📽️ 镜头 ${shot.num} (${shot.duration}秒)`);
    console.log('─'.repeat(80));
    console.log(`【画面描述】${shot.description}`);
    console.log(`【场景】${shot.scene}`);
    console.log(`【运镜】${shot.camera}`);
    console.log(`【动作】${shot.action}`);
    console.log(`【情绪】${shot.emotion}`);
    console.log(`【目的】${shot.purpose}`);
    console.log(`【构图】${shot.composition}`);
    console.log(`【光影】${shot.lighting}`);
    console.log(`【音效】${shot.soundEffect}`);
    console.log(`【备注】${shot.notes}`);
    console.log(`【AI提示词】${shot.aiPrompt}`);
  });
  
  // 5. 统计信息
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  console.log('\n' + '='.repeat(80));
  console.log('【分镜统计】');
  console.log(`总时长: ${totalDuration}秒`);
  console.log(`镜头数量: ${shots.length}个`);
  console.log(`平均镜头时长: ${(totalDuration / shots.length).toFixed(1)}秒`);
  
  return shots;
}

/**
 * 生成专业分镜提示词演示
 */
export function generateBackpackPromptDemo() {
  console.log('\n\n=== 专业分镜提示词演示 ===\n');
  
  const userDescription = '高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感';
  const features = analyzeProductFeatures(userDescription);
  
  const params = {
    duration: 15,
    aspectRatio: '16:9',
    resolution: '8K'
  };
  
  const styles = ['low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute'];
  
  const prompt = buildStoryboardPrompt(userDescription, features, params as any, styles, 7);
  console.log('【生成的Prompt】');
  console.log(prompt);
  
  const messages = buildAIMessages(prompt, '15', styles);
  console.log('\n【AI消息结构】');
  console.log(`系统消息长度: ${messages[0].content.length}字符`);
  console.log(`用户消息长度: ${messages[1].content.length}字符`);
}

// 执行演示
if (require.main === module) {
  generateBackpackStoryboardDemo();
  generateBackpackPromptDemo();
}

// 导出示例函数
export const backpackDemo = {
  generateBackpackStoryboardDemo,
  generateBackpackPromptDemo
};