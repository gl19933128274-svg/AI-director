import { PrismaClient } from '@prisma/client';
import { StoryboardError, ValidationError } from './errors';

const prisma = new PrismaClient();

// 镜头类型枚举
export type ShotType = 'wide' | 'medium' | 'closeup' | 'extreme_closeup' | 'long_shot' | 'medium_long';

// 运镜方式枚举
export type CameraMovement = 'push' | 'pull' | 'pan' | 'track' | 'follow' | 'dolly' | 'zoom';

// 光影风格枚举
export type LightingStyle = 'bright' | 'dark' | 'high_contrast' | 'soft' | 'dramatic' | 'natural';

// 过渡效果枚举
export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom';

// 镜头配置
export interface ShotConfig {
  id: string;
  type: ShotType;
  duration: number;           // 秒
  cameraMovement?: CameraMovement;
  movementSpeed?: 'slow' | 'normal' | 'fast';
  lighting?: LightingStyle;
  composition?: string;       // 构图：rule_of_thirds, center, leading_lines
  description?: string;       // AI生成提示词
  transition?: TransitionType;
  transitionDuration?: number; // 过渡时长（毫秒）
}

// 场景配置
export interface SceneConfig {
  setting: string;            // 场景设置：室内/室外/城市/森林等
  timeOfDay: string;          // 时间：早晨/中午/傍晚/夜晚
  weather?: string;           // 天气
  mood: string;               // 情绪：欢快/悲伤/紧张/浪漫
}

// 分镜生成请求
export interface StoryboardRequest {
  prompt: string;             // 用户输入提示
  sceneConfig: SceneConfig;
  shotCount?: number;         // 镜头数量
  targetDuration?: number;    // 目标时长（秒）
  style?: string;             // 整体风格
  quality?: 'low' | 'medium' | 'high';
}

// 分镜生成结果
export interface StoryboardResult {
  id: string;
  prompt: string;
  sceneConfig: SceneConfig;
  shots: ShotConfig[];
  totalDuration: number;
  createdAt: Date;
}

// 镜头类型配置
const SHOT_TYPE_CONFIG: Record<ShotType, { description: string; minDuration: number; maxDuration: number }> = {
  wide: { description: '全景镜头，展示整个场景和环境', minDuration: 3, maxDuration: 8 },
  medium: { description: '中景镜头，展示人物上半身', minDuration: 2, maxDuration: 6 },
  closeup: { description: '特写镜头，展示面部表情或物体细节', minDuration: 1, maxDuration: 4 },
  extreme_closeup: { description: '大特写镜头，展示眼睛、手部等局部细节', minDuration: 0.5, maxDuration: 2 },
  long_shot: { description: '远景镜头，展示广阔的场景', minDuration: 4, maxDuration: 10 },
  medium_long: { description: '中远景镜头，介于远景和中景之间', minDuration: 3, maxDuration: 7 },
};

// 运镜配置
const CAMERA_MOVEMENT_CONFIG: Record<CameraMovement, { description: string; compatibleShots: ShotType[] }> = {
  push: { description: '推镜头：镜头向主体推进，增强代入感', compatibleShots: ['medium', 'closeup', 'extreme_closeup'] },
  pull: { description: '拉镜头：镜头远离主体，展示环境', compatibleShots: ['wide', 'long_shot', 'medium_long'] },
  pan: { description: '摇镜头：镜头水平转动，展示横向场景', compatibleShots: ['wide', 'long_shot', 'medium_long'] },
  track: { description: '移镜头：镜头水平移动拍摄', compatibleShots: ['wide', 'medium', 'long_shot'] },
  follow: { description: '跟镜头：跟随主体移动', compatibleShots: ['medium', 'closeup', 'wide'] },
  dolly: { description: '升降镜头：镜头垂直方向移动', compatibleShots: ['wide', 'long_shot'] },
  zoom: { description: '变焦：通过焦距变化实现推拉效果', compatibleShots: ['medium', 'closeup', 'wide'] },
};

// 光影风格配置
const LIGHTING_CONFIG: Record<LightingStyle, { description: string; moodMatch: string[] }> = {
  bright: { description: '明亮光线，适合欢快场景', moodMatch: ['happy', 'cheerful', 'optimistic'] },
  dark: { description: '暗调光线，适合神秘或悲伤场景', moodMatch: ['sad', 'mysterious', 'serious'] },
  high_contrast: { description: '高对比度，强烈明暗对比', moodMatch: ['dramatic', 'intense', 'dramatic'] },
  soft: { description: '柔和光线，适合温馨场景', moodMatch: ['romantic', 'peaceful', 'gentle'] },
  dramatic: { description: '戏剧性光线，强烈的光影效果', moodMatch: ['dramatic', 'epic', 'cinematic'] },
  natural: { description: '自然光线，真实感强', moodMatch: ['natural', 'realistic', 'documentary'] },
};

// AI分镜服务
export const storyboardService = {
  // 生成分镜脚本
  async generate(request: StoryboardRequest): Promise<StoryboardResult> {
    const shotCount = request.shotCount || 5;
    const targetDuration = request.targetDuration || 30;

    // 验证参数
    if (!request.prompt || request.prompt.length < 5) {
      throw new ValidationError('提示词至少需要5个字符', 'prompt');
    }

    if (shotCount < 1 || shotCount > 20) {
      throw new ValidationError('镜头数量必须在1-20之间', 'shotCount');
    }

    // 生成镜头序列
    const shots = await this.generateShotSequence(request, shotCount, targetDuration);

    // 计算总时长
    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

    // 创建生成任务记录
    const task = await prisma.generationTask.create({
      data: {
        type: 'storyboard',
        status: 'completed',
        input: JSON.stringify(request),
        output: JSON.stringify({ shots, totalDuration }),
      },
    });

    return {
      id: task.id,
      prompt: request.prompt,
      sceneConfig: request.sceneConfig,
      shots,
      totalDuration,
      createdAt: task.createdAt,
    };
  },

  // 生成镜头序列
  async generateShotSequence(request: StoryboardRequest, shotCount: number, targetDuration: number): Promise<ShotConfig[]> {
    const shots: ShotConfig[] = [];
    const durationPerShot = targetDuration / shotCount;

    // 根据场景配置选择合适的镜头类型和运镜方式
    const availableShots = this.selectShotTypes(request.sceneConfig);
    const availableMovements = this.selectCameraMovements(request.sceneConfig);

    for (let i = 0; i < shotCount; i++) {
      // 选择镜头类型（多样化）
      const shotType = availableShots[i % availableShots.length];
      const shotConfig = SHOT_TYPE_CONFIG[shotType];

      // 根据镜头类型选择兼容的运镜方式
      const compatibleMovements = availableMovements.filter(m => 
        CAMERA_MOVEMENT_CONFIG[m].compatibleShots.includes(shotType)
      );
      const cameraMovement = compatibleMovements.length > 0 
        ? compatibleMovements[Math.floor(Math.random() * compatibleMovements.length)]
        : undefined;

      // 选择光影风格
      const lighting = this.selectLighting(request.sceneConfig.mood);

      // 计算镜头时长（在合理范围内）
      const duration = Math.min(
        Math.max(durationPerShot * (0.8 + Math.random() * 0.4), shotConfig.minDuration),
        shotConfig.maxDuration
      );

      // 生成镜头描述
      const description = await this.generateShotDescription(
        request.prompt,
        request.sceneConfig,
        shotType,
        cameraMovement,
        lighting,
        i + 1,
        shotCount
      );

      shots.push({
        id: `shot-${i + 1}`,
        type: shotType,
        duration: Math.round(duration * 10) / 10,
        cameraMovement,
        movementSpeed: 'normal',
        lighting,
        composition: this.selectComposition(shotType),
        description,
        transition: i < shotCount - 1 ? this.selectTransition(i) : undefined,
        transitionDuration: 300,
      });
    }

    return shots;
  },

  // 根据场景选择镜头类型
  selectShotTypes(scene: SceneConfig): ShotType[] {
    const shots: ShotType[] = ['wide', 'medium', 'closeup'];
    
    if (scene.setting.includes('室外') || scene.setting.includes('广阔')) {
      shots.push('long_shot', 'medium_long');
    }
    
    if (scene.mood.includes('紧张') || scene.mood.includes('激烈')) {
      shots.push('extreme_closeup');
    }
    
    return [...new Set(shots)];
  },

  // 根据场景选择运镜方式
  selectCameraMovements(scene: SceneConfig): CameraMovement[] {
    const movements: CameraMovement[] = ['push', 'pull', 'pan'];
    
    if (scene.mood.includes('追逐') || scene.mood.includes('运动')) {
      movements.push('track', 'follow');
    }
    
    if (scene.setting.includes('广阔') || scene.setting.includes('宏大')) {
      movements.push('dolly');
    }
    
    return [...new Set(movements)];
  },

  // 根据情绪选择光影风格
  selectLighting(mood: string): LightingStyle {
    for (const [style, config] of Object.entries(LIGHTING_CONFIG)) {
      if (config.moodMatch.some(m => mood.includes(m))) {
        return style as LightingStyle;
      }
    }
    return 'natural';
  },

  // 选择构图方式
  selectComposition(shotType: ShotType): string {
    const compositions: Record<ShotType, string[]> = {
      wide: ['rule_of_thirds', 'leading_lines', 'symmetry'],
      medium: ['rule_of_thirds', 'center'],
      closeup: ['rule_of_thirds', 'center', 'negative_space'],
      extreme_closeup: ['center', 'extreme_close'],
      long_shot: ['rule_of_thirds', 'leading_lines', 'depth'],
      medium_long: ['rule_of_thirds', 'center'],
    };
    
    const options = compositions[shotType];
    return options[Math.floor(Math.random() * options.length)];
  },

  // 选择过渡效果
  selectTransition(index: number): TransitionType {
    // 开头使用淡入，中间使用切或溶解，结尾使用淡出
    if (index === 0) return 'fade';
    
    const transitions: TransitionType[] = ['cut', 'dissolve', 'cut', 'cut'];
    return transitions[index % transitions.length];
  },

  // 生成镜头描述
  async generateShotDescription(
    prompt: string,
    scene: SceneConfig,
    shotType: ShotType,
    cameraMovement: CameraMovement | undefined,
    lighting: LightingStyle,
    shotIndex: number,
    totalShots: number
  ): Promise<string> {
    const shotDesc = SHOT_TYPE_CONFIG[shotType].description;
    const movementDesc = cameraMovement ? CAMERA_MOVEMENT_CONFIG[cameraMovement].description : '';
    const lightingDesc = LIGHTING_CONFIG[lighting].description;

    let description = `${shotDesc}，`;
    
    if (movementDesc) {
      description += `${movementDesc}，`;
    }
    
    description += `${lightingDesc}。`;
    
    // 根据镜头位置添加场景描述
    if (shotIndex === 1) {
      description += `开场镜头，展示${scene.setting}的整体环境，时间是${scene.timeOfDay}。`;
    } else if (shotIndex === totalShots) {
      description += `收尾镜头，${scene.mood}的氛围达到高潮。`;
    } else {
      description += `镜头${shotIndex}，${scene.mood}的氛围。`;
    }
    
    description += `核心内容：${prompt}`;

    return description;
  },

  // 获取镜头类型列表
  getShotTypes(): { type: ShotType; description: string }[] {
    return Object.entries(SHOT_TYPE_CONFIG).map(([type, config]) => ({
      type: type as ShotType,
      description: config.description,
    }));
  },

  // 获取运镜方式列表
  getCameraMovements(): { type: CameraMovement; description: string }[] {
    return Object.entries(CAMERA_MOVEMENT_CONFIG).map(([type, config]) => ({
      type: type as CameraMovement,
      description: config.description,
    }));
  },

  // 获取光影风格列表
  getLightingStyles(): { type: LightingStyle; description: string }[] {
    return Object.entries(LIGHTING_CONFIG).map(([type, config]) => ({
      type: type as LightingStyle,
      description: config.description,
    }));
  },
};

export default storyboardService;