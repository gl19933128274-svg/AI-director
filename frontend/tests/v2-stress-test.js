/**
 * V2.0 压力测试 - 100并发/1000请求
 * 模拟AI生成高负载场景
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// 测试配置
const CONFIG = {
  concurrency: 100,           // 并发数
  totalRequests: 1000,        // 总请求数
  timeout: 60000,             // 单次请求超时（ms）
  endpoints: [
    { path: '/api/v1/storyboard/generate', method: 'POST', weight: 0.4 },
    { path: '/api/v1/video/generate', method: 'POST', weight: 0.3 },
    { path: '/api/v1/membership/config', method: 'GET', weight: 0.15 },
    { path: '/api/v1/analytics/dashboard', method: 'GET', weight: 0.15 }
  ]
};

// 统计数据
const STATS = {
  total: 0,
  success: 0,
  failed: 0,
  timeout: 0,
  errors: {
    network: 0,
    server: 0,
    client: 0,
    unknown: 0
  },
  durations: [],
  statusCodes: {},
  startTime: null,
  endTime: null
};

// 日志函数
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) console.log('  ', JSON.stringify(data));
}

// 等待函数
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取加权随机端点
function getRandomEndpoint() {
  const rand = Math.random();
  let cumulative = 0;
  for (const endpoint of CONFIG.endpoints) {
    cumulative += endpoint.weight;
    if (rand <= cumulative) return endpoint;
  }
  return CONFIG.endpoints[0];
}

// 生成请求数据
function generateRequestData(endpoint) {
  if (endpoint.method === 'POST') {
    if (endpoint.path.includes('storyboard')) {
      return {
        prompt: `压力测试场景_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sceneConfig: {
          setting: ['城市', '森林', '海边', '山区'][Math.floor(Math.random() * 4)],
          timeOfDay: ['早晨', '中午', '傍晚', '夜晚'][Math.floor(Math.random() * 4)],
          mood: ['平静', '紧张', '欢快', '神秘'][Math.floor(Math.random() * 4)]
        },
        shotCount: Math.floor(Math.random() * 5) + 3,
        targetDuration: Math.floor(Math.random() * 30) + 15
      };
    } else if (endpoint.path.includes('video')) {
      return {
        storyboardId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        quality: ['480p', '720p', '1080p'][Math.floor(Math.random() * 3)],
        fps: [24, 30, 60][Math.floor(Math.random() * 3)]
      };
    }
  }
  return {};
}

// 发送请求
async function sendRequest(endpoint) {
  const startTime = Date.now();
  const requestData = generateRequestData(endpoint);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const response = await fetch(`${API_BASE}${endpoint.path}`, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
      body: endpoint.method === 'POST' ? JSON.stringify(requestData) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    STATS.durations.push(duration);
    
    if (response.ok) {
      STATS.success++;
      STATS.statusCodes[response.status] = (STATS.statusCodes[response.status] || 0) + 1;
      return { success: true, status: response.status, duration };
    } else {
      STATS.failed++;
      STATS.statusCodes[response.status] = (STATS.statusCodes[response.status] || 0) + 1;
      
      if (response.status >= 500) {
        STATS.errors.server++;
      } else if (response.status >= 400) {
        STATS.errors.client++;
      }
      return { success: false, status: response.status, duration, error: 'HTTP_ERROR' };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    STATS.durations.push(duration);
    STATS.failed++;
    
    if (error.name === 'AbortError') {
      STATS.timeout++;
      STATS.errors.timeout = (STATS.errors.timeout || 0) + 1;
      return { success: false, error: 'TIMEOUT', duration };
    } else {
      STATS.errors.network++;
      return { success: false, error: 'NETWORK_ERROR', duration };
    }
  }
}

// 并发控制
class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return Promise.resolve();
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      const resolve = this.queue.shift();
      resolve();
    }
  }
}

// 计算统计数据
function calculateStats() {
  const durations = [...STATS.durations].sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p90 = durations[Math.floor(durations.length * 0.9)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  
  const totalDuration = STATS.endTime - STATS.startTime;
  const rps = STATS.total / (totalDuration / 1000);
  
  return {
    total: STATS.total,
    success: STATS.success,
    failed: STATS.failed,
    timeout: STATS.timeout,
    successRate: ((STATS.success / STATS.total) * 100).toFixed(2),
    avgResponseTime: avg.toFixed(2),
    minResponseTime: Math.min(...durations),
    maxResponseTime: Math.max(...durations),
    p50,
    p90,
    p95,
    p99,
    rps: rps.toFixed(2),
    totalDuration: (totalDuration / 1000).toFixed(2),
    errors: STATS.errors,
    statusCodes: STATS.statusCodes
  };
}

// 显示进度
function showProgress(current, total) {
  const percent = ((current / total) * 100).toFixed(1);
  const barLength = 30;
  const filled = Math.floor((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total})`);
}

// 执行压力测试
async function runStressTest() {
  console.log('========================================');
  console.log('  V2.0 压力测试开始');
  console.log('========================================');
  console.log(`  并发数: ${CONFIG.concurrency}`);
  console.log(`  总请求数: ${CONFIG.totalRequests}`);
  console.log(`  API地址: ${API_BASE}`);
  console.log('========================================\n');

  STATS.startTime = Date.now();
  const limiter = new ConcurrencyLimiter(CONFIG.concurrency);
  const tasks = [];

  for (let i = 0; i < CONFIG.totalRequests; i++) {
    const endpoint = getRandomEndpoint();
    
    tasks.push(
      limiter.acquire().then(async () => {
        const result = await sendRequest(endpoint);
        limiter.release();
        
        STATS.total++;
        showProgress(STATS.total, CONFIG.totalRequests);
        
        return result;
      })
    );
  }

  await Promise.all(tasks);
  STATS.endTime = Date.now();

  console.log('\n\n========================================');
  console.log('  压力测试完成');
  console.log('========================================');

  const stats = calculateStats();
  
  console.log('\n📊 测试结果统计:');
  console.log('----------------------------------------');
  console.log(`  总请求数:     ${stats.total}`);
  console.log(`  成功:        ${stats.success} (${stats.successRate}%)`);
  console.log(`  失败:        ${stats.failed}`);
  console.log(`  超时:        ${stats.timeout}`);
  console.log(`  总耗时:      ${stats.totalDuration}s`);
  console.log(`  QPS:         ${stats.rps}/s`);

  console.log('\n⏱️ 响应时间统计:');
  console.log('----------------------------------------');
  console.log(`  平均:        ${stats.avgResponseTime}ms`);
  console.log(`  最小:        ${stats.minResponseTime}ms`);
  console.log(`  最大:        ${stats.maxResponseTime}ms`);
  console.log(`  P50:         ${stats.p50}ms`);
  console.log(`  P90:         ${stats.p90}ms`);
  console.log(`  P95:         ${stats.p95}ms`);
  console.log(`  P99:         ${stats.p99}ms`);

  console.log('\n❌ 错误分类:');
  console.log('----------------------------------------');
  console.log(`  网络错误:    ${stats.errors.network}`);
  console.log(`  服务器错误:  ${stats.errors.server}`);
  console.log(`  客户端错误:  ${stats.errors.client}`);
  console.log(`  超时:        ${stats.errors.timeout || 0}`);
  console.log(`  未知错误:    ${stats.errors.unknown}`);

  console.log('\n📋 HTTP状态码分布:');
  console.log('----------------------------------------');
  for (const [code, count] of Object.entries(stats.statusCodes)) {
    console.log(`  ${code}:        ${count}`);
  }

  console.log('\n========================================\n');

  // 判断测试结果
  const successRate = parseFloat(stats.successRate);
  const avgResponseTime = parseFloat(stats.avgResponseTime);
  
  let verdict = 'PASS';
  let message = '系统通过压力测试';
  
  if (successRate < 95) {
    verdict = 'FAIL';
    message = '成功率过低，需要优化';
  } else if (avgResponseTime > 5000) {
    verdict = 'WARNING';
    message = '响应时间较长，建议优化';
  }

  console.log(`🎯 测试判定: [${verdict}] ${message}\n`);

  return stats;
}

// 导出
module.exports = { runStressTest, CONFIG };

// 直接运行
if (require.main === module) {
  runStressTest().then(stats => {
    process.exit(stats.successRate < 95 ? 1 : 0);
  }).catch(error => {
    console.error('压力测试失败:', error);
    process.exit(1);
  });
}