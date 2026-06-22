import { VideoParams, ProductFeatures, ShotDetail } from '@/types';
import { promptCache, resultCache, featuresCache } from './cache';

/**
 * Storyboard Service Logger
 * 详细日志记录系统，支持不同级别和模块的日志输出
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

function log(level: LogEntry['level'], module: string, message: string, data?: Record<string, unknown>) {
  const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[LOG_LEVEL] || 1;
  const messageLevel = levels[level];
  
  if (messageLevel >= currentLevel) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    };
    
    const logPrefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const dataStr = data ? JSON.stringify(data, null, 2) : '';
    
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(logPrefix, message, dataStr);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(logPrefix, message, dataStr);
    } else {
      // eslint-disable-next-line no-console
      console.log(logPrefix, message, dataStr);
    }
  }
}

const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>) => log('debug', module, message, data),
  info: (module: string, message: string, data?: Record<string, unknown>) => log('info', module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) => log('warn', module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) => log('error', module, message, data)
};

export interface StoryboardResult {
  shots: ShotDetail[];
  totalDuration: number;
  targetDuration: number;
  score: number;
  scoreDetails: {
    richness: number;
    commercialValue: number;
    productCoverage: number;
    visualExpression: number;
    conversionAbility: number;
  };
  regenerateCount: number;
}

const PRODUCT_CATEGORIES = {
  clothing: {
    keywords: ['服装', '衣服', '衬衫', '裤子', '裙子', '外套', '毛衣', 'T恤', '卫衣', '夹克', '西装', '礼服'],
    name: '服装',
    icon: '👔'
  },
  backpack: {
    keywords: ['书包', '双肩包', '学生包', '校园包', '通勤背包'],
    name: '书包',
    icon: '🎒'
  },
  bag: {
    keywords: ['包', '箱包', '手提包', '钱包', '挎包', '旅行包', '公文包', '背包'],
    name: '箱包',
    icon: '👜'
  },
  pet: {
    keywords: ['宠物', '猫', '狗', '猫粮', '狗粮', '宠物用品'],
    name: '宠物用品',
    icon: '🐾'
  },
  furniture: {
    keywords: ['家具', '沙发', '桌子', '椅子', '床', '柜子', '书架'],
    name: '家具',
    icon: '🛋️'
  },
  digital: {
    keywords: ['手机', '电脑', '平板', '耳机', '手表', '相机', '充电器', '电子产品'],
    name: '数码产品',
    icon: '📱'
  },
  beauty: {
    keywords: ['化妆品', '护肤品', '香水', '口红', '面霜', '面膜', '彩妆'],
    name: '美妆产品',
    icon: '💄'
  },
  food: {
    keywords: ['食品', '饮料', '零食', '咖啡', '茶', '巧克力', '蛋糕'],
    name: '食品饮料',
    icon: '🍔'
  },
  other: {
    keywords: [],
    name: '其他',
    icon: '📦'
  }
};

const STYLE_LABELS: Record<string, string> = {
  'realistic': '写实',
  'cartoon': '卡通',
  'oil-painting': '油画',
  'cg': 'CG',
  'cinematic': '电影感',
  'commercial': '广告风',
  'documentary': '纪录片',
  'low-saturation': '低饱和',
  'premium': '高级感',
  'healing': '治愈系',
  'vintage': '复古',
  'clean': '干净',
  'academic': '学院风',
  'commute': '通勤质感',
  'minimalist': '极简',
  'western': '欧美广告风',
};

export function analyzeProductFeatures(description: string): ProductFeatures {
  logger.debug('storyboardService', '开始分析产品特征', { description });
  
  // 检查缓存
  const cacheKey = { description: description.toLowerCase().trim() };
  const cached = featuresCache.get(cacheKey);
  if (cached) {
    logger.info('storyboardService', '产品特征分析缓存命中', { description });
    return cached as ProductFeatures;
  }
  
  const lowerDesc = description.toLowerCase();
  
  let productCategory: string = 'other';
  for (const [key, value] of Object.entries(PRODUCT_CATEGORIES)) {
    if (value.keywords.some(kw => lowerDesc.includes(kw.toLowerCase()))) {
      productCategory = key;
      break;
    }
  }
  
  const category = PRODUCT_CATEGORIES[productCategory as keyof typeof PRODUCT_CATEGORIES];
  
  const hasModel: boolean = lowerDesc.includes('模特') || lowerDesc.includes('男模') || lowerDesc.includes('女模') || lowerDesc.includes('人物');
  const hasScene: boolean = lowerDesc.includes('场景') || lowerDesc.includes('背景') || lowerDesc.includes('环境');
  
  const result = {
    productType: category.name,
    productCategory: productCategory,
    keyElements: getKeyElements(productCategory),
    mood: analyzeMood(lowerDesc),
    targetAudience: analyzeAudience(lowerDesc),
    hasModel: hasModel,
    hasScene: hasScene
  } as unknown as ProductFeatures;
  
  // 存入缓存
  featuresCache.set(cacheKey, result);
  
  logger.info('storyboardService', '产品特征分析完成', result);
  
  return result;
}

function getKeyElements(category: string): string[] {
  const elements: Record<string, string[]> = {
    clothing: ['面料', '剪裁', '颜色', '搭配', '版型', '细节'],
    bag: ['材质', '容量', '细节', '工艺', '设计', '功能性'],
    backpack: ['材质', '容量', '隔层', '背负系统', '细节', '设计', '耐用性', '防水性'],
    pet: ['材质', '安全性', '趣味性', '实用性', '互动性'],
    furniture: ['材质', '工艺', '设计', '空间感', '舒适度'],
    digital: ['屏幕', '摄像头', '性能', '设计', '功能'],
    beauty: ['质地', '成分', '效果', '包装', '安全性'],
    food: ['成分', '口感', '包装', '营养', '新鲜度'],
    other: ['外观', '功能', '特点', '优势']
  };
  return elements[category] || elements.other;
}

function analyzeMood(desc: string): string {
  if (desc.includes('高端') || desc.includes('奢华') || desc.includes('精致') || desc.includes('高级感')) {
    return '高端奢华';
  }
  if (desc.includes('时尚') || desc.includes('潮流') || desc.includes('年轻')) {
    return '时尚潮流';
  }
  if (desc.includes('简约') || desc.includes('极简') || desc.includes('清新')) {
    return '简约清新';
  }
  if (desc.includes('科技') || desc.includes('未来') || desc.includes('创新')) {
    return '科技未来';
  }
  if (desc.includes('温馨') || desc.includes('治愈') || desc.includes('温暖')) {
    return '温馨治愈';
  }
  return '专业大气';
}

function analyzeAudience(desc: string): string {
  if (desc.includes('年轻人') || desc.includes('学生') || desc.includes('Z世代')) {
    return '年轻人';
  }
  if (desc.includes('商务') || desc.includes('职场') || desc.includes('白领')) {
    return '商务人士';
  }
  if (desc.includes('家庭') || desc.includes('亲子') || desc.includes('儿童')) {
    return '家庭用户';
  }
  if (desc.includes('女性') || desc.includes('女士')) {
    return '女性用户';
  }
  if (desc.includes('男性') || desc.includes('男士')) {
    return '男性用户';
  }
  return '大众用户';
}

const SHOT_TEMPLATES: Record<string, Array<{
  type: string;
  scene: string;
  camera: string;
  action: string;
  emotion: string;
  purpose: string;
  composition: string;
  lighting: string;
}>> = {
  clothing: [
    {
      type: '模特出场',
      scene: '高端摄影棚 / 时尚秀场',
      camera: '全景推镜头',
      action: '模特自信走入画面，优雅站立',
      emotion: '高级时尚',
      purpose: '吸引注意，建立品牌调性',
      composition: '中心构图，人物居中',
      lighting: '专业柔光，突出轮廓'
    },
    {
      type: '全身展示',
      scene: '简约背景 / 城市街景',
      camera: '中景固定镜头',
      action: '模特转身展示服装整体',
      emotion: '自信大气',
      purpose: '展示整体穿搭效果',
      composition: '三分法构图',
      lighting: '侧光突出层次感'
    },
    {
      type: '行走展示',
      scene: '时尚街道 / 现代建筑',
      camera: '跟拍移动镜头',
      action: '模特自然行走，展现服装动态',
      emotion: '活力动感',
      purpose: '展示服装在动态中的效果',
      composition: '运动轨迹构图',
      lighting: '自然光+补光'
    },
    {
      type: '转身展示',
      scene: '摄影棚 / 简约背景',
      camera: '环绕镜头',
      action: '模特优雅转身360度',
      emotion: '优雅从容',
      purpose: '展示服装各个角度',
      composition: '圆形构图',
      lighting: '环形布光'
    },
    {
      type: '特写展示',
      scene: '特写镜头',
      camera: '特写推镜头',
      action: '展示服装细节和质感',
      emotion: '精致细腻',
      purpose: '突出工艺品质',
      composition: '特写构图',
      lighting: '微距灯光'
    },
    {
      type: '面料细节',
      scene: '特写镜头',
      camera: '微距镜头',
      action: '展示面料纹理和触感',
      emotion: '品质感',
      purpose: '强调材质高端',
      composition: '纹理构图',
      lighting: '柔光箱'
    },
    {
      type: '品牌感镜头',
      scene: '品牌背景 / Logo展示',
      camera: '拉镜头',
      action: '模特摆姿势，露出品牌元素',
      emotion: '品牌认同',
      purpose: '强化品牌形象',
      composition: '品牌元素居中',
      lighting: '品牌色调灯光'
    },
    {
      type: '结束定格',
      scene: '最终展示',
      camera: '固定镜头',
      action: '模特微笑定格，产品信息出现',
      emotion: '完美收官',
      purpose: '留下深刻印象',
      composition: '对称构图',
      lighting: '综合布光'
    }
  ],
  bag: [
    {
      type: '背上展示',
      scene: '户外场景 / 城市背景',
      camera: '中景跟拍',
      action: '模特背着包行走',
      emotion: '时尚活力',
      purpose: '展示背包效果',
      composition: '运动构图',
      lighting: '自然光'
    },
    {
      type: '手提展示',
      scene: '街头 / 咖啡店',
      camera: '特写镜头',
      action: '手部特写展示手提姿态',
      emotion: '优雅精致',
      purpose: '展示手提美感',
      composition: '特写构图',
      lighting: '侧光'
    },
    {
      type: '拉链细节',
      scene: '特写场景',
      camera: '微距镜头',
      action: '拉开拉链展示内部',
      emotion: '品质感',
      purpose: '展示工艺细节',
      composition: '细节构图',
      lighting: '柔光'
    },
    {
      type: '容量展示',
      scene: '室内场景',
      camera: '中景镜头',
      action: '往包里放入物品展示容量',
      emotion: '实用便捷',
      purpose: '展示功能性',
      composition: '中心构图',
      lighting: '室内自然光'
    },
    {
      type: '通勤场景',
      scene: '地铁站 / 办公室',
      camera: '跟拍镜头',
      action: '模特通勤使用背包',
      emotion: '便捷高效',
      purpose: '展示使用场景',
      composition: '环境构图',
      lighting: '环境光'
    }
  ],
  backpack: [
    {
      type: '细节特写-拉链',
      scene: '特写镜头 / 干净背景',
      camera: '微距推镜头',
      action: '特写展示书包拉链五金细节',
      emotion: '精致品质',
      purpose: '突出工艺细节，建立品质认知',
      composition: '特写构图，焦点集中',
      lighting: '电影级柔光，立体反射高光'
    },
    {
      type: '细节特写-面料',
      scene: '特写镜头 / 质感背景',
      camera: '微距镜头',
      action: '展示书包面料纹理和触感',
      emotion: '高级质感',
      purpose: '强调材质高端，建立信任',
      composition: '纹理构图，细节突出',
      lighting: '柔和轮廓光，质感表现'
    },
    {
      type: '内部结构展示',
      scene: '中景 / 干净背景',
      camera: '固定镜头',
      action: '打开书包展示隔层设计和容量',
      emotion: '实用便捷',
      purpose: '展示功能性和收纳设计',
      composition: '中心构图，层次分明',
      lighting: '室内自然光，柔和补光'
    },
    {
      type: '背负系统展示',
      scene: '中景 / 简约背景',
      camera: '环绕镜头',
      action: '模特穿戴书包展示背负系统',
      emotion: '舒适专业',
      purpose: '展示人体工学设计',
      composition: '环形构图，全方位展示',
      lighting: '专业柔光，突出轮廓'
    },
    {
      type: '整体展示-校园',
      scene: '校园场景 / 林荫道',
      camera: '中景跟拍',
      action: '学生模特背着书包行走',
      emotion: '青春活力',
      purpose: '展示实际使用场景',
      composition: '运动构图，自然流畅',
      lighting: '自然光，青春氛围'
    },
    {
      type: '整体展示-通勤',
      scene: '城市街道 / 地铁站',
      camera: '移动镜头',
      action: '通勤人士背着书包行走',
      emotion: '都市时尚',
      purpose: '展示通勤场景适配',
      composition: '环境构图，融入场景',
      lighting: '城市自然光，氛围营造'
    },
    {
      type: '品牌强化',
      scene: '特写 / 品牌背景',
      camera: '拉镜头',
      action: '展示书包品牌标识',
      emotion: '品牌认同',
      purpose: '强化品牌形象',
      composition: '品牌元素居中',
      lighting: '品牌色调灯光'
    },
    {
      type: '结束定格',
      scene: '全景展示',
      camera: '固定镜头',
      action: '模特微笑展示全套产品',
      emotion: '完美收官',
      purpose: '留下深刻印象，促成转化',
      composition: '对称构图，稳定大气',
      lighting: '综合布光，电影感'
    }
  ],
  pet: [
    {
      type: '宠物互动',
      scene: '家庭环境',
      camera: '中景镜头',
      action: '宠物与主人互动玩耍',
      emotion: '温馨可爱',
      purpose: '建立情感连接',
      composition: '互动构图',
      lighting: '温暖灯光'
    },
    {
      type: '使用过程',
      scene: '室内场景',
      camera: '特写镜头',
      action: '宠物使用产品的过程',
      emotion: '自然真实',
      purpose: '展示产品功能',
      composition: '过程构图',
      lighting: '自然光'
    },
    {
      type: '功能展示',
      scene: '户外场景',
      camera: '全景镜头',
      action: '宠物在户外使用产品',
      emotion: '快乐活力',
      purpose: '展示产品优势',
      composition: '环境构图',
      lighting: '户外自然光'
    },
    {
      type: '情绪展示',
      scene: '温馨场景',
      camera: '特写镜头',
      action: '宠物的可爱表情',
      emotion: '萌趣治愈',
      purpose: '激发购买欲望',
      composition: '表情特写',
      lighting: '柔和灯光'
    }
  ],
  furniture: [
    {
      type: '空间展示',
      scene: '客厅 / 卧室',
      camera: '全景镜头',
      action: '展示家具在空间中的位置',
      emotion: '舒适温馨',
      purpose: '展示空间搭配',
      composition: '空间构图',
      lighting: '室内自然光'
    },
    {
      type: '细节特写',
      scene: '特写场景',
      camera: '微距镜头',
      action: '展示家具工艺细节',
      emotion: '品质感',
      purpose: '强调工艺品质',
      composition: '细节构图',
      lighting: '柔光'
    },
    {
      type: '使用场景',
      scene: '真实生活场景',
      camera: '中景镜头',
      action: '人物使用家具的场景',
      emotion: '生活气息',
      purpose: '展示实用性',
      composition: '生活构图',
      lighting: '环境光'
    },
    {
      type: '材质展示',
      scene: '特写场景',
      camera: '特写镜头',
      action: '展示家具材质纹理',
      emotion: '质感高级',
      purpose: '突出材质品质',
      composition: '纹理构图',
      lighting: '侧光'
    }
  ],
  digital: [
    {
      type: '产品特写',
      scene: '黑色背景',
      camera: '特写推镜头',
      action: '展示产品外观设计',
      emotion: '科技感',
      purpose: '吸引注意',
      composition: '中心构图',
      lighting: '专业产品灯光'
    },
    {
      type: '功能演示',
      scene: '使用场景',
      camera: '中景镜头',
      action: '展示产品功能操作',
      emotion: '便捷高效',
      purpose: '展示核心功能',
      composition: '操作构图',
      lighting: '环境光'
    },
    {
      type: '屏幕展示',
      scene: '特写场景',
      camera: '特写镜头',
      action: '展示屏幕显示效果',
      emotion: '视觉冲击',
      purpose: '突出屏幕素质',
      composition: '屏幕构图',
      lighting: '低光环境'
    },
    {
      type: '性能展示',
      scene: '动态场景',
      camera: '快速剪辑',
      action: '展示产品性能表现',
      emotion: '强劲有力',
      purpose: '展示性能优势',
      composition: '动态构图',
      lighting: '动感灯光'
    }
  ],
  beauty: [
    {
      type: '包装展示',
      scene: '精致背景',
      camera: '全景镜头',
      action: '展示产品包装设计',
      emotion: '高端精致',
      purpose: '吸引注意',
      composition: '包装构图',
      lighting: '柔光'
    },
    {
      type: '质地展示',
      scene: '特写场景',
      camera: '微距镜头',
      action: '展示产品质地',
      emotion: '细腻柔滑',
      purpose: '展示产品质感',
      composition: '质地构图',
      lighting: '微距灯光'
    },
    {
      type: '上脸效果',
      scene: '人像特写',
      camera: '特写镜头',
      action: '展示上脸效果',
      emotion: '美丽自信',
      purpose: '展示使用效果',
      composition: '脸部特写',
      lighting: '美妆灯光'
    },
    {
      type: '前后对比',
      scene: '对比场景',
      camera: '分屏镜头',
      action: '展示使用前后对比',
      emotion: '惊艳蜕变',
      purpose: '突出产品效果',
      composition: '对比构图',
      lighting: '均匀布光'
    }
  ],
  food: [
    {
      type: '包装展示',
      scene: '明亮背景',
      camera: '全景镜头',
      action: '展示产品包装',
      emotion: '食欲感',
      purpose: '吸引注意',
      composition: '包装构图',
      lighting: '明亮灯光'
    },
    {
      type: '食材展示',
      scene: '特写场景',
      camera: '微距镜头',
      action: '展示新鲜食材',
      emotion: '新鲜健康',
      purpose: '突出品质',
      composition: '食材构图',
      lighting: '自然光线'
    },
    {
      type: '制作过程',
      scene: '厨房场景',
      camera: '中景镜头',
      action: '展示制作过程',
      emotion: '美味诱惑',
      purpose: '激发食欲',
      composition: '过程构图',
      lighting: '厨房灯光'
    },
    {
      type: '品尝体验',
      scene: '餐厅场景',
      camera: '特写镜头',
      action: '人物品尝的满足表情',
      emotion: '幸福满足',
      purpose: '传递美味体验',
      composition: '表情构图',
      lighting: '温馨灯光'
    }
  ],
  other: [
    {
      type: '产品特写',
      scene: '简洁背景',
      camera: '特写镜头',
      action: '展示产品细节',
      emotion: '专业品质',
      purpose: '吸引注意',
      composition: '特写构图',
      lighting: '产品灯光'
    },
    {
      type: '功能展示',
      scene: '使用场景',
      camera: '中景镜头',
      action: '展示产品功能',
      emotion: '实用便捷',
      purpose: '展示功能',
      composition: '功能构图',
      lighting: '环境光'
    },
    {
      type: '优势对比',
      scene: '对比场景',
      camera: '分屏镜头',
      action: '与竞品对比',
      emotion: '优势明显',
      purpose: '突出优势',
      composition: '对比构图',
      lighting: '均匀布光'
    },
    {
      type: '品牌展示',
      scene: '品牌背景',
      camera: '拉镜头',
      action: '展示品牌形象',
      emotion: '品牌认同',
      purpose: '强化品牌',
      composition: '品牌构图',
      lighting: '品牌色调'
    }
  ]
};

export function buildStoryboardPrompt(
  userDescription: string,
  features: ProductFeatures,
  params: VideoParams,
  styles: string[],
  imageCount: number
): string {
  logger.debug('storyboardService', '开始构建分镜提示词', { 
    userDescription, 
    productType: features.productType,
    duration: params.duration,
    styles 
  });
  
  // 检查缓存
  const cacheKey = {
    userDescription: userDescription.toLowerCase().trim(),
    productCategory: features.productCategory,
    duration: params.duration,
    styles: styles.sort().join(','),
    imageCount
  };
  
  const cached = promptCache.get(cacheKey);
  if (cached) {
    logger.info('storyboardService', '分镜提示词缓存命中', { productType: features.productType });
    return cached;
  }
  
  const styleLabels = styles.map(s => STYLE_LABELS[s] || s).join('、');
  
  const prompt = `
你是一位专业的商业广告分镜导演，精通电影级光影和品牌叙事逻辑。请根据以下信息生成专业的导演级分镜脚本：

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

【视频参数】
- 总时长：${params.duration}秒
- 画面比例：${params.aspectRatio}
- 分辨率：${params.resolution} (8K超清)
- 视觉风格：${styleLabels}

【素材信息】
- 参考图片数量：${imageCount}张

【导演级叙事结构】
请遵循以下专业广告叙事结构：
1. 细节切入（第1-2个镜头）：从产品细节入手，微距、纹理、五金、面料等，建立品质认知
2. 功能展示（第2-4个镜头）：过渡到产品功能与整体展示，突出实用性
3. 场景融入（第4-5个镜头）：展示产品在真实场景中的使用
4. 品牌强化（第5-6个镜头）：重点突出品牌标识和特色设计
5. 结尾定格（最后1个镜头）：呈现全套产品，强化品牌印象

【光影与质感要求】
- 电影级写实光影
- 柔和轮廓光
- 立体反射高光
- 低饱和高级感色调
- 干净通透的画面质感

【镜头要求】
每个镜头必须包含：
- scene（场景描述）：详细描述场景环境
- camera（运镜方式）：推镜/拉镜/跟拍/环绕/平移/俯拍/仰拍/固定镜头
- action（人物动作/产品动作）：具体的动作描述
- emotion（情绪表达）：传递的情感氛围
- purpose（镜头目的）：该镜头的商业目的
- description（画面描述）：完整的画面内容描述
- composition（构图方式）：专业影视构图
- lighting（光影效果）：电影级光影描述
- soundEffect（音效涉及）：匹配画面的音效建议
- notes（备注）：光影、质感、情绪推进的备注

【输出格式】
请输出纯JSON格式，包含shots数组，每个元素包含：num, duration, scene, camera, action, emotion, purpose, description, composition, lighting, soundEffect, notes, aiPrompt

镜头数量：${Math.min(Math.max(imageCount, 3), 8)}个
总时长必须精确等于${params.duration}秒

【AI提示词要求】
aiPrompt字段用于Seedance2.0视频生成，需满足：
- 详细描述画面内容
- 包含光影、构图、风格信息
- 适配8K超清分辨率
- 无文字错乱、无画面崩坏
- 专业影视分镜排版
- 镜头衔接流畅，情绪推进自然

示例输出格式：
{
  "shots": [
    {
      "num": 1,
      "duration": 2.5,
      "scene": "高端摄影棚，干净背景",
      "camera": "微距推镜头",
      "action": "特写展示产品拉链五金细节",
      "emotion": "精致品质",
      "purpose": "建立品质认知",
      "description": "开场微距镜头，聚焦产品五金细节，展现精湛工艺",
      "composition": "特写构图，焦点集中",
      "lighting": "电影级柔光，立体反射高光",
      "soundEffect": "轻柔的金属滑动声",
      "notes": "低饱和色调，高级感，建立品质第一印象",
      "aiPrompt": "8K超清，电影级写实光影，微距特写产品五金拉链细节，柔和轮廓光，立体反射高光，低饱和高级感，干净通透的画面质感，专业影视构图"
    }
  ]
}
  `.trim();
  
  // 存入缓存
  promptCache.set(cacheKey, prompt);
  
  logger.info('storyboardService', '分镜提示词构建完成', { 
    promptLength: prompt.length,
    productType: features.productType,
    duration: params.duration 
  });
  
  return prompt;
}

export function buildAIMessages(
  prompt: string,
  duration: string,
  styles: string[]
) {
  logger.debug('storyboardService', '开始构建AI消息', { 
    promptLength: prompt.length,
    duration,
    styles 
  });
  
  const styleLabels = styles.map(s => STYLE_LABELS[s] || s).join('、');
  
  const messages = [
    {
      role: 'system' as const,
      content: `
你是一位专业的商业广告分镜导演，精通电影级光影和品牌叙事逻辑。请严格按照JSON格式输出导演级分镜脚本。

要求：
1. 输出格式必须是纯JSON，不包含任何解释文字
2. 必须包含shots数组
3. 每个镜头必须包含：num, duration, scene, camera, action, emotion, purpose, description, composition, lighting, soundEffect, notes, aiPrompt
4. 镜头数量：3-8个
5. 总时长必须精确等于${duration}秒
6. 风格：${styleLabels}
7. 遵循导演级叙事结构：细节切入 → 功能展示 → 场景融入 → 品牌强化 → 结尾定格
8. 禁止重复镜头类型，确保镜头多样性
9. 光影要求：电影级写实光影、柔和轮廓光、立体反射高光
10. aiPrompt字段用于Seedance2.0视频生成，需包含8K超清、专业影视构图、详细画面描述
11. 确保镜头衔接流畅，情绪推进自然，传递专业电影感和品牌展示逻辑
      `.trim()
    },
    {
      role: 'user' as const,
      content: prompt
    }
  ];
  
  logger.info('storyboardService', 'AI消息构建完成', { 
    systemMessageLength: messages[0].content.length,
    userMessageLength: messages[1].content.length,
    duration 
  });
  
  return messages;
}

export function calculateDuration(
  shotCount: number,
  totalDuration: number,
  weights?: number[]
): number[] {
  logger.debug('storyboardService', '开始计算镜头时长', { shotCount, totalDuration, hasCustomWeights: !!weights });
  
  const durations: number[] = [];
  const avgDuration = totalDuration / shotCount;
  
  if (!weights || weights.length !== shotCount) {
    weights = Array(shotCount).fill(1 / shotCount);
  }
  
  let remaining = totalDuration;
  
  for (let i = 0; i < shotCount; i++) {
    if (i === shotCount - 1) {
      durations.push(Math.round(remaining * 10) / 10);
    } else {
      const duration = Math.round(weights[i] * totalDuration * 10) / 10;
      durations.push(duration);
      remaining -= duration;
    }
  }
  
  logger.info('storyboardService', '镜头时长计算完成', { totalCalculated: durations.reduce((a, b) => a + b, 0), shotCount });
  
  return durations;
}

export function scoreStoryboard(shots: ShotDetail[], features: ProductFeatures): {
  score: number;
  details: {
    richness: number;
    commercialValue: number;
    productCoverage: number;
    visualExpression: number;
    conversionAbility: number;
  };
} {
  logger.debug('storyboardService', '开始评分分镜', { shotCount: shots.length, productType: features.productType });
  
  let richness = 0;
  let commercialValue = 0;
  let productCoverage = 0;
  let visualExpression = 0;
  let conversionAbility = 0;
  
  const shotTypes = new Set(shots.map(s => s.type));
  const cameras = new Set(shots.map(s => s.camera));
  const scenes = new Set(shots.map(s => s.scene));
  
  richness = Math.min(shotTypes.size * 10 + cameras.size * 5 + scenes.size * 5, 100);
  
  const hasAttention = shots.some((s, i) => i === 0 && s.purpose.includes('吸引'));
  const hasSelling = shots.some(s => s.purpose.includes('卖点'));
  const hasTrust = shots.some(s => s.purpose.includes('信任') || s.purpose.includes('品质'));
  const hasBrand = shots.some(s => s.purpose.includes('品牌'));
  const hasConversion = shots.some((s, i) => i === shots.length - 1 && s.purpose.includes('转化'));
  
  commercialValue = (hasAttention + hasSelling + hasTrust + hasBrand + hasConversion) * 20;
  
  const keyElements = features.keyElements;
  const coveredElements = keyElements.filter(el => 
    shots.some(s => s.description.includes(el) || s.purpose.includes(el))
  );
  productCoverage = Math.round((coveredElements.length / keyElements.length) * 100);
  
  const hasDynamic = shots.some(s => ['跟拍', '移动', '环绕', '推镜头', '拉镜头'].includes(s.camera));
  const hasComposition = shots.every(s => s.composition && s.composition !== '');
  const hasLighting = shots.every(s => s.lighting && s.lighting !== '');
  
  visualExpression = ((hasDynamic ? 30 : 0) + (hasComposition ? 35 : 0) + (hasLighting ? 35 : 0));
  
  const hasModel = shots.some(s => s.action.includes('模特') || s.action.includes('人物'));
  const hasCallToAction = shots.some(s => s.purpose.includes('购买') || s.purpose.includes('转化'));
  const hasEmotion = shots.every(s => s.emotion && s.emotion !== '');
  
  conversionAbility = ((hasModel ? 30 : 0) + (hasCallToAction ? 40 : 0) + (hasEmotion ? 30 : 0));
  
  const score = Math.round((richness + commercialValue + productCoverage + visualExpression + conversionAbility) / 5);
  
  const result = {
    score,
    details: {
      richness: Math.round(richness),
      commercialValue: Math.round(commercialValue),
      productCoverage: Math.round(productCoverage),
      visualExpression: Math.round(visualExpression),
      conversionAbility: Math.round(conversionAbility)
    }
  };
  
  logger.info('storyboardService', '分镜评分完成', { score: result.score, ...result.details });
  
  return result;
}

/**
 * 异步评分分镜 - 非阻塞版本
 * 用于后台评分，不阻塞接口响应
 */
export function scoreStoryboardAsync(
  shots: ShotDetail[],
  features: ProductFeatures,
  callback?: (result: ReturnType<typeof scoreStoryboard>) => void
): void {
  // 使用 setImmediate/setTimeout 将评分操作放到事件循环的下一轮
  setTimeout(() => {
    try {
      const result = scoreStoryboard(shots, features);
      logger.info('storyboardService', '异步分镜评分完成', { score: result.score, ...result.details });
      if (callback) {
        callback(result);
      }
    } catch (error) {
      logger.error('storyboardService', '异步分镜评分失败', { error: String(error) });
    }
  }, 0);
}

export function generateLocalStoryboard(
  features: ProductFeatures,
  duration: number,
  imageCount: number
): ShotDetail[] {
  logger.debug('storyboardService', '开始本地生成分镜', { productType: features.productType, duration, imageCount });
  
  // 检查缓存
  const cacheKey = {
    productCategory: features.productCategory,
    productType: features.productType,
    duration,
    imageCount,
    mood: features.mood
  };
  
  const cached = resultCache.get(cacheKey);
  if (cached) {
    logger.info('storyboardService', '本地分镜缓存命中', { productType: features.productType, duration, imageCount });
    return cached.shots as ShotDetail[];
  }
  
  const templates = SHOT_TEMPLATES[features.productCategory as keyof typeof SHOT_TEMPLATES] || SHOT_TEMPLATES.other;
  
  const shotCount = Math.min(Math.max(imageCount, 3), Math.min(templates.length, 8));
  const selectedTemplates = templates.slice(0, shotCount);
  
  const durations = calculateDuration(shotCount, duration);
  
  const shots: ShotDetail[] = selectedTemplates.map((template, index) => ({
    num: index + 1,
    duration: durations[index],
    scene: template.scene,
    camera: template.camera,
    action: template.action,
    emotion: template.emotion,
    purpose: getPurposeByIndex(index, shotCount),
    description: `${template.type}：${template.action}，展示${features.productType}`,
    composition: template.composition,
    lighting: template.lighting,
    soundEffect: getSoundEffectByType(template.type, index),
    notes: getNotesByType(template.type, features, index),
    aiPrompt: generateAIPrompt(template, features, duration, index)
  }));
  
  // 存入缓存
  resultCache.set(cacheKey, {
    shots: shots as unknown as unknown[],
    score: { score: 0, details: {} },
    totalDuration: duration,
    shotCount: shots.length
  });
  
  logger.info('storyboardService', '本地分镜生成完成', { shotCount, duration, productType: features.productType });
  
  return shots;
}

function getPurposeByIndex(index: number, total: number): string {
  if (index === 0) return '细节切入，建立品质认知';
  if (index === 1) return '细节展示，强化质感';
  if (index < Math.ceil(total * 0.5)) return '功能展示，突出实用';
  if (index < total - 2) return '场景融入，真实体验';
  if (index < total - 1) return '品牌强化，建立认同';
  return '结尾定格，促成转化';
}

function getSoundEffectByType(type: string, index: number): string {
  const soundEffects: Record<string, string> = {
    '细节特写-拉链': '轻柔的金属滑动声',
    '细节特写-面料': '轻柔的布料摩擦声',
    '内部结构展示': '拉链开合声',
    '背负系统展示': '轻微的背包带调整声',
    '整体展示-校园': '轻柔的脚步声',
    '整体展示-通勤': '都市环境音效',
    '品牌强化': '品牌主题音乐渐入',
    '结束定格': '品牌主题音乐高潮',
    '模特出场': '轻柔的脚步声',
    '全身展示': '环境音效',
    '行走展示': '脚步声',
    '特写展示': '轻柔音效',
    '面料细节': '面料摩擦声',
    '品牌感镜头': '品牌音乐',
    '背上展示': '脚步声',
    '手提展示': '环境音效',
    '拉链细节': '金属滑动声',
    '容量展示': '物品放置声',
    '通勤场景': '都市环境音效'
  };
  return soundEffects[type] || (index === 0 ? '开场音效' : index === 7 ? '结尾音效' : '环境音效');
}

function getNotesByType(type: string, features: ProductFeatures, index: number): string {
  const notes: Record<string, string> = {
    '细节特写-拉链': '电影级柔光，立体反射高光，低饱和色调，建立品质第一印象',
    '细节特写-面料': '柔和轮廓光，质感表现，高级感，传递品质感',
    '内部结构展示': '自然光+补光，层次分明，展示功能性',
    '背负系统展示': '专业柔光，突出轮廓，展示人体工学设计',
    '整体展示-校园': '自然光，青春氛围，场景融入',
    '整体展示-通勤': '城市自然光，氛围营造，适配通勤场景',
    '品牌强化': '品牌色调灯光，强化品牌识别',
    '结束定格': '综合布光，电影感，完美收官'
  };
  
  const emotionNotes = {
    '高端奢华': '低饱和高级感色调，精致光影',
    '时尚潮流': '动感光影，时尚色调',
    '简约清新': '干净通透，柔和色调',
    '科技未来': '冷色调，科技感光影',
    '温馨治愈': '暖色调，柔和光影',
    '专业大气': '专业布光，电影感'
  };
  
  const baseNote = notes[type] || '电影级写实光影，专业构图';
  const emotionNote = emotionNotes[features.mood as keyof typeof emotionNotes] || '';
  
  return `${baseNote}${emotionNote ? '，' + emotionNote : ''}`;
}

function generateAIPrompt(template: typeof SHOT_TEMPLATES.clothing[0], features: ProductFeatures, duration: number, index: number): string {
  const purposeMap: Record<number, string> = {
    0: '开场镜头，细节切入',
    1: '细节展示，强化质感',
    2: '功能展示，突出实用',
    3: '场景融入，真实体验',
    4: '场景展示，拓展使用',
    5: '品牌强化，建立认同',
    6: '结尾定格，促成转化',
    7: '最终展示，完美收官'
  };
  
  return `8K超清，电影级写实光影，${template.emotion}风格，${template.scene}场景，${template.action}，${template.camera}，${template.composition}，${template.lighting}，${features.productType}产品展示，${purposeMap[index] || '产品展示'}，${duration}秒镜头，低饱和高级感，干净通透画面质感，Seedance2.0视频生成`;
}

interface RawShotData {
  num?: number;
  duration?: number | string;
  scene?: string;
  camera?: string;
  action?: string;
  emotion?: string;
  purpose?: string;
  description?: string;
  composition?: string;
  lighting?: string;
  soundEffect?: string;
  notes?: string;
  aiPrompt?: string;
}

export function parseAIResponse(content: string, targetDuration: number): ShotDetail[] | null {
  if (!content || content.trim() === '') {
    logger.error('storyboardService', 'AI响应解析失败', { error: 'Empty content' });
    return null;
  }
  
  logger.debug('storyboardService', '开始解析AI响应', { contentLength: content.length, targetDuration });
  
  try {
    const data = JSON.parse(content);
    
    if (!data.shots || !Array.isArray(data.shots) || data.shots.length === 0) {
      logger.warn('storyboardService', 'AI响应格式错误，缺少shots数组或shots为空');
      return null;
    }
    
    const rawShots = data.shots.map((shot: RawShotData, index: number) => ({
      num: shot.num || index + 1,
      duration: typeof shot.duration === 'number' ? shot.duration : 
               typeof shot.duration === 'string' ? parseFloat(shot.duration) || 0 : 0,
      scene: shot.scene || '未指定',
      camera: shot.camera || '固定镜头',
      action: shot.action || '未指定',
      emotion: shot.emotion || '专业',
      purpose: shot.purpose || '未指定',
      description: shot.description || `镜头${index + 1}`,
      composition: shot.composition || '中心构图',
      lighting: shot.lighting || '专业灯光',
      soundEffect: shot.soundEffect || '环境音效',
      notes: shot.notes || '电影级写实光影，专业构图',
      aiPrompt: shot.aiPrompt || generateDefaultAIPrompt(shot, index)
    }));
    
    const currentTotal = rawShots.reduce((sum, s) => sum + s.duration, 0);
    const weights = rawShots.map(s => s.duration / currentTotal);
    const durations = calculateDuration(rawShots.length, targetDuration, weights);
    
    const result = rawShots.map((shot, index) => ({
      ...shot,
      duration: durations[index]
    }));
    
    logger.info('storyboardService', 'AI响应解析完成', { shotCount: result.length, targetDuration });
    
    return result;
    
  } catch (error) {
    logger.error('storyboardService', 'AI响应解析失败', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

function generateDefaultAIPrompt(shot: RawShotData, index: number): string {
  const purposeMap: Record<number, string> = {
    0: '开场镜头，细节切入',
    1: '细节展示，强化质感',
    2: '功能展示，突出实用',
    3: '场景融入，真实体验',
    4: '场景展示，拓展使用',
    5: '品牌强化，建立认同',
    6: '结尾定格，促成转化',
    7: '最终展示，完美收官'
  };
  
  return `8K超清，电影级写实光影，${shot.emotion || '专业'}风格，${shot.scene || '干净背景'}场景，${shot.action || '产品展示'}，${shot.camera || '固定镜头'}，${shot.composition || '中心构图'}，${shot.lighting || '专业灯光'}，${purposeMap[index] || '产品展示'}，低饱和高级感，干净通透画面质感，Seedance2.0视频生成`;
}