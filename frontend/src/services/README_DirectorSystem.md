# Storyboard Director Prompt System（导演级分镜规则系统）

## 系统概述

Storyboard Director Prompt System 是一个专业的分镜生成规则系统，将高质量导演分镜Prompt中的规则提取并模块化，实现自动化、智能化的分镜生成。

## 系统架构

系统分为6个核心模块：

### 1. 场景规则库 (SCENE_RULES)
根据产品类型提供推荐的场景配置：

- **服装类**: 校园、咖啡馆、街拍、城市天桥、极简摄影棚
- **箱包类**: 通勤、机场、办公桌、咖啡馆
- **宠物用品类**: 客厅、草坪、宠物乐园
- **家具类**: 客厅、卧室、书房
- **数码产品类**: 专业摄影棚、现代办公、生活场景
- **美妆产品类**: 梳妆台、专业摄影棚、浴室
- **食品类**: 厨房、餐厅、食品摄影棚

每个场景包含：
- 场景名称和描述
- 场景元素列表
- 推荐光影效果
- 情绪氛围
- 推荐运镜角度

### 2. 人物规则库 (CHARACTER_RULES)
根据产品类型提供推荐的人物配置：

- **服装类**: 男模、女模、情侣模特
- **箱包类**: 商务人士、旅行者、学生
- **宠物用品类**: 宠物主人、家庭
- **家具类**: 居住者、专业人士
- **数码产品类**: 科技用户、专业人士
- **美妆产品类**: 美妆爱好者、美妆专业
- **食品类**: 美食爱好者、厨师

每个人物包含：
- 人物名称和描述
- 特征特点
- 推荐姿势
- 表情类型
- 年龄范围
- 风格定位

### 3. 运镜规则库 (CAMERA_MOVEMENT_RULES)
提供10种专业运镜方式：

- **推镜**: 镜头逐渐推进，突出重点
- **拉镜**: 镜头逐渐拉远，展示环境
- **跟拍**: 跟随主体移动，展现动态
- **环绕**: 围绕主体旋转，展示多角度
- **平移**: 水平移动镜头，展现横向场景
- **俯拍**: 从上向下拍摄，展现全局
- **仰拍**: 从下向上拍摄，突出主体
- **固定镜头**: 镜头固定不动，稳定展示
- **变焦推镜**: 通过变焦推进，突出重点
- **移动镜头**: 整体移动镜头，展现流动感

每种运镜包含：
- 运镜名称和描述
- 特点说明
- 速度/方向选项
- 使用场景
- 推荐时长
- 视觉效果

### 4. 镜头结构库 (SHOT_STRUCTURE_RULES)
定义6种核心镜头结构：

- **开场吸引**: 吸引观众注意力的开场镜头
- **整体展示**: 展示产品整体效果
- **细节展示**: 展示产品细节和工艺
- **功能展示**: 展示产品功能和使用方法
- **品牌强化**: 强化品牌形象和认知
- **结束定格**: 留下深刻印象的结束镜头

每种结构包含：
- 结构名称和描述
- 镜头目的
- 推荐时长
- 优先级
- 技术手法
- 推荐运镜
- 实例说明

### 5. 情绪风格库 (EMOTION_STYLE_RULES)
提供8种情绪风格：

- **高级感**: 奢华高端的视觉风格
- **治愈感**: 温馨治愈的视觉风格
- **轻奢感**: 时尚轻奢的视觉风格
- **学院风**: 青春学院的视觉风格
- **欧美广告风**: 欧美风格的广告视觉
- **极简风**: 简约极简的视觉风格
- **时尚潮流**: 时尚潮流的视觉风格
- **自然清新**: 自然清新的视觉风格

每种风格包含：
- 风格名称和描述
- 特点说明
- 色彩搭配
- 光影要求
- 构图方式
- 运镜特点
- 音乐风格
- 节奏控制
- 目标受众

### 6. 分镜生成规则 (STORYBOARD_GENERATION_RULES)
提供自动化分镜生成的核心规则：

- **产品类型映射**: 根据产品类型自动匹配场景、人物、风格和结构
- **时长分配规则**: 根据视频时长智能分配镜头数量和时长
- **风格匹配规则**: 根据关键词自动匹配合适的风格
- **运镜组合规则**: 根据镜头结构推荐运镜方式
- **生成优先级规则**: 定义镜头生成的优先级顺序
- **质量评估规则**: 多维度评估分镜质量

## 文件结构

```
frontend/src/services/
├── storyboardDirectorSystem.ts          # 导演系统核心规则库
├── storyboardDirectorExamples.ts        # 使用示例和演示
├── storyboardDirectorIntegration.ts     # 与现有服务的集成层
└── storyboardService.ts                 # 原有分镜服务（保持兼容）
```

## 核心功能

### 1. 智能产品分析
```typescript
import { analyzeProductFeatures } from './storyboardService';

const features = analyzeProductFeatures('高端时尚男装，展现商务精英气质');
// 返回产品类型、关键元素、情绪风格、目标受众等
```

### 2. 自动配置匹配
```typescript
import { STORYBOARD_DIRECTOR_SYSTEM } from './storyboardDirectorSystem';

const productConfig = STORYBOARD_DIRECTOR_SYSTEM.utils.getProductConfig('clothing');
// 自动获取服装类的推荐场景、人物、风格和结构
```

### 3. 智能分镜结构生成
```typescript
const structure = STORYBOARD_DIRECTOR_SYSTEM.utils.generateStoryboardStructure(
  'clothing',  // 产品类型
  15,          // 视频时长
  ['premium']  // 用户指定的风格
);
// 返回分镜结构数组，如 ['opening', 'overallDisplay', 'detailDisplay', ...]
```

### 4. 时长智能分配
```typescript
const durations = STORYBOARD_DIRECTOR_SYSTEM.utils.calculateShotDurations(
  structure,
  15  // 总时长
);
// 返回每个镜头的时长分配，如 [2.5, 3.5, 2.5, 3.0, 3.5]
```

### 5. 风格关键词匹配
```typescript
const matchedStyles = STORYBOARD_DIRECTOR_SYSTEM.utils.matchStyleByKeywords(
  '高端奢华精致品质'
);
// 返回匹配的风格，如 ['premium']
```

### 6. 运镜推荐
```typescript
const cameras = STORYBOARD_DIRECTOR_SYSTEM.utils.getRecommendedCameraMovement('opening');
// 返回开场镜头的推荐运镜，如 ['pushIn', 'zoomIn', 'static']
```

### 7. 质量评估
```typescript
const quality = STORYBOARD_DIRECTOR_SYSTEM.utils.assessStoryboardQuality(shots);
// 返回多维度质量评分
```

## 使用示例

### 基础使用
```typescript
import { storyboardExamples } from './storyboardDirectorExamples';

// 生成服装类分镜
const clothingShots = storyboardExamples.generateClothingStoryboardExample();

// 生成箱包类分镜
const bagShots = storyboardExamples.generateBagStoryboardExample();

// 智能生成分镜
const smartShots = storyboardExamples.generateSmartStoryboard(
  '高端时尚男装，展现商务精英气质',
  15
);
```

### 集成使用
```typescript
import { directorSystemIntegration } from './storyboardDirectorIntegration';

// 构建导演级提示词
const prompt = directorSystemIntegration.buildDirectorStoryboardPrompt(
  userDescription,
  features,
  params,
  styles,
  imageCount
);

// 构建AI消息
const messages = directorSystemIntegration.buildDirectorAIMessages(
  prompt,
  duration,
  styles
);

// 增强分镜结果
const enhancedResult = directorSystemIntegration.enhanceStoryboardWithDirectorSystem(
  shots,
  features
);
```

## 系统优势

### 1. 模块化设计
- 每个规则库独立管理，易于维护和扩展
- 可以单独使用某个模块，也可以组合使用
- 支持自定义规则扩展

### 2. 智能化匹配
- 根据产品类型自动匹配最合适的配置
- 根据用户描述智能识别风格偏好
- 根据视频时长自动优化分镜结构

### 3. 专业级质量
- 基于专业导演经验提炼的规则
- 涵盖场景、人物、运镜、结构、风格等全方位要素
- 多维度质量评估体系

### 4. 灵活可扩展
- 支持添加新的产品类型
- 支持自定义场景、人物、运镜等规则
- 支持调整生成规则和评估标准

### 5. 兼容性好
- 与现有分镜服务完全兼容
- 可以逐步迁移到新系统
- 支持混合使用新旧系统

## 质量评估维度

系统提供5个维度的质量评估：

1. **镜头丰富度** (30%)
   - 镜头数量
   - 镜头类型多样性
   - 场景多样性
   - 运镜多样性

2. **商业价值** (30%)
   - 产品展示完整性
   - 卖点突出度
   - 品牌强化度
   - 转化引导性

3. **产品覆盖度** (25%)
   - 整体展示
   - 细节展示
   - 功能展示
   - 使用场景

4. **视觉表现力** (20%)
   - 构图质量
   - 光影效果
   - 色彩搭配
   - 运镜流畅度

5. **转化能力** (25%)
   - 吸引力
   - 信息传达
   - 情感共鸣
   - 行动引导

## 扩展指南

### 添加新的产品类型
```typescript
// 在 STORYBOARD_GENERATION_RULES.productTypeMapping 中添加
newProduct: {
  category: '新产品',
  defaultScenes: ['scene1', 'scene2'],
  defaultCharacters: ['character1', 'character2'],
  defaultStyles: ['style1', 'style2'],
  structure: ['opening', 'overallDisplay', 'closing']
}
```

### 添加新的场景规则
```typescript
// 在 SCENE_RULES 中添加对应产品类型的场景
newProduct: {
  newScene: {
    name: '新场景',
    description: '场景描述',
    elements: ['元素1', '元素2'],
    lighting: '光影描述',
    mood: '情绪氛围',
    cameraAngles: ['运镜1', '运镜2']
  }
}
```

### 添加新的情绪风格
```typescript
// 在 EMOTION_STYLE_RULES 中添加
newStyle: {
  name: '新风格',
  description: '风格描述',
  characteristics: ['特点1', '特点2'],
  colorPalette: ['颜色1', '颜色2'],
  lighting: '光影要求',
  composition: '构图方式',
  cameraWork: '运镜特点',
  music: '音乐风格',
  pace: '节奏控制',
  targetAudience: '目标受众'
}
```

## 最佳实践

1. **产品类型识别**: 确保正确识别产品类型，以获得最准确的配置
2. **风格匹配**: 充分利用关键词匹配功能，提供准确的风格描述
3. **时长规划**: 根据视频时长选择合适的分镜数量和结构
4. **质量评估**: 使用质量评估功能持续优化分镜效果
5. **规则扩展**: 根据实际需求扩展自定义规则

## 技术特点

- **TypeScript**: 完整的类型定义，提供良好的开发体验
- **模块化**: 清晰的模块划分，易于维护和测试
- **可扩展**: 支持灵活的规则扩展和自定义
- **高性能**: 优化的算法和数据处理，确保快速响应
- **易集成**: 与现有系统无缝集成，支持渐进式迁移

## 总结

Storyboard Director Prompt System 通过模块化的规则库和智能化的匹配算法，实现了专业级的分镜自动生成。系统不仅提高了分镜生成的效率和质量，还为后续的扩展和优化提供了良好的基础架构。

通过使用这个系统，可以：
- 自动化生成高质量的分镜脚本
- 确保分镜的专业性和商业价值
- 提高视频制作的效率和质量
- 降低对专业导演经验的依赖
- 实现标准化的分镜生成流程

系统适用于各种产品广告视频的制作，特别是电商、社交媒体、品牌宣传等场景。