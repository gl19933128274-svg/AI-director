/**
 * Storyboard 缓存系统
 * 提供 Prompt Cache 和 Result Cache 两级缓存机制
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  /**
   * 生成缓存键
   */
  private generateKey(params: Record<string, unknown>): string {
    return JSON.stringify(params);
  }

  /**
   * 获取缓存值
   */
  get(params: Record<string, unknown>): T | null {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // 更新命中次数和时间（LRU）
    entry.hits++;
    entry.timestamp = now;
    
    // 移动到最新（模拟LRU）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(params: Record<string, unknown>, value: T): void {
    const key = this.generateKey(params);
    const now = Date.now();

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      hits: 1
    });
  }

  /**
   * 清除过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs
    };
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

// Prompt Cache: 缓存提示词生成结果，TTL 1小时
export const promptCache = new LRUCache<string>({
  maxSize: 500,
  ttlMs: 60 * 60 * 1000 // 1小时
});

// Result Cache: 缓存完整的分镜生成结果，TTL 30分钟
export const resultCache = new LRUCache<{
  shots: unknown[];
  score: unknown;
  totalDuration: number;
  shotCount: number;
}>({
  maxSize: 200,
  ttlMs: 30 * 60 * 1000 // 30分钟
});

// Product Features Cache: 缓存产品特征分析结果，TTL 2小时
export const featuresCache = new LRUCache<unknown>({
  maxSize: 300,
  ttlMs: 2 * 60 * 60 * 1000 // 2小时
});

/**
 * 定期清理过期缓存
 */
export function startCacheCleanup(): void {
  setInterval(() => {
    const promptCleaned = promptCache.cleanup();
    const resultCleaned = resultCache.cleanup();
    const featuresCleaned = featuresCache.cleanup();
    
    if (promptCleaned > 0 || resultCleaned > 0 || featuresCleaned > 0) {
      console.log(`[Cache Cleanup] Prompt: ${promptCleaned}, Result: ${resultCleaned}, Features: ${featuresCleaned}`);
    }
  }, 5 * 60 * 1000); // 每5分钟清理一次
}

/**
 * 获取所有缓存统计
 */
export function getCacheStats(): {
  prompt: ReturnType<typeof promptCache.getStats>;
  result: ReturnType<typeof resultCache.getStats>;
  features: ReturnType<typeof featuresCache.getStats>;
} {
  return {
    prompt: promptCache.getStats(),
    result: resultCache.getStats(),
    features: featuresCache.getStats()
  };
}
