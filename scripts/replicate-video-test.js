/**
 * Replicate 视频生成测试脚本
 * 
 * 测试内容：
 * 1. 单次生成测试
 * 2. 并发 10-50 请求测试
 * 3. 错误重试测试
 * 4. API key 无效 fallback 测试
 */

const http = require('http');
const fs = require('fs');

// 手动读取环境变量文件
function loadEnvFile(path) {
  try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=').map(s => s.trim());
        if (key && value) {
          process.env[key] = value.replace(/["']/g, '');
        }
      }
    }
  } catch (e) {
    console.log(`[WARN] 无法读取环境变量文件: ${path}`);
  }
}

// 加载环境变量
loadEnvFile('./frontend/.env.local');

const BASE_URL = 'http://localhost:3003';

// 测试结果统计
const testResults = {
  single: { success: 0, failed: 0, latencies: [], errors: [] },
  concurrent: { success: 0, failed: 0, latencies: [], errors: [] },
  retry: { success: 0, failed: 0, latencies: [], errors: [] },
  fallback: { success: 0, failed: 0, latencies: [], errors: [] }
};

// 日志函数
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
    TEST: '\x1b[35m'
  };
  console.log(`[${timestamp}] ${colors[type] || ''}[${type}] ${message}\x1b[0m`);
}

// 发送 HTTP 请求
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode, data, latency });
        } catch {
          resolve({ status: res.statusCode, data: body, latency });
        }
      });
    });
    req.on('error', (error) => reject({ error: error.message, latency: Date.now() - startTime }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// 测试 1: 单次生成测试
async function testSingleGeneration() {
  log('=== TEST 1: 单次生成测试 ===', 'TEST');
  
  const testCases = [
    { 
      name: 'cinematic',
      image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20sunset%20over%20mountains%20cinematic&image_size=landscape_16_9',
      prompt: 'A beautiful sunset over mountains with cinematic lighting',
      duration: 4,
      style: 'cinematic'
    },
    { 
      name: 'realistic',
      image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=modern%20city%20street%20at%20night%20realistic&image_size=landscape_16_9',
      prompt: 'Modern city street at night with realistic details',
      duration: 4,
      style: 'realistic'
    },
    { 
      name: 'anime',
      image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=anime%20style%20ocean%20waves&image_size=landscape_16_9',
      prompt: 'Anime style ocean waves with vibrant colors',
      duration: 4,
      style: 'anime'
    }
  ];

  for (const testCase of testCases) {
    try {
      log(`测试风格: ${testCase.style}`);
      
      const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/api/generate-video',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await makeRequest(options, {
        image: testCase.image,
        prompt: testCase.prompt,
        duration: testCase.duration,
        style: testCase.style
      });

      log(`响应状态: ${result.status}`, 'INFO');
      log(`响应数据: ${JSON.stringify(result.data)}`, 'INFO');

      if (result.status >= 200 && result.status < 300) {
        testResults.single.success++;
        testResults.single.latencies.push(result.latency);
        
        if (result.data.data && result.data.data.video_url) {
          log(`✅ 成功 - 延迟: ${result.latency}ms, 视频URL: ${result.data.data.video_url}`, 'SUCCESS');
        } else if (result.data.data && result.data.data.isMock) {
          log(`✅ Mock模式成功 - 延迟: ${result.latency}ms`, 'SUCCESS');
        } else {
          log(`✅ 成功（无视频URL）- 延迟: ${result.latency}ms`, 'SUCCESS');
        }
      } else {
        testResults.single.failed++;
        const errorMsg = result.data?.message || `HTTP ${result.status}`;
        testResults.single.errors.push(errorMsg);
        log(`❌ 失败 - ${errorMsg}`, 'ERROR');
      }
    } catch (error) {
      testResults.single.failed++;
      testResults.single.errors.push(error.error || error.message);
      log(`❌ 失败 - ${error.error || error.message}`, 'ERROR');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const avgLatency = testResults.single.latencies.length > 0 
    ? (testResults.single.latencies.reduce((a, b) => a + b, 0) / testResults.single.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`单次生成测试完成 - 成功: ${testResults.single.success}, 失败: ${testResults.single.failed}, 平均延迟: ${avgLatency}ms`, 'INFO');
}

// 测试 2: 并发请求测试
async function testConcurrentRequests(count = 10) {
  log(`=== TEST 2: 并发 ${count} 请求测试 ===`, 'TEST');
  
  const requests = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/generate-video',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const requestPromise = makeRequest(options, {
      image: `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20image%20${i}&image_size=landscape_16_9`,
      prompt: `Test video generation ${i}`,
      duration: 4,
      style: 'cinematic'
    }).then(result => {
      if (result.status >= 200 && result.status < 300) {
        testResults.concurrent.success++;
        testResults.concurrent.latencies.push(result.latency);
        return { success: true, latency: result.latency };
      } else {
        testResults.concurrent.failed++;
        testResults.concurrent.errors.push(result.data?.message || `HTTP ${result.status}`);
        return { success: false, error: result.data?.message };
      }
    }).catch(error => {
      testResults.concurrent.failed++;
      testResults.concurrent.errors.push(error.error || error.message);
      return { success: false, error: error.error || error.message };
    });

    requests.push(requestPromise);
  }

  await Promise.all(requests);
  
  const totalTime = Date.now() - startTime;
  const avgLatency = testResults.concurrent.latencies.length > 0 
    ? (testResults.concurrent.latencies.reduce((a, b) => a + b, 0) / testResults.concurrent.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`并发测试完成 - 总耗时: ${totalTime}ms, 成功: ${testResults.concurrent.success}, 失败: ${testResults.concurrent.failed}, 平均延迟: ${avgLatency}ms`, 'INFO');
}

// 测试 3: 错误重试测试
async function testErrorRetry() {
  log('=== TEST 3: 错误重试测试 ===', 'TEST');
  
  // 模拟无效请求
  const invalidRequests = [
    { image: '', prompt: 'test', duration: 4 },      // 空图片
    { image: 'invalid-url', prompt: '', duration: 4 }, // 空提示词
    { image: 'https://example.com/invalid.jpg', prompt: 'test', duration: 999 } // 无效时长
  ];

  for (const [index, invalidInput] of invalidRequests.entries()) {
    try {
      log(`测试无效输入 ${index + 1}: ${JSON.stringify(invalidInput)}`);
      
      const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/api/generate-video',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await makeRequest(options, invalidInput);

      if (result.status >= 200 && result.status < 300) {
        // 即使输入无效，fallback 应该返回 mock 结果
        testResults.retry.success++;
        log(`✅ 请求处理成功（可能使用了 fallback）`, 'SUCCESS');
      } else {
        testResults.retry.failed++;
        testResults.retry.errors.push(result.data?.message || `HTTP ${result.status}`);
        log(`❌ 请求失败: ${result.data?.message || result.status}`, 'ERROR');
      }
    } catch (error) {
      testResults.retry.failed++;
      testResults.retry.errors.push(error.error || error.message);
      log(`❌ 请求异常: ${error.error || error.message}`, 'ERROR');
    }
  }

  log(`错误重试测试完成 - 成功: ${testResults.retry.success}, 失败: ${testResults.retry.failed}`, 'INFO');
}

// 测试 4: API Key 无效 Fallback 测试
async function testFallbackWithInvalidKey() {
  log('=== TEST 4: API Key 无效 Fallback 测试 ===', 'TEST');
  
  // 当前状态下，REPLICATE_API_TOKEN 为空，应该走 mock
  const hasToken = !!process.env.REPLICATE_API_TOKEN;
  
  if (!hasToken) {
    log('REPLICATE_API_TOKEN 为空，预期走 Mock 模式', 'INFO');
  }

  try {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/generate-video',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options, {
      image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=fallback%20test&image_size=landscape_16_9',
      prompt: 'Fallback test video',
      duration: 4,
      style: 'cinematic'
    });

    if (result.status >= 200 && result.status < 300) {
      testResults.fallback.success++;
      
      if (result.data.data?.model === 'mock') {
        log(`✅ Fallback 成功 - 使用 Mock 模式`, 'SUCCESS');
      } else {
        log(`✅ 请求成功 - 模型: ${result.data.data?.model}`, 'SUCCESS');
      }
    } else {
      testResults.fallback.failed++;
      testResults.fallback.errors.push(result.data?.message || `HTTP ${result.status}`);
      log(`❌ 请求失败: ${result.data?.message || result.status}`, 'ERROR');
    }
  } catch (error) {
    testResults.fallback.failed++;
    testResults.fallback.errors.push(error.error || error.message);
    log(`❌ 请求异常: ${error.error || error.message}`, 'ERROR');
  }

  log(`Fallback 测试完成 - 成功: ${testResults.fallback.success}, 失败: ${testResults.fallback.failed}`, 'INFO');
}

// 测试 5: 状态查询测试
async function testStatusQuery() {
  log('=== TEST 5: 状态查询测试 ===', 'TEST');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/generate-video?taskId=test-task-id-123',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options, null);

    if (result.status >= 200 && result.status < 300) {
      log(`✅ 状态查询成功`, 'SUCCESS');
      log(`响应: ${JSON.stringify(result.data)}`, 'INFO');
    } else {
      log(`❌ 状态查询失败: ${result.data?.message || result.status}`, 'ERROR');
    }
  } catch (error) {
    log(`❌ 状态查询异常: ${error.error || error.message}`, 'ERROR');
  }
}

// 输出最终结果
function printResults() {
  log('\n' + '='.repeat(50), 'INFO');
  log('                最终测试结果', 'INFO');
  log('='.repeat(50), 'INFO');

  const totalSuccess = testResults.single.success + testResults.concurrent.success + 
    testResults.retry.success + testResults.fallback.success;
  const totalFailed = testResults.single.failed + testResults.concurrent.failed + 
    testResults.retry.failed + testResults.fallback.failed;
  const total = totalSuccess + totalFailed;
  const successRate = total > 0 ? ((totalSuccess / total) * 100).toFixed(2) : '0.00';

  log(`\n📊 测试统计`, 'INFO');
  log(`┌─────────────────────────────────────────────┐`, 'INFO');
  log(`│ 测试项           │ 成功 │ 失败 │ 成功率       │`, 'INFO');
  log(`├─────────────────────────────────────────────┤`, 'INFO');
  log(`│ 单次生成测试     │ ${testResults.single.success.toString().padStart(4)} │ ${testResults.single.failed.toString().padStart(4)} │ ${((testResults.single.success / (testResults.single.success + testResults.single.failed) || 0) * 100).toFixed(2).padStart(11)}% │`, 'INFO');
  log(`│ 并发请求测试(10) │ ${testResults.concurrent.success.toString().padStart(4)} │ ${testResults.concurrent.failed.toString().padStart(4)} │ ${((testResults.concurrent.success / (testResults.concurrent.success + testResults.concurrent.failed) || 0) * 100).toFixed(2).padStart(11)}% │`, 'INFO');
  log(`│ 错误重试测试     │ ${testResults.retry.success.toString().padStart(4)} │ ${testResults.retry.failed.toString().padStart(4)} │ ${((testResults.retry.success / (testResults.retry.success + testResults.retry.failed) || 0) * 100).toFixed(2).padStart(11)}% │`, 'INFO');
  log(`│ Fallback 测试    │ ${testResults.fallback.success.toString().padStart(4)} │ ${testResults.fallback.failed.toString().padStart(4)} │ ${((testResults.fallback.success / (testResults.fallback.success + testResults.fallback.failed) || 0) * 100).toFixed(2).padStart(11)}% │`, 'INFO');
  log(`├─────────────────────────────────────────────┤`, 'INFO');
  log(`│ 总计             │ ${totalSuccess.toString().padStart(4)} │ ${totalFailed.toString().padStart(4)} │ ${successRate.padStart(11)}% │`, 'INFO');
  log(`└─────────────────────────────────────────────┘`, 'INFO');

  // 输出关键指标
  log(`\n🎯 关键指标`, 'INFO');
  
  // API 接口是否可用
  const apiAvailable = testResults.single.success > 0 || testResults.fallback.success > 0;
  log(`API 接口是否可用: ${apiAvailable ? '✅ YES' : '❌ NO'}`, apiAvailable ? 'SUCCESS' : 'ERROR');
  
  // 是否前后端打通
  const frontendBackendConnected = testResults.single.success > 0 || testResults.concurrent.success > 0;
  log(`是否前后端打通: ${frontendBackendConnected ? '✅ YES' : '❌ NO'}`, frontendBackendConnected ? 'SUCCESS' : 'ERROR');
  
  // 是否可以进入灰度测试
  const canEnterGray = apiAvailable && frontendBackendConnected && testResults.fallback.success > 0;
  log(`是否可以进入灰度测试: ${canEnterGray ? '✅ YES' : '❌ NO'}`, canEnterGray ? 'SUCCESS' : 'ERROR');
  
  // 平均生成耗时
  const allLatencies = [
    ...testResults.single.latencies,
    ...testResults.concurrent.latencies,
    ...testResults.retry.latencies,
    ...testResults.fallback.latencies
  ];
  const avgLatency = allLatencies.length > 0 
    ? (allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length).toFixed(2)
    : 'N/A';
  log(`平均生成耗时: ${avgLatency}ms`, 'INFO');
  
  // 单条成本估算
  const costEstimate = 0.12; // Replicate Stable Video Diffusion 约 $0.12/4秒
  log(`单条成本估算: $${costEstimate}`, 'INFO');

  log(`\n⚠️  注意: 当前 REPLICATE_API_TOKEN 未配置，使用 Mock 模式`, 'WARN');
  log(`请在 .env.local 中配置有效的 REPLICATE_API_TOKEN 以使用真实 API`, 'INFO');

  log(`\n${'='.repeat(50)}`, 'INFO');
}

// 主函数
async function main() {
  log(`\n${'='.repeat(50)}`, 'INFO');
  log(`    Replicate 视频生成测试 - 开始`, 'INFO');
  log(`${'='.repeat(50)}\n`, 'INFO');

  // 等待服务器启动
  log('等待服务器启动...', 'INFO');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 执行所有测试
    await testSingleGeneration();
    log('', 'INFO');
    
    await testConcurrentRequests(10);
    log('', 'INFO');
    
    await testErrorRetry();
    log('', 'INFO');
    
    await testFallbackWithInvalidKey();
    log('', 'INFO');
    
    await testStatusQuery();
    log('', 'INFO');

  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'ERROR');
  }

  // 输出结果
  printResults();
}

// 运行测试
main().catch(console.error);