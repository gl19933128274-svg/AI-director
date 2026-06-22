/**
 * Storyboard Director Prompt System（导演级分镜规则系统）
 * 
 * 将高质量导演分镜Prompt中的规则提取并模块化，实现自动化分镜生成
 */

// ==================== 1. 场景规则库 ====================
export const SCENE_RULES = {
  // 服装类场景
  clothing: {
    campus: {
      name: '校园',
      description: '青春活力的校园环境，适合学生群体',
      elements: ['教学楼', '操场', '图书馆', '林荫道', '教室'],
      lighting: '自然光+青春氛围光',
      mood: '青春活力',
      cameraAngles: ['中景', '全景', '跟拍']
    },
    cafe: {
      name: '咖啡馆',
      description: '文艺舒适的咖啡馆环境，适合休闲穿搭',
      elements: ['咖啡杯', '沙发', '书架', '窗边', '绿植'],
      lighting: '柔和暖光+环境光',
      mood: '文艺舒适',
      cameraAngles: ['特写', '中景', '固定镜头']
    },
    street: {
      name: '街拍',
      description: '城市街头环境，展现时尚潮流',
      elements: ['街道', '店铺', '行人', '交通', '建筑'],
      lighting: '自然光+城市光',
      mood: '时尚潮流',
      cameraAngles: ['跟拍', '全景', '移动镜头']
    },
    overpass: {
      name: '城市天桥',
      description: '现代都市天桥，展现都市感',
      elements: ['天桥', '城市景观', '车流', '天空', '建筑'],
      lighting: '自然光+城市灯光',
      mood: '都市时尚',
      cameraAngles: ['全景', '俯拍', '环绕']
    },
    studio: {
      name: '极简摄影棚',
      description: '专业摄影棚环境，突出产品本身',
      elements: ['背景布', '专业灯光', '摄影设备', '简约背景'],
      lighting: '专业柔光+轮廓光',
      mood: '专业高级',
      cameraAngles: ['特写', '中景', '固定镜头']
    }
  },

  // 箱包类场景
  bag: {
    commute: {
      name: '通勤',
      description: '日常通勤场景，展现实用性',
      elements: ['地铁站', '公交站', '写字楼', '电梯', '办公室'],
      lighting: '自然光+室内光',
      mood: '实用便捷',
      cameraAngles: ['跟拍', '中景', '移动镜头']
    },
    airport: {
      name: '机场',
      description: '机场环境，展现旅行属性',
      elements: ['候机厅', '行李车', '登机口', '航班信息', '免税店'],
      lighting: '机场灯光+自然光',
      mood: '旅行时尚',
      cameraAngles: ['全景', '跟拍', '移动镜头']
    },
    office: {
      name: '办公桌',
      description: '办公环境，展现商务属性',
      elements: ['办公桌', '电脑', '文件', '咖啡杯', '办公椅'],
      lighting: '室内光+台灯',
      mood: '商务专业',
      cameraAngles: ['特写', '中景', '固定镜头']
    },
    cafe: {
      name: '咖啡馆',
      description: '休闲咖啡馆，展现时尚属性',
      elements: ['咖啡桌', '沙发', '书', '绿植', '装饰品'],
      lighting: '暖光+环境光',
      mood: '休闲时尚',
      cameraAngles: ['特写', '中景', '固定镜头']
    }
  },

  // 宠物用品类场景
  pet: {
    livingRoom: {
      name: '客厅',
      description: '家庭客厅环境，展现温馨氛围',
      elements: ['沙发', '地毯', '玩具', '宠物窝', '窗户'],
      lighting: '暖光+自然光',
      mood: '温馨舒适',
      cameraAngles: ['中景', '特写', '固定镜头']
    },
    lawn: {
      name: '草坪',
      description: '户外草坪环境，展现活力',
      elements: ['草地', '阳光', '树木', '花朵', '户外玩具'],
      lighting: '自然光+阳光',
      mood: '活力快乐',
      cameraAngles: ['全景', '跟拍', '移动镜头']
    },
    petPark: {
      name: '宠物乐园',
      description: '专业宠物乐园，展现专业性',
      elements: ['游乐设施', '其他宠物', '训练场地', '休息区', '专业设备'],
      lighting: '自然光+设施灯光',
      mood: '专业快乐',
      cameraAngles: ['全景', '跟拍', '环绕']
    }
  },

  // 家具类场景
  furniture: {
    livingRoom: {
      name: '客厅',
      description: '现代客厅环境，展现家居美学',
      elements: ['沙发', '茶几', '电视柜', '装饰画', '绿植'],
      lighting: '自然光+室内氛围光',
      mood: '现代舒适',
      cameraAngles: ['全景', '中景', '环绕']
    },
    bedroom: {
      name: '卧室',
      description: '温馨卧室环境，展现舒适感',
      elements: ['床', '床头柜', '衣柜', '窗帘', '台灯'],
      lighting: '柔和暖光+氛围光',
      mood: '温馨舒适',
      cameraAngles: ['全景', '中景', '固定镜头']
    },
    study: {
      name: '书房',
      description: '书房环境，展现品质感',
      elements: ['书桌', '书架', '椅子', '台灯', '装饰品'],
      lighting: '专注光+环境光',
      mood: '品质专注',
      cameraAngles: ['中景', '特写', '固定镜头']
    }
  },

  // 数码产品类场景
  digital: {
    studio: {
      name: '专业摄影棚',
      description: '黑色背景专业摄影棚，突出科技感',
      elements: ['黑色背景', '专业灯光', '反光板', '产品展示台'],
      lighting: '专业产品灯光+轮廓光',
      mood: '科技专业',
      cameraAngles: ['特写', '微距', '固定镜头']
    },
    office: {
      name: '现代办公',
      description: '现代办公环境，展现使用场景',
      elements: ['办公桌', '电脑', '文件', '咖啡', '现代装饰'],
      lighting: '现代办公光+环境光',
      mood: '现代高效',
      cameraAngles: ['中景', '特写', '移动镜头']
    },
    lifestyle: {
      name: '生活场景',
      description: '日常生活场景，展现实用性',
      elements: ['家居环境', '日常用品', '生活元素', '自然光线'],
      lighting: '自然光+生活光',
      mood: '生活实用',
      cameraAngles: ['中景', '跟拍', '移动镜头']
    }
  },

  // 美妆产品类场景
  beauty: {
    vanity: {
      name: '梳妆台',
      description: '精致梳妆台环境，展现高端感',
      elements: ['梳妆台', '镜子', '化妆刷', '首饰', '精致装饰'],
      lighting: '柔和美妆光+轮廓光',
      mood: '精致高端',
      cameraAngles: ['特写', '中景', '固定镜头']
    },
    studio: {
      name: '专业摄影棚',
      description: '专业美妆摄影棚，突出产品质感',
      elements: ['专业背景', '美妆灯光', '反光设备', '产品展示'],
      lighting: '专业美妆光+柔光',
      mood: '专业质感',
      cameraAngles: ['特写', '微距', '固定镜头']
    },
    bathroom: {
      name: '浴室',
      description: '现代浴室环境，展现使用场景',
      elements: ['洗手台', '镜子', '浴巾', '装饰品', '现代设施'],
      lighting: '明亮浴室光+自然光',
      mood: '现代清新',
      cameraAngles: ['中景', '特写', '固定镜头']
    }
  },

  // 食品类场景
  food: {
    kitchen: {
      name: '厨房',
      description: '现代厨房环境，展现制作过程',
      elements: ['操作台', '厨具', '食材', '调料', '现代设备'],
      lighting: '明亮厨房光+操作光',
      mood: '新鲜健康',
      cameraAngles: ['中景', '特写', '移动镜头']
    },
    restaurant: {
      name: '餐厅',
      description: '精致餐厅环境，展现用餐体验',
      elements: ['餐桌', '餐具', '装饰', '氛围灯光', '精致摆盘'],
      lighting: '餐厅氛围光+烛光',
      mood: '精致美味',
      cameraAngles: ['中景', '特写', '固定镜头']
    },
    studio: {
      name: '食品摄影棚',
      description: '专业食品摄影棚，突出食物质感',
      elements: ['专业背景', '食品灯光', '装饰道具', '精致摆盘'],
      lighting: '专业食品光+质感光',
      mood: '诱人食欲',
      cameraAngles: ['特写', '微距', '固定镜头']
    }
  }
};

// ==================== 2. 人物规则库 ====================
export const CHARACTER_RULES = {
  // 服装类人物
  clothing: {
    maleModel: {
      name: '男模',
      description: '专业男模特，展现男性魅力',
      characteristics: ['身材健硕', '五官立体', '气质成熟', '时尚感强'],
      poses: ['站立', '行走', '转身', '坐姿', '特写'],
      expressions: ['自信', '微笑', '专注', '冷峻', '亲和'],
      ageRange: '25-35岁',
      style: '时尚成熟'
    },
    femaleModel: {
      name: '女模',
      description: '专业女模特，展现女性魅力',
      characteristics: ['身材匀称', '五官精致', '气质优雅', '表现力强'],
      poses: ['站立', '行走', '转身', '坐姿', '特写'],
      expressions: ['自信', '微笑', '优雅', '时尚', '亲和'],
      ageRange: '20-30岁',
      style: '时尚优雅'
    },
    couple: {
      name: '情侣模特',
      description: '情侣组合，展现甜蜜氛围',
      characteristics: ['搭配协调', '互动自然', '氛围甜蜜', '画面和谐'],
      poses: ['牵手', '拥抱', '对视', '同行', '互动'],
      expressions: ['甜蜜', '幸福', '温馨', '自然', '亲密'],
      ageRange: '25-30岁',
      style: '浪漫时尚'
    }
  },

  // 箱包类人物
  bag: {
    businessPerson: {
      name: '商务人士',
      description: '职场商务形象，展现专业感',
      characteristics: ['着装正式', '气质干练', '形象专业', '自信大方'],
      poses: ['行走', '站立', '办公', '通勤', '特写'],
      expressions: ['自信', '专注', '专业', '稳重', '亲和'],
      ageRange: '30-40岁',
      style: '商务专业'
    },
    traveler: {
      name: '旅行者',
      description: '旅行形象，展现自由感',
      characteristics: ['着装休闲', '气质自由', '形象轻松', '活力四射'],
      poses: ['行走', '候机', '观光', '拍照', '互动'],
      expressions: ['开心', '期待', '轻松', '自由', '满足'],
      ageRange: '25-35岁',
      style: '休闲旅行'
    },
    student: {
      name: '学生',
      description: '学生形象，展现青春活力',
      characteristics: ['着装年轻', '气质青春', '形象活力', '时尚潮流'],
      poses: ['校园行走', '学习', '社交', '运动', '特写'],
      expressions: ['青春', '活力', '开心', '友好', '时尚'],
      ageRange: '18-25岁',
      style: '青春时尚'
    }
  },

  // 宠物用品类人物
  pet: {
    petOwner: {
      name: '宠物主人',
      description: '爱心宠物主人，展现温馨互动',
      characteristics: ['着装休闲', '气质温馨', '形象亲切', '充满爱心'],
      poses: ['与宠物互动', '照顾宠物', '玩耍', '拥抱', '陪伴'],
      expressions: ['温柔', '开心', '关爱', '满足', '幸福'],
      ageRange: '25-40岁',
      style: '温馨亲切'
    },
    family: {
      name: '家庭',
      description: '家庭成员，展现家庭氛围',
      characteristics: ['着装居家', '气质温馨', '形象和谐', '充满爱意'],
      poses: ['全家互动', '照顾宠物', '家庭活动', '玩耍', '陪伴'],
      expressions: ['幸福', '温馨', '快乐', '关爱', '满足'],
      ageRange: '多年龄段',
      style: '家庭温馨'
    }
  },

  // 家具类人物
  furniture: {
    resident: {
      name: '居住者',
      description: '家居环境中的居住者，展现舒适生活',
      characteristics: ['着装舒适', '气质放松', '形象自然', '生活化'],
      poses: ['休息', '阅读', '工作', '社交', '放松'],
      expressions: ['舒适', '满足', '放松', '开心', '自然'],
      ageRange: '25-45岁',
      style: '舒适自然'
    },
    professional: {
      name: '专业人士',
      description: '专业环境中的专业人士，展现品质生活',
      characteristics: ['着装得体', '气质专业', '形象优雅', '品味高端'],
      poses: ['工作', '会议', '休息', '社交', '展示'],
      expressions: ['专业', '自信', '满足', '优雅', '从容'],
      ageRange: '30-45岁',
      style: '品质优雅'
    }
  },

  // 数码产品类人物
  digital: {
    techUser: {
      name: '科技用户',
      description: '科技产品用户，展现现代生活',
      characteristics: ['着装时尚', '气质现代', '形象潮流', '科技感强'],
      poses: ['使用产品', '工作', '娱乐', '社交', '移动'],
      expressions: ['专注', '开心', '满足', '兴奋', '自信'],
      ageRange: '20-35岁',
      style: '现代科技'
    },
    professional: {
      name: '专业人士',
      description: '职场专业人士，展现高效工作',
      characteristics: ['着装商务', '气质干练', '形象专业', '效率高'],
      poses: ['工作', '会议', '沟通', '展示', '移动办公'],
      expressions: ['专注', '专业', '自信', '满足', '高效'],
      ageRange: '28-40岁',
      style: '商务高效'
    }
  },

  // 美妆产品类人物
  beauty: {
    beautyEnthusiast: {
      name: '美妆爱好者',
      description: '美妆爱好者，展现美丽自信',
      characteristics: ['妆容精致', '气质优雅', '形象时尚', '自信大方'],
      poses: ['化妆', '展示', '自拍', '社交', '特写'],
      expressions: ['自信', '美丽', '开心', '满足', '优雅'],
      ageRange: '20-35岁',
      style: '时尚美妆'
    },
    professional: {
      name: '美妆专业',
      description: '美妆专业人士，展现专业品质',
      characteristics: ['妆容专业', '气质高雅', '形象精致', '专业感强'],
      poses: ['化妆', '展示', '教学', '特写', '对比'],
      expressions: ['专业', '自信', '精致', '满足', '优雅'],
      ageRange: '25-40岁',
      style: '专业精致'
    }
  },

  // 食品类人物
  food: {
    foodie: {
      name: '美食爱好者',
      description: '美食爱好者，展现对美食的热爱',
      characteristics: ['着装休闲', '气质亲切', '形象自然', '充满热情'],
      poses: ['品尝', '制作', '分享', '享受', '互动'],
      expressions: ['满足', '开心', '期待', '享受', '惊喜'],
      ageRange: '20-40岁',
      style: '亲切自然'
    },
    chef: {
      name: '厨师',
      description: '专业厨师，展现专业制作',
      characteristics: ['着装专业', '气质专业', '形象精湛', '技艺高超'],
      poses: ['制作', '展示', '摆盘', '讲解', '特写'],
      expressions: ['专业', '专注', '自信', '满足', '精致'],
      ageRange: '25-45岁',
      style: '专业精湛'
    }
  }
};

// ==================== 3. 运镜规则库 ====================
export const CAMERA_MOVEMENT_RULES = {
  pushIn: {
    name: '推镜',
    description: '镜头逐渐推进，突出重点',
    characteristics: ['强调重点', '增加紧张感', '聚焦细节', '引导视线'],
    speedOptions: ['慢速', '中速', '快速'],
    useCases: ['开场吸引', '细节展示', '情绪强化', '结束定格'],
    duration: '2-4秒',
    effect: '聚焦强调'
  },
  pullOut: {
    name: '拉镜',
    description: '镜头逐渐拉远，展示环境',
    characteristics: ['展示环境', '营造空间感', '结束镜头', '总结画面'],
    speedOptions: ['慢速', '中速', '快速'],
    useCases: ['结束镜头', '环境展示', '空间转换', '品牌展示'],
    duration: '2-4秒',
    effect: '空间展示'
  },
  tracking: {
    name: '跟拍',
    description: '跟随主体移动，展现动态',
    characteristics: ['动态跟随', '自然流畅', '展现过程', '生活化'],
    speedOptions: ['慢速跟拍', '中速跟拍', '快速跟拍'],
    useCases: ['行走展示', '过程记录', '动态展示', '生活场景'],
    duration: '3-5秒',
    effect: '动态流畅'
  },
  orbit: {
    name: '环绕',
    description: '围绕主体旋转，展示多角度',
    characteristics: ['360度展示', '立体呈现', '全面展示', '专业感'],
    speedOptions: ['慢速环绕', '中速环绕', '快速环绕'],
    useCases: ['产品展示', '人物展示', '空间展示', '细节展示'],
    duration: '3-6秒',
    effect: '立体展示'
  },
  pan: {
    name: '平移',
    description: '水平移动镜头，展现横向场景',
    characteristics: ['横向展示', '场景转换', '空间连贯', '自然流畅'],
    speedOptions: ['慢速平移', '中速平移', '快速平移'],
    useCases: ['场景展示', '空间转换', '环境介绍', '过程记录'],
    duration: '2-4秒',
    effect: '横向展示'
  },
  tiltDown: {
    name: '俯拍',
    description: '从上向下拍摄，展现全局',
    characteristics: ['全局视角', '空间展示', '环境介绍', '俯视效果'],
    heightOptions: ['高空俯拍', '中空俯拍', '低空俯拍'],
    useCases: ['场景展示', '环境介绍', '空间布局', '产品定位'],
    duration: '2-4秒',
    effect: '全局视角'
  },
  tiltUp: {
    name: '仰拍',
    description: '从下向上拍摄，突出主体',
    characteristics: ['突出主体', '增强气势', '视觉冲击', '强调重要'],
    heightOptions: ['低角度仰拍', '中角度仰拍', '高角度仰拍'],
    useCases: ['主体突出', '气势展示', '品牌强化', '重要强调'],
    duration: '2-4秒',
    effect: '突出强调'
  },
  static: {
    name: '固定镜头',
    description: '镜头固定不动，稳定展示',
    characteristics: ['稳定展示', '清晰呈现', '专业感', '细节突出'],
    useCases: ['特写展示', '细节呈现', '产品展示', '稳定画面'],
    duration: '2-5秒',
    effect: '稳定清晰'
  },
  zoomIn: {
    name: '变焦推镜',
    description: '通过变焦推进，突出重点',
    characteristics: ['快速聚焦', '视觉冲击', '强调重点', '动态效果'],
    speedOptions: ['慢速变焦', '中速变焦', '快速变焦'],
    useCases: ['重点强调', '细节突出', '视觉冲击', '动态展示'],
    duration: '1-3秒',
    effect: '视觉冲击'
  },
  dolly: {
    name: '移动镜头',
    description: '整体移动镜头，展现流动感',
    characteristics: ['流动感强', '自然流畅', '场景转换', '动态效果'],
    directionOptions: ['前后移动', '左右移动', '斜向移动', '弧形移动'],
    useCases: ['场景转换', '动态展示', '流动效果', '自然过渡'],
    duration: '3-5秒',
    effect: '流动自然'
  }
};

// ==================== 4. 镜头结构库 ====================
export const SHOT_STRUCTURE_RULES = {
  opening: {
    name: '开场吸引',
    description: '吸引观众注意力的开场镜头',
    purpose: '抓住观众眼球，建立第一印象',
    duration: '2-3秒',
    priority: 'high',
    techniques: [
      '视觉冲击',
      '悬念设置',
      '品牌展示',
      '产品亮相',
      '氛围营造'
    ],
    cameraMovements: ['推镜', '变焦推镜', '固定镜头'],
    examples: [
      '产品特写从模糊到清晰',
      '品牌Logo渐入',
      '模特自信出场',
      '场景全景展示',
      '悬念式开场'
    ]
  },
  overallDisplay: {
    name: '整体展示',
    description: '展示产品整体效果',
    purpose: '让观众了解产品全貌',
    duration: '3-4秒',
    priority: 'high',
    techniques: [
      '全景展示',
      '360度旋转',
      '整体效果',
      '环境搭配',
      '使用场景'
    ],
    cameraMovements: ['环绕', '拉镜', '平移'],
    examples: [
      '产品360度旋转展示',
      '模特全身展示',
      '产品在场景中的整体效果',
      '环境全景展示',
      '使用场景整体呈现'
    ]
  },
  detailDisplay: {
    name: '细节展示',
    description: '展示产品细节和工艺',
    purpose: '突出产品品质和工艺',
    duration: '2-3秒',
    priority: 'medium',
    techniques: [
      '特写镜头',
      '微距拍摄',
      '细节突出',
      '质感展示',
      '工艺强调'
    ],
    cameraMovements: ['推镜', '变焦推镜', '固定镜头'],
    examples: [
      '面料纹理特写',
      '工艺细节展示',
      '材质质感突出',
      '精致细节呈现',
      '品质感强调'
    ]
  },
  functionDisplay: {
    name: '功能展示',
    description: '展示产品功能和使用方法',
    purpose: '让观众了解产品功能',
    duration: '3-4秒',
    priority: 'high',
    techniques: [
      '功能演示',
      '使用过程',
      '效果展示',
      '操作说明',
      '实用展示'
    ],
    cameraMovements: ['跟拍', '移动镜头', '固定镜头'],
    examples: [
      '产品功能演示',
      '使用过程展示',
      '效果前后对比',
      '操作方法说明',
      '实用性展示'
    ]
  },
  brandReinforcement: {
    name: '品牌强化',
    description: '强化品牌形象和认知',
    purpose: '建立品牌印象和认知',
    duration: '2-3秒',
    priority: 'medium',
    techniques: [
      '品牌展示',
      'Logo呈现',
      '品牌色调',
      '品牌元素',
      '品牌理念'
    ],
    cameraMovements: ['拉镜', '固定镜头', '推镜'],
    examples: [
      '品牌Logo展示',
      '品牌色调呈现',
      '品牌元素突出',
      '品牌理念传达',
      '品牌形象强化'
    ]
  },
  closing: {
    name: '结束定格',
    description: '留下深刻印象的结束镜头',
    purpose: '强化记忆，促成转化',
    duration: '2-3秒',
    priority: 'high',
    techniques: [
      '定格画面',
      '品牌强化',
      '产品展示',
      '信息呈现',
      '情感共鸣'
    ],
    cameraMovements: ['固定镜头', '拉镜', '推镜'],
    examples: [
      '产品定格展示',
      '品牌Logo定格',
      '模特微笑定格',
      '产品信息呈现',
      '情感共鸣画面'
    ]
  }
};

// ==================== 5. 情绪风格库 ====================
export const EMOTION_STYLE_RULES = {
  premium: {
    name: '高级感',
    description: '奢华高端的视觉风格',
    characteristics: ['精致', '奢华', '优雅', '品质感'],
    colorPalette: ['黑色', '金色', '白色', '深灰色'],
    lighting: '专业柔光+轮廓光',
    composition: '中心构图+对称构图',
    cameraWork: '稳定+专业',
    music: '古典+优雅',
    pace: '慢节奏',
    targetAudience: '高端消费群体'
  },
  healing: {
    name: '治愈感',
    description: '温馨治愈的视觉风格',
    characteristics: ['温馨', '舒适', '治愈', '温暖'],
    colorPalette: ['米色', '浅棕色', '柔和粉色', '淡蓝色'],
    lighting: '暖光+柔和光',
    composition: '自然构图+生活化',
    cameraWork: '平稳+流畅',
    music: '轻柔+温馨',
    pace: '中等节奏',
    targetAudience: '追求生活品质的群体'
  },
  lightLuxury: {
    name: '轻奢感',
    description: '时尚轻奢的视觉风格',
    characteristics: ['时尚', '精致', '轻奢', '品味'],
    colorPalette: ['莫兰迪色', '金属色', '柔和彩色', '中性色'],
    lighting: '时尚光+环境光',
    composition: '时尚构图+潮流感',
    cameraWork: '时尚+动感',
    music: '时尚+潮流',
    pace: '中等偏快节奏',
    targetAudience: '年轻时尚群体'
  },
  academic: {
    name: '学院风',
    description: '青春学院的视觉风格',
    characteristics: ['青春', '学院', '活力', '知性'],
    colorPalette: ['藏蓝色', '白色', '卡其色', '酒红色'],
    lighting: '自然光+青春光',
    composition: '青春构图+活力感',
    cameraWork: '活力+自然',
    music: '青春+活力',
    pace: '中等节奏',
    targetAudience: '学生群体'
  },
  westernCommercial: {
    name: '欧美广告风',
    description: '欧美风格的广告视觉',
    characteristics: ['大气', '国际化', '专业', '冲击力'],
    colorPalette: ['高饱和度', '对比色', '黑白', '金属色'],
    lighting: '专业广告光+戏剧光',
    composition: '冲击力构图+专业感',
    cameraWork: '专业+动感',
    music: '国际范+冲击力',
    pace: '快节奏',
    targetAudience: '国际化消费群体'
  },
  minimalist: {
    name: '极简风',
    description: '简约极简的视觉风格',
    characteristics: ['简约', '干净', '纯粹', '高级'],
    colorPalette: ['白色', '黑色', '灰色', '单色'],
    lighting: '纯净光+自然光',
    composition: '极简构图+留白',
    cameraWork: '稳定+纯净',
    music: '简约+纯净',
    pace: '慢节奏',
    targetAudience: '追求简约的群体'
  },
  fashion: {
    name: '时尚潮流',
    description: '时尚潮流的视觉风格',
    characteristics: ['时尚', '潮流', '前卫', '个性'],
    colorPalette: ['流行色', '撞色', '金属色', '霓虹色'],
    lighting: '时尚光+潮流光',
    composition: '时尚构图+前卫感',
    cameraWork: '动感+前卫',
    music: '潮流+前卫',
    pace: '快节奏',
    targetAudience: '年轻潮流群体'
  },
  natural: {
    name: '自然清新',
    description: '自然清新的视觉风格',
    characteristics: ['自然', '清新', '舒适', '健康'],
    colorPalette: ['绿色', '蓝色', '白色', '大地色'],
    lighting: '自然光+清新光',
    composition: '自然构图+生活化',
    cameraWork: '自然+流畅',
    music: '清新+自然',
    pace: '中等节奏',
    targetAudience: '追求自然的群体'
  }
};

// ==================== 6. 分镜生成规则 ====================
export const STORYBOARD_GENERATION_RULES = {
  // 产品类型映射
  productTypeMapping: {
    clothing: {
      category: '服装',
      defaultScenes: ['campus', 'cafe', 'street', 'studio'],
      defaultCharacters: ['maleModel', 'femaleModel', 'couple'],
      defaultStyles: ['premium', 'fashion', 'lightLuxury'],
      structure: ['opening', 'overallDisplay', 'detailDisplay', 'functionDisplay', 'brandReinforcement', 'closing']
    },
    bag: {
      category: '箱包',
      defaultScenes: ['commute', 'airport', 'office', 'cafe'],
      defaultCharacters: ['businessPerson', 'traveler', 'student'],
      defaultStyles: ['premium', 'lightLuxury', 'minimalist'],
      structure: ['opening', 'overallDisplay', 'functionDisplay', 'detailDisplay', 'brandReinforcement', 'closing']
    },
    pet: {
      category: '宠物用品',
      defaultScenes: ['livingRoom', 'lawn', 'petPark'],
      defaultCharacters: ['petOwner', 'family'],
      defaultStyles: ['healing', 'natural', 'premium'],
      structure: ['opening', 'functionDisplay', 'overallDisplay', 'detailDisplay', 'brandReinforcement', 'closing']
    },
    furniture: {
      category: '家具',
      defaultScenes: ['livingRoom', 'bedroom', 'study'],
      defaultCharacters: ['resident', 'professional'],
      defaultStyles: ['premium', 'minimalist', 'natural'],
      structure: ['opening', 'overallDisplay', 'functionDisplay', 'detailDisplay', 'brandReinforcement', 'closing']
    },
    digital: {
      category: '数码产品',
      defaultScenes: ['studio', 'office', 'lifestyle'],
      defaultCharacters: ['techUser', 'professional'],
      defaultStyles: ['premium', 'minimalist', 'westernCommercial'],
      structure: ['opening', 'overallDisplay', 'functionDisplay', 'detailDisplay', 'brandReinforcement', 'closing']
    },
    beauty: {
      category: '美妆产品',
      defaultScenes: ['vanity', 'studio', 'bathroom'],
      defaultCharacters: ['beautyEnthusiast', 'professional'],
      defaultStyles: ['premium', 'fashion', 'lightLuxury'],
      structure: ['opening', 'overallDisplay', 'detailDisplay', 'functionDisplay', 'brandReinforcement', 'closing']
    },
    food: {
      category: '食品饮料',
      defaultScenes: ['kitchen', 'restaurant', 'studio'],
      defaultCharacters: ['foodie', 'chef'],
      defaultStyles: ['natural', 'healing', 'premium'],
      structure: ['opening', 'detailDisplay', 'functionDisplay', 'overallDisplay', 'brandReinforcement', 'closing']
    }
  },

  // 时长分配规则
  durationAllocation: {
    short: { // 5-10秒
      totalShots: 3,
      allocation: {
        opening: 0.2,      // 20%
        overallDisplay: 0.3, // 30%
        closing: 0.5       // 50%
      }
    },
    medium: { // 10-20秒
      totalShots: 5,
      allocation: {
        opening: 0.15,     // 15%
        overallDisplay: 0.25, // 25%
        detailDisplay: 0.2, // 20%
        functionDisplay: 0.25, // 25%
        closing: 0.15      // 15%
      }
    },
    long: { // 20-30秒
      totalShots: 7,
      allocation: {
        opening: 0.1,      // 10%
        overallDisplay: 0.2, // 20%
        detailDisplay: 0.15, // 15%
        functionDisplay: 0.2, // 20%
        brandReinforcement: 0.15, // 15%
        closing: 0.2       // 20%
      }
    }
  },

  // 风格匹配规则
  styleMatching: {
    keywords: {
      premium: ['高端', '奢华', '精致', '品质', '优雅'],
      healing: ['治愈', '温馨', '舒适', '温暖', '自然'],
      lightLuxury: ['轻奢', '时尚', '精致', '品味', '潮流'],
      academic: ['学院', '青春', '知性', '校园', '学生'],
      westernCommercial: ['欧美', '国际', '大气', '专业', '冲击力'],
      minimalist: ['极简', '简约', '干净', '纯粹', '高级'],
      fashion: ['时尚', '潮流', '前卫', '个性', '流行'],
      natural: ['自然', '清新', '健康', '舒适', '环保']
    }
  },

  // 运镜组合规则
  cameraMovementCombinations: {
    opening: ['pushIn', 'zoomIn', 'static'],
    overallDisplay: ['orbit', 'pullOut', 'pan'],
    detailDisplay: ['pushIn', 'zoomIn', 'static'],
    functionDisplay: ['tracking', 'dolly', 'static'],
    brandReinforcement: ['pullOut', 'static', 'pushIn'],
    closing: ['static', 'pullOut', 'pushIn']
  },

  // 生成优先级规则
  generationPriority: {
    high: ['opening', 'overallDisplay', 'functionDisplay', 'closing'],
    medium: ['detailDisplay', 'brandReinforcement'],
    low: []
  },

  // 质量评估规则
  qualityAssessment: {
    richness: {
      description: '镜头丰富度',
      factors: ['镜头数量', '镜头类型多样性', '场景多样性', '运镜多样性'],
      weights: [0.3, 0.3, 0.2, 0.2]
    },
    commercialValue: {
      description: '商业价值',
      factors: ['产品展示完整性', '卖点突出度', '品牌强化度', '转化引导性'],
      weights: [0.3, 0.3, 0.2, 0.2]
    },
    productCoverage: {
      description: '产品覆盖度',
      factors: ['整体展示', '细节展示', '功能展示', '使用场景'],
      weights: [0.25, 0.25, 0.25, 0.25]
    },
    visualExpression: {
      description: '视觉表现力',
      factors: ['构图质量', '光影效果', '色彩搭配', '运镜流畅度'],
      weights: [0.3, 0.3, 0.2, 0.2]
    },
    conversionAbility: {
      description: '转化能力',
      factors: ['吸引力', '信息传达', '情感共鸣', '行动引导'],
      weights: [0.3, 0.3, 0.2, 0.2]
    }
  }
};

// ==================== 工具函数 ====================

/**
 * 根据产品类型获取默认配置
 */
export function getProductConfig(productType: string) {
  return STORYBOARD_GENERATION_RULES.productTypeMapping[productType] || 
         STORYBOARD_GENERATION_RULES.productTypeMapping.clothing;
}

/**
 * 根据视频时长获取镜头配置
 */
export function getDurationConfig(duration: number) {
  if (duration <= 10) return STORYBOARD_GENERATION_RULES.durationAllocation.short;
  if (duration <= 20) return STORYBOARD_GENERATION_RULES.durationAllocation.medium;
  return STORYBOARD_GENERATION_RULES.durationAllocation.long;
}

/**
 * 根据关键词匹配风格
 */
export function matchStyleByKeywords(description: string): string[] {
  const matchedStyles: string[] = [];
  const lowerDesc = description.toLowerCase();

  for (const [style, keywords] of Object.entries(STORYBOARD_GENERATION_RULES.styleMatching.keywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase()))) {
      matchedStyles.push(style);
    }
  }

  return matchedStyles.length > 0 ? matchedStyles : ['premium'];
}

/**
 * 生成分镜结构
 */
export function generateStoryboardStructure(
  productType: string,
  duration: number,
  userStyles?: string[]
): string[] {
  const productConfig = getProductConfig(productType);
  const durationConfig = getDurationConfig(duration);
  
  // 如果用户指定了风格，使用用户风格；否则使用产品默认风格
  const styles = userStyles && userStyles.length > 0 ? userStyles : productConfig.defaultStyles;
  
  // 根据时长配置确定结构
  if (durationConfig.totalShots <= productConfig.structure.length) {
    return productConfig.structure.slice(0, durationConfig.totalShots);
  }
  
  return productConfig.structure;
}

/**
 * 计算每个镜头的时长
 */
export function calculateShotDurations(
  structure: string[],
  totalDuration: number
): number[] {
  const durations: number[] = [];
  const avgDuration = totalDuration / structure.length;
  
  // 根据结构类型分配权重
  const weights = structure.map(type => {
    switch (type) {
      case 'opening':
        return 0.15;
      case 'closing':
        return 0.15;
      case 'overallDisplay':
      case 'functionDisplay':
        return 0.25;
      case 'detailDisplay':
      case 'brandReinforcement':
        return 0.1;
      default:
        return 0.2;
    }
  });
  
  // 归一化权重
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  // 计算时长
  let remaining = totalDuration;
  for (let i = 0; i < structure.length; i++) {
    if (i === structure.length - 1) {
      durations.push(Math.round(remaining * 10) / 10);
    } else {
      const duration = Math.round(normalizedWeights[i] * totalDuration * 10) / 10;
      durations.push(duration);
      remaining -= duration;
    }
  }
  
  return durations;
}

/**
 * 获取推荐的运镜方式
 */
export function getRecommendedCameraMovement(structureType: string): string[] {
  return STORYBOARD_GENERATION_RULES.cameraMovementCombinations[structureType] || ['static'];
}

/**
 * 评估分镜质量
 */
export function assessStoryboardQuality(shots: any[]): {
  score: number;
  details: {
    richness: number;
    commercialValue: number;
    productCoverage: number;
    visualExpression: number;
    conversionAbility: number;
  };
} {
  const assessment = STORYBOARD_GENERATION_RULES.qualityAssessment;
  
  // 简化的质量评估逻辑
  const richness = Math.min(100, shots.length * 15);
  const commercialValue = Math.min(100, shots.length * 12);
  const productCoverage = Math.min(100, shots.length * 18);
  const visualExpression = Math.min(100, shots.length * 15);
  const conversionAbility = Math.min(100, shots.length * 12);
  
  const score = Math.round(
    richness * 0.2 + 
    commercialValue * 0.25 + 
    productCoverage * 0.25 + 
    visualExpression * 0.15 + 
    conversionAbility * 0.15
  );
  
  return {
    score,
    details: {
      richness,
      commercialValue,
      productCoverage,
      visualExpression,
      conversionAbility
    }
  };
}

// ==================== 导出所有规则 ====================
export const STORYBOARD_DIRECTOR_SYSTEM = {
  scenes: SCENE_RULES,
  characters: CHARACTER_RULES,
  cameraMovements: CAMERA_MOVEMENT_RULES,
  shotStructures: SHOT_STRUCTURE_RULES,
  emotionStyles: EMOTION_STYLE_RULES,
  generationRules: STORYBOARD_GENERATION_RULES,
  utils: {
    getProductConfig,
    getDurationConfig,
    matchStyleByKeywords,
    generateStoryboardStructure,
    calculateShotDurations,
    getRecommendedCameraMovement,
    assessStoryboardQuality
  }
};