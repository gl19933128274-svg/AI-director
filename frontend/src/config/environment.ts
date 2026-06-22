/**
 * 环境模式配置 - 版本冻结 + 上线准备
 * 
 * 功能：
 * 1. DEV/PROD 模式切换
 * 2. DEV 模式强制使用 mock，禁止调用真实 API
 * 3. 成本控制
 */

export enum EnvironmentMode {
  DEV = 'dev',
  PROD = 'prod',
  TEST = 'test'
}

export interface EnvironmentConfig {
  mode: EnvironmentMode;
  useMock: boolean;
  allowRealAI: boolean;
  enableRateLimit: boolean;
  rateLimitPerMinute: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}

const DEV_CONFIG: EnvironmentConfig = {
  mode: EnvironmentMode.DEV,
  useMock: true,
  allowRealAI: false,
  enableRateLimit: true,
  rateLimitPerMinute: 3,
  enableLogging: true,
  enableMetrics: false
};

const PROD_CONFIG: EnvironmentConfig = {
  mode: EnvironmentMode.PROD,
  useMock: false,
  allowRealAI: true,
  enableRateLimit: true,
  rateLimitPerMinute: 3,
  enableLogging: true,
  enableMetrics: true
};

const TEST_CONFIG: EnvironmentConfig = {
  mode: EnvironmentMode.TEST,
  useMock: true,
  allowRealAI: false,
  enableRateLimit: false,
  rateLimitPerMinute: 10,
  enableLogging: true,
  enableMetrics: false
};

let currentConfig: EnvironmentConfig = DEV_CONFIG;

/**
 * 初始化环境配置
 */
export function initEnvironment(mode?: EnvironmentMode): void {
  const envMode = mode || (process.env.NODE_ENV === 'production' ? EnvironmentMode.PROD : EnvironmentMode.DEV);
  
  switch (envMode) {
    case EnvironmentMode.PROD:
      currentConfig = PROD_CONFIG;
      break;
    case EnvironmentMode.TEST:
      currentConfig = TEST_CONFIG;
      break;
    case EnvironmentMode.DEV:
    default:
      currentConfig = DEV_CONFIG;
      break;
  }
  
  console.log(`[Environment] Mode initialized: ${currentConfig.mode}`);
  console.log(`[Environment] Use Mock: ${currentConfig.useMock}`);
  console.log(`[Environment] Allow Real AI: ${currentConfig.allowRealAI}`);
}

/**
 * 获取当前环境配置
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return currentConfig;
}

/**
 * 检查是否允许调用真实 AI
 */
export function shouldUseRealAI(): boolean {
  return currentConfig.allowRealAI && process.env.USE_REAL_AI === 'true';
}

/**
 * 检查是否使用 mock
 */
export function shouldUseMock(): boolean {
  return currentConfig.useMock;
}

/**
 * 检查是否启用限流
 */
export function isRateLimitEnabled(): boolean {
  return currentConfig.enableRateLimit;
}

/**
 * 获取限流阈值
 */
export function getRateLimitPerMinute(): number {
  return currentConfig.rateLimitPerMinute;
}

/**
 * 检查是否启用日志
 */
export function isLoggingEnabled(): boolean {
  return currentConfig.enableLogging;
}

/**
 * 检查是否启用指标
 */
export function isMetricsEnabled(): boolean {
  return currentConfig.enableMetrics;
}

/**
 * 获取当前环境模式
 */
export function getCurrentMode(): EnvironmentMode {
  return currentConfig.mode;
}

/**
 * 是否为生产环境
 */
export function isProduction(): boolean {
  return currentConfig.mode === EnvironmentMode.PROD;
}

/**
 * 是否为开发环境
 */
export function isDevelopment(): boolean {
  return currentConfig.mode === EnvironmentMode.DEV;
}

/**
 * 是否为测试环境
 */
export function isTest(): boolean {
  return currentConfig.mode === EnvironmentMode.TEST;
}

// 自动初始化
initEnvironment();

export default {
  initEnvironment,
  getEnvironmentConfig,
  shouldUseRealAI,
  shouldUseMock,
  isRateLimitEnabled,
  getRateLimitPerMinute,
  isLoggingEnabled,
  isMetricsEnabled,
  getCurrentMode,
  isProduction,
  isDevelopment,
  isTest
};