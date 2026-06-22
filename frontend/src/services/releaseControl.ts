/**
 * 灰度发布系统（Release Control）
 * 
 * 功能：
 * 1. 用户分组机制（100%/10%/1%流量控制）
 * 2. 按 user_id hash 分流
 * 3. 功能开关（video_generation_enabled, scene_generation_enabled）
 * 4. Kill switch（紧急关闭AI调用）
 */

export interface FeatureFlags {
  videoGeneration: boolean;
  sceneGeneration: boolean;
  imageToVideo: boolean;
  storyboardGeneration: boolean;
  aiChat: boolean;
  analytics: boolean;
}

export interface ReleaseConfig {
  enabled: boolean;
  trafficPercent: number;
  killSwitch: boolean;
  featureFlags: FeatureFlags;
  allowlistedUsers: string[];
  blocklistedUsers: string[];
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  videoGeneration: true,
  sceneGeneration: true,
  imageToVideo: true,
  storyboardGeneration: true,
  aiChat: true,
  analytics: true
};

const DEFAULT_CONFIG: ReleaseConfig = {
  enabled: true,
  trafficPercent: 100,
  killSwitch: false,
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  allowlistedUsers: [],
  blocklistedUsers: []
};

let config: ReleaseConfig = { ...DEFAULT_CONFIG };

export function initReleaseConfig(customConfig?: Partial<ReleaseConfig>): void {
  if (customConfig?.featureFlags) {
    config.featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...customConfig.featureFlags };
    delete customConfig.featureFlags;
  }
  config = { ...DEFAULT_CONFIG, ...customConfig, featureFlags: config.featureFlags };
}

export function getReleaseConfig(): ReleaseConfig {
  return config;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isUserInRelease(userId: string): boolean {
  if (!config.enabled) {
    return true;
  }
  
  if (config.allowlistedUsers.includes(userId)) {
    return true;
  }
  
  if (config.blocklistedUsers.includes(userId)) {
    return false;
  }
  
  const hash = hashUserId(userId);
  return (hash % 100) < config.trafficPercent;
}

export function getTrafficGroup(userId: string): 'A' | 'B' | 'C' | 'control' {
  const hash = hashUserId(userId);
  const group = hash % 10;
  
  if (group === 0) return 'control';
  if (group <= 3) return 'A';
  if (group <= 6) return 'B';
  return 'C';
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  if (config.killSwitch) {
    return false;
  }
  return config.featureFlags[feature] && config.enabled;
}

export function isVideoGenerationEnabled(): boolean {
  return isFeatureEnabled('videoGeneration');
}

export function isSceneGenerationEnabled(): boolean {
  return isFeatureEnabled('sceneGeneration');
}

export function isKillSwitchActive(): boolean {
  return config.killSwitch;
}

export function activateKillSwitch(reason: string): void {
  config.killSwitch = true;
  console.error(`[ReleaseControl] KILL SWITCH ACTIVATED - ${reason}`);
}

export function deactivateKillSwitch(): void {
  config.killSwitch = false;
  console.log('[ReleaseControl] Kill switch deactivated');
}

export function setTrafficPercent(percent: number): void {
  config.trafficPercent = Math.max(0, Math.min(100, percent));
}

export function enableFeature(feature: keyof FeatureFlags): void {
  config.featureFlags[feature] = true;
}

export function disableFeature(feature: keyof FeatureFlags): void {
  config.featureFlags[feature] = false;
}

export function addToAllowlist(userId: string): void {
  if (!config.allowlistedUsers.includes(userId)) {
    config.allowlistedUsers.push(userId);
  }
}

export function removeFromAllowlist(userId: string): void {
  config.allowlistedUsers = config.allowlistedUsers.filter(u => u !== userId);
}

export function addToBlocklist(userId: string): void {
  if (!config.blocklistedUsers.includes(userId)) {
    config.blocklistedUsers.push(userId);
  }
}

export function removeFromBlocklist(userId: string): void {
  config.blocklistedUsers = config.blocklistedUsers.filter(u => u !== userId);
}

export function getReleaseStatus(): {
  enabled: boolean;
  trafficPercent: number;
  killSwitch: boolean;
  features: FeatureFlags;
  allowlistedCount: number;
  blocklistedCount: number;
} {
  return {
    enabled: config.enabled,
    trafficPercent: config.trafficPercent,
    killSwitch: config.killSwitch,
    features: { ...config.featureFlags },
    allowlistedCount: config.allowlistedUsers.length,
    blocklistedCount: config.blocklistedUsers.length
  };
}

export default {
  initReleaseConfig,
  getReleaseConfig,
  isUserInRelease,
  getTrafficGroup,
  isFeatureEnabled,
  isVideoGenerationEnabled,
  isSceneGenerationEnabled,
  isKillSwitchActive,
  activateKillSwitch,
  deactivateKillSwitch,
  setTrafficPercent,
  enableFeature,
  disableFeature,
  addToAllowlist,
  removeFromAllowlist,
  addToBlocklist,
  removeFromBlocklist,
  getReleaseStatus
};