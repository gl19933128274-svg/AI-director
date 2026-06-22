/**
 * Storyboard Director System 集成层
 * 
 * 将导演级分镜规则系统与现有的分镜服务集成
 */

import {
  STORYBOARD_DIRECTOR_SYSTEM,
  ProductFeatures,
  ShotDetail,
  StoryboardResult
} from './storyboardDirectorSystem';
import {
  analyzeProductFeatures,
  buildStoryboardPrompt,
  buildAIMessages
} from './storyboardService';

/**
 * 使用导演系统生成分镜提示词
 */
export function buildDirectorStoryboardPrompt(
  userDescription: string,
  features: ProductFeatures,
  params: any,
  styles: string[],
  imageCount: number
): string {
  // 1. 使用导演系统获取配置
  const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig(features.productCategory);
  const durationConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getDurationConfig(params.duration);
  const matchedStyles = STORYBOARD_DIRECTOR_SYSTEM.utils.matchStyleByKeywords(userDescription);
  
  // 2. 生成分镜结构
  const structure = STORYBOARD_DIRECTOR_SYSTEM.utils.generateStoryboardStructure(
    features.productCategory,
    params.duration,
    styles.length > 0 ? styles : matchedStyles
  );
  
  // 3. 计算镜头时长
  const durations = STORYBOARD_DIRECTOR_SYSTEM.utils.calculateShotDurations(
    structure,
    params.duration
  );
  
  // 4. 构建导演级提示词
  const styleLabels = (styles.length > 0 ? styles : matchedStyles).map(s => {
    const styleRule = STORYBOARD_DIRECTOR_SYSTEM.emotionStyles[s];
    return styleRule ? styleRule.name : s;
  }).join('、');

  const prompt = `
你是一位专业的商业广告分镜导演，擅长制作高质量的产品广告。请根据以下导演级规则生成专业的分镜脚本：

【用户场景描述】
${userDescription}

【产品特征分析】
- 产品类型：${features.productType}
- 产品类别：${features.productCategory}
- 关键元素：${features.keyElements.join('、')}
- 情绪风格：${features.mood}
- 目标受众：${features.targetAudience}
- 是否包含模特：${features.hasModel ? '是' : '否'}
- 是否包含场景：${features.hasScene ? '是' : '否'}

【导演级场景规则】
推荐场景：${productConfig.defaultScenes.map(sceneKey => {
  const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes[features.productCategory]?.[sceneKey];
  return sceneRule ? `${sceneRule.name}（${sceneRule.description}）` : sceneKey;
}).join('、')}

【导演级人物规则】
推荐人物：${productConfig.defaultCharacters.map(charKey => {
  const charRule = STORYBOARD_DIRECTOR_SYSTEM.characters[features.productCategory]?.[charKey];
  return charRule ? `${charRule.name}（${charRule.description}）` : charKey;
}).join('、')}

【导演级运镜规则】
可用运镜：${Object.keys(STORYBOARD_DIRECTOR_SYSTEM.cameraMovements).map(key => 
  STORYBOARD_DIRECTOR_SYSTEM.cameraMovements[key].name
).join('、')}

【导演级镜头结构】
分镜结构：${structure.map((type, index) => {
  const structureRule = STORYBOARD_DIRECTOR_SYSTEM.shotStructures[type];
  return `${index + 1}. ${structureRule.name}（${structureRule.purpose}，${durations[index]}秒）`;
}).join('\n')}

【视频参数】
- 总时长：${params.duration}秒
- 画面比例：${params.aspectRatio}
- 分辨率：${params.resolution}
- 视觉风格：${styleLabels}

【素材信息】
- 参考图片数量：${imageCount}张

【导演级创作要求】
1. 严格遵循上述分镜结构，确保叙事逻辑清晰
2. 根据产品类型自动匹配最合适的场景和人物
3. 运镜方式要符合镜头结构的要求
4. 每个镜头都要有明确的情感表达和目的
5. 确保镜头多样性，避免重复
6. AI提示词要详细描述画面内容，便于视频生成

【镜头要求】
每个镜头必须包含：
- scene（场景描述）：从推荐场景中选择或创建合适的场景
- camera（运镜方式）：从可用运镜中选择最合适的方式
- action（人物动作/产品动作）：符合人物特征和产品特点
- emotion（情绪表达）：匹配整体风格氛围
- purpose（镜头目的）：明确这个镜头要达到什么效果
- description（镜头描述）：详细描述镜头内容
- composition（构图方式）：符合风格要求的构图
- lighting（光影效果）：匹配场景和风格的光影
- aiPrompt（AI生成提示）：详细的画面描述，用于视频生成

【输出格式】
请输出JSON格式，包含shots数组，每个元素包含：num, duration, scene, camera, action, emotion, purpose, description, composition, lighting, aiPrompt

镜头数量：${structure.length}个
总时长必须精确等于${params.duration}秒

示例输出格式：
{
  "shots": [
    {
      "num": 1,
      "duration": ${durations[0]},
      "scene": "高端摄影棚",
      "camera": "推镜头",
      "action": "模特自信走入画面",
      "emotion": "${styleLabels.split('、')[0]}",
      "purpose": "${STORYBOARD_DIRECTOR_SYSTEM.shotStructures[structure[0]].purpose}",
      "description": "开场镜头，模特穿着产品优雅出场",
      "composition": "中心构图",
      "lighting": "专业柔光",
      "aiPrompt": "高端时尚模特穿着产品在摄影棚走秀，${styleLabels.split('、')[0]}风格"
    }
  ]
}
  `.trim();
  
  return prompt;
}

/**
 * 使用导演系统构建AI消息
 */
export function buildDirectorAIMessages(
  prompt: string,
  duration: string,
  styles: string[]
) {
  const styleLabels = styles.map(s => {
    const styleRule = STORYBOARD_DIRECTOR_SYSTEM.emotionStyles[s];
    return styleRule ? styleRule.name : s;
  }).join('、');
  
  return [
    {
      role: 'system' as const,
      content: `
你是一位专业的商业广告分镜导演，精通导演级分镜规则。请严格按照JSON格式输出分镜脚本。

导演级要求：
1. 输出格式必须是纯JSON，不包含任何解释文字
2. 必须包含shots数组
3. 每个镜头必须包含：num, duration, scene, camera, action, emotion, purpose, description, composition, lighting, aiPrompt
4. 严格遵循指定的分镜结构和时长分配
5. 总时长必须精确等于${duration}秒
6. 风格：${styleLabels}
7. 根据产品类型自动匹配最合适的场景、人物和运镜
8. 确保镜头多样性，避免重复镜头类型
9. aiPrompt字段用于视频生成，需要详细描述画面内容
10. 每个镜头都要有明确的情感表达和商业目的
      `.trim()
    },
    {
      role: 'user' as const,
      content: prompt
    }
  ];
}

/**
 * 使用导演系统增强分镜结果
 */
export function enhanceStoryboardWithDirectorSystem(
  shots: ShotDetail[],
  features: ProductFeatures
): StoryboardResult {
  // 1. 使用导演系统评估质量
  const qualityAssessment = STORYBOARD_DIRECTOR_SYSTEM.utils.assessStoryboardQuality(shots);
  
  // 2. 检查并优化分镜
  const enhancedShots = optimizeShotsWithDirectorRules(shots, features);
  
  // 3. 计算总时长
  const totalDuration = enhancedShots.reduce((sum, shot) => sum + shot.duration, 0);
  
  return {
    shots: enhancedShots,
    totalDuration,
    targetDuration: totalDuration,
    score: qualityAssessment.score,
    scoreDetails: qualityAssessment.details,
    regenerateCount: 0
  };
}

/**
 * 使用导演规则优化分镜
 */
function optimizeShotsWithDirectorRules(
  shots: ShotDetail[],
  features: ProductFeatures
): ShotDetail[] {
  const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig(features.productCategory);
  
  return shots.map((shot, index) => {
    // 1. 确定镜头结构类型
    const structureTypes = Object.keys(STORYBOARD_DIRECTOR_SYSTEM.shotStructures);
    const structureType = structureTypes[index % structureTypes.length];
    const structureRule = STORYBOARD_DIRECTOR_SYSTEM.shotStructures[structureType];
    
    // 2. 优化运镜方式
    const recommendedCameras = STORYBOARD_DIRECTOR_SYSTEM.utils.getRecommendedCameraMovement(structureType);
    const optimizedCamera = optimizeCameraMovement(shot.camera, recommendedCameras);
    
    // 3. 优化场景描述
    const optimizedScene = optimizeSceneDescription(shot.scene, features, productConfig);
    
    // 4. 优化光影效果
    const optimizedLighting = optimizeLighting(shot.lighting, structureType, features);
    
    // 5. 优化构图方式
    const optimizedComposition = optimizeComposition(shot.composition, structureType, features);
    
    return {
      ...shot,
      camera: optimizedCamera,
      scene: optimizedScene,
      lighting: optimizedLighting,
      composition: optimizedComposition,
      purpose: structureRule.purpose
    };
  });
}

/**
 * 优化运镜方式
 */
function optimizeCameraMovement(
  currentCamera: string,
  recommendedCameras: string[]
): string {
  // 如果当前运镜在推荐列表中，保持不变
  if (recommendedCameras.includes(currentCamera)) {
    return currentCamera;
  }
  
  // 否则返回推荐的运镜方式
  const cameraRule = STORYBOARD_DIRECTOR_SYSTEM.cameraMovements[recommendedCameras[0]];
  return cameraRule ? cameraRule.name : currentCamera;
}

/**
 * 优化场景描述
 */
function optimizeSceneDescription(
  currentScene: string,
  features: ProductFeatures,
  productConfig: any
): string {
  // 检查当前场景是否在推荐场景中
  const sceneKeys = Object.keys(STORYBOARD_DIRECTOR_SYSTEM.scenes[features.productCategory] || {});
  const matchingScene = sceneKeys.find(key => {
    const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes[features.productCategory]?.[key];
    return sceneRule && (currentScene.includes(sceneRule.name) || sceneRule.name.includes(currentScene));
  });
  
  if (matchingScene) {
    const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes[features.productCategory][matchingScene];
    return sceneRule.name;
  }
  
  // 如果没有匹配，返回第一个推荐场景
  const firstSceneKey = productConfig.defaultScenes[0];
  const firstSceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes[features.productCategory]?.[firstSceneKey];
  return firstSceneRule ? firstSceneRule.name : currentScene;
}

/**
 * 优化光影效果
 */
function optimizeLighting(
  currentLighting: string,
  structureType: string,
  features: ProductFeatures
): string {
  // 根据镜头结构类型优化光影
  const lightingMap: Record<string, string> = {
    opening: '专业柔光+轮廓光',
    overallDisplay: '环境光+补光',
    detailDisplay: '微距灯光+柔光',
    functionDisplay: '自然光+环境光',
    brandReinforcement: '品牌色调灯光',
    closing: '综合布光+柔光'
  };
  
  return lightingMap[structureType] || currentLighting;
}

/**
 * 优化构图方式
 */
function optimizeComposition(
  currentComposition: string,
  structureType: string,
  features: ProductFeatures
): string {
  // 根据镜头结构类型优化构图
  const compositionMap: Record<string, string> = {
    opening: '中心构图+冲击力',
    overallDisplay: '三分法构图+全景',
    detailDisplay: '特写构图+微距',
    functionDisplay: '过程构图+动态',
    brandReinforcement: '品牌元素居中+对称',
    closing: '对称构图+稳定'
  };
  
  return compositionMap[structureType] || currentComposition;
}

/**
 * 使用导演系统生成分镜（完整流程）
 */
export async function generateStoryboardWithDirectorSystem(
  userDescription: string,
  params: any,
  styles: string[],
  imageCount: number
): Promise<StoryboardResult> {
  // 1. 分析产品特征
  const features = analyzeProductFeatures(userDescription);
  
  // 2. 构建导演级提示词
  const prompt = buildDirectorStoryboardPrompt(
    userDescription,
    features,
    params,
    styles,
    imageCount
  );
  
  // 3. 构建AI消息
  const messages = buildDirectorAIMessages(prompt, params.duration.toString(), styles);
  
  // 4. 调用AI生成分镜（这里需要调用实际的AI服务）
  // const aiResponse = await callAIService(messages);
  // const shots = parseAIResponse(aiResponse);
  
  // 5. 使用导演系统增强分镜
  // const enhancedResult = enhanceStoryboardWithDirectorSystem(shots, features);
  
  // 返回提示词和消息，供实际AI调用使用
  return {
    shots: [], // 实际使用时需要填充AI生成的分镜
    totalDuration: 0,
    targetDuration: params.duration,
    score: 0,
    scoreDetails: {
      richness: 0,
      commercialValue: 0,
      productCoverage: 0,
      visualExpression: 0,
      conversionAbility: 0
    },
    regenerateCount: 0
  } as StoryboardResult;
}

/**
 * 导出导演系统集成工具
 */
export const directorSystemIntegration = {
  buildDirectorStoryboardPrompt,
  buildDirectorAIMessages,
  enhanceStoryboardWithDirectorSystem,
  generateStoryboardWithDirectorSystem
};