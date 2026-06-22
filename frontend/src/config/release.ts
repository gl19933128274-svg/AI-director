export interface ReleaseConfig {
  enabled: boolean;
  trafficPercent: number;
  apiRateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  featureFlags: {
    videoGeneration: boolean;
    storyboardGeneration: boolean;
    imageToVideo: boolean;
  };
  fallback: {
    enabled: boolean;
    mockOnFailure: boolean;
  };
  errorMonitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

const DEFAULT_CONFIG: ReleaseConfig = {
  enabled: true,
  trafficPercent: 10,
  apiRateLimit: {
    requestsPerMinute: 30,
    requestsPerHour: 100,
  },
  featureFlags: {
    videoGeneration: true,
    storyboardGeneration: true,
    imageToVideo: true,
  },
  fallback: {
    enabled: true,
    mockOnFailure: true,
  },
  errorMonitoring: {
    enabled: true,
    logLevel: 'info',
  },
};

let config: ReleaseConfig = { ...DEFAULT_CONFIG };

export function initReleaseConfig(customConfig?: Partial<ReleaseConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

export function isUserInGrayRelease(userId: string): boolean {
  if (!config.enabled) {
    return true;
  }
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < config.trafficPercent;
}

export function isFeatureEnabled(feature: keyof ReleaseConfig['featureFlags']): boolean {
  return config.featureFlags[feature] && config.enabled;
}

export function getRateLimit(): ReleaseConfig['apiRateLimit'] {
  return config.apiRateLimit;
}

export function shouldFallback(): boolean {
  return config.fallback.enabled;
}

export function shouldUseMockOnFailure(): boolean {
  return config.fallback.mockOnFailure;
}

export function isErrorMonitoringEnabled(): boolean {
  return config.errorMonitoring.enabled;
}

export function getLogLevel(): ReleaseConfig['errorMonitoring']['logLevel'] {
  return config.errorMonitoring.logLevel;
}

export const releaseConfig = {
  enabled: () => config.enabled,
  trafficPercent: () => config.trafficPercent,
  isUserInGrayRelease,
  isFeatureEnabled,
  getRateLimit,
  shouldFallback,
  shouldUseMockOnFailure,
  isErrorMonitoringEnabled,
  getLogLevel,
  initReleaseConfig,
};

export default releaseConfig;