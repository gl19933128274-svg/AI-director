/**
 * Storyboard Director System 使用示例
 * 
 * 演示如何使用导演级分镜规则系统生成高质量分镜
 */

import {
  STORYBOARD_DIRECTOR_SYSTEM,
  ProductFeatures,
  ShotDetail
} from './storyboardDirectorSystem';

/**
 * 示例1: 服装类产品分镜生成
 */
export function generateClothingStoryboardExample() {
  console.log('=== 服装类产品分镜生成示例 ===\n');

  // 1. 分析产品特征
  const productFeatures: ProductFeatures = {
    productType: '服装',
    productCategory: 'clothing',
    keyElements: ['面料', '剪裁', '颜色', '搭配', '版型', '细节'],
    mood: '高端奢华',
    targetAudience: '商务人士',
    hasModel: true,
    hasScene: true
  };

  // 2. 获取产品配置
  const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig('clothing');
  console.log('产品配置:', productConfig);

  // 3. 生成分镜结构
  const duration = 15; // 15秒视频
  const structure = STORYBOARD_DIRECTOR_SYSTEM.utils.generateStoryboardStructure(
    'clothing',
    duration
  );
  console.log('\n分镜结构:', structure);

  // 4. 计算镜头时长
  const durations = STORYBOARD_DIRECTOR_SYSTEM.utils.calculateShotDurations(
    structure,
    duration
  );
  console.log('镜头时长分配:', durations);

  // 5. 生成具体分镜
  const shots: ShotDetail[] = structure.map((type, index) => {
    const shotStructure = STORYBOARD_DIRECTOR_SYSTEM.shotStructures[type];
    const cameraMovements = STORYBOARD_DIRECTOR_SYSTEM.utils.getRecommendedCameraMovement(type);
    const selectedCamera = cameraMovements[Math.floor(Math.random() * cameraMovements.length)];
    const cameraRule = STORYBOARD_DIRECTOR_SYSTEM.cameraMovements[selectedCamera];

    // 选择场景
    const sceneOptions = productConfig.defaultScenes;
    const selectedSceneKey = sceneOptions[index % sceneOptions.length];
    const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes.clothing[selectedSceneKey];

    // 选择人物
    const characterOptions = productConfig.defaultCharacters;
    const selectedCharacterKey = characterOptions[index % characterOptions.length];
    const characterRule = STORYBOARD_DIRECTOR_SYSTEM.characters.clothing[selectedCharacterKey];

    // 选择风格
    const styleKey = productConfig.defaultStyles[0];
    const styleRule = STORYBOARD_DIRECTOR_SYSTEM.emotionStyles[styleKey];

    return {
      num: index + 1,
      duration: durations[index],
      scene: sceneRule.name,
      camera: cameraRule.name,
      action: generateActionForShot(type, characterRule, productFeatures),
      emotion: styleRule.name,
      purpose: shotStructure.purpose,
      description: generateDescriptionForShot(type, sceneRule, characterRule, productFeatures),
      composition: styleRule.composition,
      lighting: sceneRule.lighting,
      aiPrompt: generateAIPromptForShot(type, sceneRule, characterRule, productFeatures, styleRule)
    };
  });

  console.log('\n生成的分镜:');
  shots.forEach(shot => {
    console.log(`\n镜头 ${shot.num} (${shot.duration}秒):`);
    console.log(`  场景: ${shot.scene}`);
    console.log(`  运镜: ${shot.camera}`);
    console.log(`  动作: ${shot.action}`);
    console.log(`  情绪: ${shot.emotion}`);
    console.log(`  目的: ${shot.purpose}`);
    console.log(`  描述: ${shot.description}`);
    console.log(`  构图: ${shot.composition}`);
    console.log(`  光影: ${shot.lighting}`);
    console.log(`  AI提示: ${shot.aiPrompt}`);
  });

  // 6. 评估质量
  const quality = STORYBOARD_DIRECTOR_SYSTEM.utils.assessStoryboardQuality(shots);
  console.log('\n质量评估:');
  console.log(`  总分: ${quality.score}`);
  console.log(`  镜头丰富度: ${quality.details.richness}`);
  console.log(`  商业价值: ${quality.details.commercialValue}`);
  console.log(`  产品覆盖度: ${quality.details.productCoverage}`);
  console.log(`  视觉表现力: ${quality.details.visualExpression}`);
  console.log(`  转化能力: ${quality.details.conversionAbility}`);

  return shots;
}

/**
 * 示例2: 箱包类产品分镜生成
 */
export function generateBagStoryboardExample() {
  console.log('\n\n=== 箱包类产品分镜生成示例 ===\n');

  const productFeatures: ProductFeatures = {
    productType: '箱包',
    productCategory: 'bag',
    keyElements: ['材质', '容量', '细节', '工艺', '设计', '功能性'],
    mood: '时尚潮流',
    targetAudience: '年轻职场人',
    hasModel: true,
    hasScene: true
  };

  const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig('bag');
  const duration = 12;
  const structure = STORYBOARD_DIRECTOR_SYSTEM.utils.generateStoryboardStructure('bag', duration);
  const durations = STORYBOARD_DIRECTOR_SYSTEM.utils.calculateShotDurations(structure, duration);

  const shots: ShotDetail[] = structure.map((type, index) => {
    const shotStructure = STORYBOARD_DIRECTOR_SYSTEM.shotStructures[type];
    const cameraMovements = STORYBOARD_DIRECTOR_SYSTEM.utils.getRecommendedCameraMovement(type);
    const selectedCamera = cameraMovements[Math.floor(Math.random() * cameraMovements.length)];
    const cameraRule = STORYBOARD_DIRECTOR_SYSTEM.cameraMovements[selectedCamera];

    const sceneOptions = productConfig.defaultScenes;
    const selectedSceneKey = sceneOptions[index % sceneOptions.length];
    const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes.bag[selectedSceneKey];

    const characterOptions = productConfig.defaultCharacters;
    const selectedCharacterKey = characterOptions[index % characterOptions.length];
    const characterRule = STORYBOARD_DIRECTOR_SYSTEM.characters.bag[selectedCharacterKey];

    const styleKey = productConfig.defaultStyles[1];
    const styleRule = STORYBOARD_DIRECTOR_SYSTEM.emotionStyles[styleKey];

    return {
      num: index + 1,
      duration: durations[index],
      scene: sceneRule.name,
      camera: cameraRule.name,
      action: generateActionForShot(type, characterRule, productFeatures),
      emotion: styleRule.name,
      purpose: shotStructure.purpose,
      description: generateDescriptionForShot(type, sceneRule, characterRule, productFeatures),
      composition: styleRule.composition,
      lighting: sceneRule.lighting,
      aiPrompt: generateAIPromptForShot(type, sceneRule, characterRule, productFeatures, styleRule)
    };
  });

  console.log('生成的分镜:');
  shots.forEach(shot => {
    console.log(`\n镜头 ${shot.num} (${shot.duration}秒):`);
    console.log(`  场景: ${shot.scene}`);
    console.log(`  运镜: ${shot.camera}`);
    console.log(`  动作: ${shot.action}`);
    console.log(`  情绪: ${shot.emotion}`);
    console.log(`  目的: ${shot.purpose}`);
  });

  return shots;
}

/**
 * 示例3: 根据用户描述智能生成分镜
 */
export function generateSmartStoryboard(userDescription: string, duration: number) {
  console.log(`\n\n=== 智能分镜生成示例 ===`);
  console.log(`用户描述: ${userDescription}`);
  console.log(`视频时长: ${duration}秒\n`);

  // 1. 分析用户描述，提取产品类型和风格
  const productType = analyzeProductType(userDescription);
  const matchedStyles = STORYBOARD_DIRECTOR_SYSTEM.utils.matchStyleByKeywords(userDescription);
  
  console.log(`识别产品类型: ${productType}`);
  console.log(`匹配风格: ${matchedStyles.join(', ')}`);

  // 2. 获取配置
  const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig(productType);
  const structure = STORYBOARD_DIRECTOR_SYSTEM.utils.generateStoryboardStructure(
    productType,
    duration,
    matchedStyles
  );
  const durations = STORYBOARD_DIRECTOR_SYSTEM.utils.calculateShotDurations(structure, duration);

  // 3. 生成分镜
  const shots: ShotDetail[] = structure.map((type, index) => {
    const shotStructure = STORYBOARD_DIRECTOR_SYSTEM.shotStructures[type];
    const cameraMovements = STORYBOARD_DIRECTOR_SYSTEM.utils.getRecommendedCameraMovement(type);
    const selectedCamera = cameraMovements[Math.floor(Math.random() * cameraMovements.length)];
    const cameraRule = STORYBOARD_DIRECTOR_SYSTEM.cameraMovements[selectedCamera];

    const sceneOptions = productConfig.defaultScenes;
    const selectedSceneKey = sceneOptions[index % sceneOptions.length];
    const sceneRule = STORYBOARD_DIRECTOR_SYSTEM.scenes[productType][selectedSceneKey];

    const characterOptions = productConfig.defaultCharacters;
    const selectedCharacterKey = characterOptions[index % characterOptions.length];
    const characterRule = STORYBOARD_DIRECTOR_SYSTEM.characters[productType][selectedCharacterKey];

    const styleKey = matchedStyles[0] || productConfig.defaultStyles[0];
    const styleRule = STORYBOARD_DIRECTOR_SYSTEM.emotionStyles[styleKey];

    return {
      num: index + 1,
      duration: durations[index],
      scene: sceneRule.name,
      camera: cameraRule.name,
      action: generateActionForShot(type, characterRule, {
        productType: productConfig.category,
        productCategory: productType,
        keyElements: [],
        mood: styleRule.name,
        targetAudience: '',
        hasModel: true,
        hasScene: true
      }),
      emotion: styleRule.name,
      purpose: shotStructure.purpose,
      description: generateDescriptionForShot(type, sceneRule, characterRule, {
        productType: productConfig.category,
        productCategory: productType,
        keyElements: [],
        mood: styleRule.name,
        targetAudience: '',
        hasModel: true,
        hasScene: true
      }),
      composition: styleRule.composition,
      lighting: sceneRule.lighting,
      aiPrompt: generateAIPromptForShot(type, sceneRule, characterRule, {
        productType: productConfig.category,
        productCategory: productType,
        keyElements: [],
        mood: styleRule.name,
        targetAudience: '',
        hasModel: true,
        hasScene: true
      }, styleRule)
    };
  });

  console.log('\n生成的分镜:');
  shots.forEach(shot => {
    console.log(`镜头 ${shot.num}: ${shot.scene} | ${shot.camera} | ${shot.emotion}`);
  });

  // 4. 评估质量
  const quality = STORYBOARD_DIRECTOR_SYSTEM.utils.assessStoryboardQuality(shots);
  console.log(`\n质量评分: ${quality.score}/100`);

  return shots;
}

// ==================== 辅助函数 ====================

/**
 * 根据用户描述分析产品类型
 */
function analyzeProductType(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  const typeKeywords: Record<string, string[]> = {
    clothing: ['服装', '衣服', '衬衫', '裤子', '裙子', '外套', '毛衣', 't恤', '卫衣', '夹克', '西装'],
    bag: ['包', '箱包', '背包', '手提包', '钱包', '挎包', '旅行包', '公文包'],
    pet: ['宠物', '猫', '狗', '猫粮', '狗粮', '宠物用品'],
    furniture: ['家具', '沙发', '桌子', '椅子', '床', '柜子', '书架'],
    digital: ['手机', '电脑', '平板', '耳机', '手表', '相机', '充电器', '电子产品'],
    beauty: ['化妆品', '护肤品', '香水', '口红', '面霜', '面膜', '彩妆'],
    food: ['食品', '饮料', '零食', '咖啡', '茶', '巧克力', '蛋糕']
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return type;
    }
  }

  return 'clothing'; // 默认返回服装类
}

/**
 * 为镜头生成动作描述
 */
function generateActionForShot(
  shotType: string,
  character: any,
  features: ProductFeatures
): string {
  const actions: Record<string, string> = {
    opening: `${character.name}自信出场，优雅站立`,
    overallDisplay: `${character.name}展示产品整体效果`,
    detailDisplay: `特写展示产品细节和质感`,
    functionDisplay: `${character.name}演示产品功能`,
    brandReinforcement: `${character.name}展示品牌元素`,
    closing: `${character.name}微笑定格，强化印象`
  };

  return actions[shotType] || `${character.name}展示产品`;
}

/**
 * 为镜头生成描述
 */
function generateDescriptionForShot(
  shotType: string,
  scene: any,
  character: any,
  features: ProductFeatures
): string {
  const descriptions: Record<string, string> = {
    opening: `开场镜头，${character.name}在${scene.name}中自信出场，建立${features.mood}氛围`,
    overallDisplay: `${character.name}在${scene.name}展示${features.productType}的整体效果`,
    detailDisplay: `特写镜头，展示${features.productType}的精致细节和高端质感`,
    functionDisplay: `${character.name}在${scene.name}演示${features.productType}的核心功能`,
    brandReinforcement: `${character.name}展示品牌元素，强化品牌认知`,
    closing: `结束镜头，${character.name}微笑定格，留下深刻印象`
  };

  return descriptions[shotType] || `${character.name}在${scene.name}展示${features.productType}`;
}

/**
 * 为镜头生成AI提示
 */
function generateAIPromptForShot(
  shotType: string,
  scene: any,
  character: any,
  features: ProductFeatures,
  style: any
): string {
  const basePrompt = `${style.name}风格，${character.description}，`;
  
  const shotPrompts: Record<string, string> = {
    opening: `${basePrompt}${scene.name}环境，${character.name}自信出场，${scene.lighting}，${style.composition}`,
    overallDisplay: `${basePrompt}${scene.name}，展示${features.productType}整体效果，${scene.lighting}，${style.composition}`,
    detailDisplay: `${basePrompt}特写镜头，展示${features.productType}精致细节，${scene.lighting}，微距构图`,
    functionDisplay: `${basePrompt}${scene.name}，演示${features.productType}功能，${scene.lighting}，${style.composition}`,
    brandReinforcement: `${basePrompt}展示品牌元素，${scene.lighting}，${style.composition}`,
    closing: `${basePrompt}${character.name}微笑定格，${scene.lighting}，${style.composition}`
  };

  return shotPrompts[shotType] || `${basePrompt}${scene.name}，展示${features.productType}`;
}

// ==================== 导出示例函数 ====================
export const storyboardExamples = {
  generateClothingStoryboardExample,
  generateBagStoryboardExample,
  generateSmartStoryboard
};

// 如果直接运行此文件，执行示例
if (require.main === module) {
  console.log('Storyboard Director System 使用示例\n');
  console.log('=====================================\n');

  // 运行服装类示例
  generateClothingStoryboardExample();

  // 运行箱包类示例
  generateBagStoryboardExample();

  // 运行智能生成示例
  generateSmartStoryboard('高端时尚男装，展现商务精英气质', 15);
  generateSmartStoryboard('轻奢风格女包，适合都市通勤', 12);
  generateSmartStoryboard('治愈系宠物用品，温馨家庭场景', 10);
}