/**
 * API 限流中间件 - 版本冻结 + 上线准备
 * 
 * 功能：
 * 1. 单用户每分钟最多3次生成
 * 2. 防止重复点击触发多次API调用
 * 3. 任务去重机制
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitPerMinute, isRateLimitEnabled } from '@/config/environment';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface TaskDeduplicationEntry {
  timestamp: number;
  status: string;
}

// 内存存储（生产环境应使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();
const taskDeduplicationStore = new Map<string, TaskDeduplicationEntry>();

/**
 * 清理过期的限流记录
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // 清理超过5分钟的任务去重记录
  for (const [key, entry] of taskDeduplicationStore.entries()) {
    if (now - entry.timestamp > 5 * 60 * 1000) {
      taskDeduplicationStore.delete(key);
    }
  }
}

/**
 * 获取用户标识
 */
function getUserIdentifier(request: NextRequest): string {
  // 优先从 Authorization header 获取 userId
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // 简单的 token 解析（生产环境应使用 JWT 验证）
      const parts = token.split('-');
      if (parts.length >= 2) {
        return parts[1];
      }
    } catch {
      // 解析失败，使用 IP
    }
  }
  
  // 降级到 IP 地址
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return ip;
}

/**
 * 生成任务去重的 key
 */
function generateTaskDeduplicationKey(userId: string, prompt: string, image?: string): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const normalizedImage = image ? image.trim().toLowerCase() : '';
  return `${userId}:${normalizedPrompt}:${normalizedImage}`;
}

/**
 * 检查限流
 */
export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  if (!isRateLimitEnabled()) {
    return { allowed: true, remaining: Infinity, resetTime: 0 };
  }
  
  cleanupExpiredEntries();
  
  const now = Date.now();
  const maxRequests = getRateLimitPerMinute();
  const windowMs = 60 * 1000; // 1分钟
  
  let entry = rateLimitStore.get(userId);
  
  if (!entry || now > entry.resetTime) {
    // 创建新的限流窗口
    entry = {
      count: 0,
      resetTime: now + windowMs
    };
    rateLimitStore.set(userId, entry);
  }
  
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  entry.count++;
  rateLimitStore.set(userId, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * 检查任务去重
 */
export function checkTaskDeduplication(userId: string, prompt: string, image?: string): { 
  duplicate: boolean; 
  existingStatus?: string; 
  existingTimestamp?: number 
} {
  const key = generateTaskDeduplicationKey(userId, prompt, image);
  const entry = taskDeduplicationStore.get(key);
  
  if (!entry) {
    return { duplicate: false };
  }
  
  // 检查是否在30秒内重复提交
  const now = Date.now();
  if (now - entry.timestamp < 30 * 1000) {
    return {
      duplicate: true,
      existingStatus: entry.status,
      existingTimestamp: entry.timestamp
    };
  }
  
  return { duplicate: false };
}

/**
 * 记录任务去重
 */
export function recordTaskDeduplication(userId: string, prompt: string, status: string, image?: string): void {
  const key = generateTaskDeduplicationKey(userId, prompt, image);
  taskDeduplicationStore.set(key, {
    timestamp: Date.now(),
    status
  });
}

/**
 * 限流中间件
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const userId = getUserIdentifier(request);
  const result = checkRateLimit(userId);
  
  if (!result.allowed) {
    const resetTime = new Date(result.resetTime);
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return NextResponse.json({
      success: false,
      code: 429,
      message: '请求过于频繁，请稍后再试',
      error: {
        type: 'RateLimitExceeded',
        detail: `每分钟最多调用 ${getRateLimitPerMinute()} 次视频生成接口`
      },
      meta: {
        timestamp: Date.now(),
        retry_after: retryAfter,
        reset_time: resetTime.toISOString()
      }
    }, {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': getRateLimitPerMinute().toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString()
      }
    });
  }
  
  return null;
}

/**
 * 任务去重中间件
 */
export function taskDeduplicationMiddleware(request: NextRequest, body: any): NextResponse | null {
  const userId = getUserIdentifier(request);
  const prompt = body.prompt || '';
  const image = body.image || '';
  
  const result = checkTaskDeduplication(userId, prompt, image);
  
  if (result.duplicate) {
    return NextResponse.json({
      success: false,
      code: 409,
      message: '检测到重复提交',
      error: {
        type: 'DuplicateRequest',
        detail: '相同的任务正在处理中，请勿重复提交'
      },
      meta: {
        timestamp: Date.now(),
        existing_status: result.existingStatus,
        existing_timestamp: result.existingTimestamp
      }
    }, {
      status: 409
    });
  }
  
  return null;
}

/**
 * 获取限流统计信息
 */
export function getRateLimitStats(userId: string): {
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const entry = rateLimitStore.get(userId);
  const limit = getRateLimitPerMinute();
  
  if (!entry || Date.now() > entry.resetTime) {
    return {
      current: 0,
      limit,
      remaining: limit,
      resetTime: Date.now() + 60 * 1000
    };
  }
  
  return {
    current: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime
  };
}

export default {
  checkRateLimit,
  checkTaskDeduplication,
  recordTaskDeduplication,
  rateLimitMiddleware,
  taskDeduplicationMiddleware,
  getRateLimitStats
};