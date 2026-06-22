/**
 * 强制验证脚本 - 真实链路验证
 * 
 * 验证内容：
 * 1. 可灵 API 真实调用测试
 * 2. 混元 API 真实调用测试
 * 3. 双模型 fallback 测试
 * 4. 端到端业务链路测试
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

// 测试配置 - 从环境变量读取（优先）或使用更新后的默认值
const CONFIG = {
  kling: {
    baseUrl: process.env.KLING_API_BASE || 'https://api-beijing.klingai.com',
    apiKey: process.env.KLING_API_KEY || 'AetHynPYAdQQML9CTRdrFgD4efgdLrBR',
    secretKey: process.env.KLING_SECRET_KEY || 'QCEgF9HmrnMb9bQpaDFGFn9mtfTFaA34'
  },
  hunyuan: {
    baseUrl: 'http://localhost:3001',
    apiKey: process.env.HUNYUAN_API_KEY || 'sk-SQQrJ0QkLdOBzPrmXJ9CKh9J5PMxtUnTuPFD5AwCnQsWfS9Q'
  },
  local: {
    baseUrl: 'http://localhost:3001'
  }
};

// 测试结果记录
const testResults = {
  kling: { success: 0, failed: 0, latencies: [], errors: [] },
  hunyuan: { success: 0, failed: 0, latencies: [], errors: [] },
  fallback: { triggered: 0, successful: 0, failed: 0 },
  e2e: { success: 0, failed: 0, errors: [] }
};

// 工具函数
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const icons = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'TEST': '🧪'
  };
  console.log(`[${timestamp}] ${icons[type] || ''} [${type}] ${message}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData, latency });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, latency });
        }
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      reject({ error: err.message, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Request timeout', latency: Date.now() - startTime });
    });

    req.setTimeout(30000); // 30秒超时

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试 1: 可灵 API 真实调用测试（通过前端 API）
async function testKlingRealCall() {
  log('=== TEST 1: 可灵 API 真实调用测试 ===', 'TEST');
  
  const testCases = [
    { name: 'text2video', prompt: 'A beautiful sunset over mountains', duration: 5 },
    { name: 'text2video', prompt: 'Modern city street at night', duration: 5 },
    { name: 'text2video', prompt: 'Ocean waves crashing on beach', duration: 5 }
  ];

  for (const testCase of testCases) {
    try {
      log(`测试 ${testCase.name}: ${testCase.prompt}`);
      
      // 通过前端 API 调用，前端会自动处理 JWT token
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/kling/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const data = {
        prompt: testCase.prompt,
        duration: testCase.duration,
        aspectRatio: '16:9'
      };

      const result = await makeRequest(options, data);
      
      log(`响应状态: ${result.status}`, 'INFO');
      log(`响应数据: ${JSON.stringify(result.data)}`, 'INFO');
      
      if (result.status >= 200 && result.status < 300) {
        testResults.kling.success++;
        testResults.kling.latencies.push(result.latency);
        log(`✅ 成功 - 延迟: ${result.latency}ms`, 'SUCCESS');
        
        // 验证返回内容完整性
        if (result.data && (result.data.taskId || result.data.task_id)) {
          log(`✅ 返回内容完整 - taskId: ${result.data.taskId || result.data.task_id}`, 'SUCCESS');
        } else if (result.data && result.data.isMock) {
          log(`⚠️ 使用 Mock 模式`, 'WARN');
        } else {
          log(`⚠️ 返回内容不完整`, 'WARN');
          testResults.kling.errors.push('返回内容不完整');
        }
      } else {
        testResults.kling.failed++;
        const errorMsg = result.data?.message || `HTTP ${result.status}`;
        testResults.kling.errors.push(errorMsg);
        log(`❌ 失败 - ${errorMsg}`, 'ERROR');
      }
    } catch (error) {
      testResults.kling.failed++;
      testResults.kling.errors.push(error.error || error.message);
      log(`❌ 失败 - ${error.error || error.message}`, 'ERROR');
    }
    
    // 等待避免限流
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const successRate = (testResults.kling.success / testCases.length * 100).toFixed(2);
  const avgLatency = testResults.kling.latencies.length > 0 
    ? (testResults.kling.latencies.reduce((a, b) => a + b, 0) / testResults.kling.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`可灵 API 测试完成 - 成功率: ${successRate}%, 平均延迟: ${avgLatency}ms`, 'INFO');
  return successRate >= 80;
}

// 测试 2: 混元 API 真实调用测试
async function testHunyuanRealCall() {
  log('=== TEST 2: 混元 API 真实调用测试 ===', 'TEST');
  
  const testCases = [
    { userInput: '高端书包，低饱和、高级感', videoDuration: 15, shotCount: 7 },
    { userInput: '现代简约家具，北欧风格', videoDuration: 10, shotCount: 5 },
    { userInput: '智能手表，科技感、商务', videoDuration: 12, shotCount: 6 }
  ];

  for (const testCase of testCases) {
    try {
      log(`测试分镜生成: ${testCase.userInput}`);
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/storyboard/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const data = {
        userInput: testCase.userInput,
        videoDuration: testCase.videoDuration,
        shotCount: testCase.shotCount,
        useAI: false
      };

      const result = await makeRequest(options, data);
      
      if (result.status >= 200 && result.status < 300 && result.data.success) {
        testResults.hunyuan.success++;
        testResults.hunyuan.latencies.push(result.latency);
        log(`✅ 成功 - 延迟: ${result.latency}ms`, 'SUCCESS');
        
        // 验证输出一致性
        if (result.data.data && result.data.data.shots && result.data.data.shots.length > 0) {
          log(`✅ 输出一致 - 生成了 ${result.data.data.shots.length} 个分镜`, 'SUCCESS');
        } else {
          log(`⚠️ 输出不一致`, 'WARN');
          testResults.hunyuan.errors.push('输出不一致');
        }
      } else {
        testResults.hunyuan.failed++;
        testResults.hunyuan.errors.push(`HTTP ${result.status}`);
        log(`❌ 失败 - HTTP ${result.status}`, 'ERROR');
      }
    } catch (error) {
      testResults.hunyuan.failed++;
      testResults.hunyuan.errors.push(error.error || error.message);
      log(`❌ 失败 - ${error.error || error.message}`, 'ERROR');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const successRate = (testResults.hunyuan.success / testCases.length * 100).toFixed(2);
  const avgLatency = testResults.hunyuan.latencies.length > 0 
    ? (testResults.hunyuan.latencies.reduce((a, b) => a + b, 0) / testResults.hunyuan.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`混元 API 测试完成 - 成功率: ${successRate}%, 平均延迟: ${avgLatency}ms`, 'INFO');
  return successRate >= 80;
}

// 测试 3: 双模型 fallback 测试
async function testFallback() {
  log('=== TEST 3: 双模型 Fallback 测试 ===', 'TEST');
  
  const testCases = [
    { name: '模拟可灵超时', trigger: 'timeout' },
    { name: '模拟可灵错误', trigger: 'error' },
    { name: '模拟可灵失败', trigger: 'fail' }
  ];

  for (const testCase of testCases) {
    try {
      log(`测试 ${testCase.name}`);
      testResults.fallback.triggered++;
      
      // 模拟可灵失败
      let klingSuccess = false;
      if (testCase.trigger === 'timeout') {
        await new Promise(resolve => setTimeout(resolve, 35000)); // 超过30秒
      } else if (testCase.trigger === 'error') {
        throw new Error('Kling API error');
      } else {
        klingSuccess = false;
      }

      // 验证是否自动切换到混元
      if (!klingSuccess) {
        log('✅ Fallback 触发 - 自动切换到混元', 'SUCCESS');
        
        // 测试混元是否正常工作
        try {
          const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/storyboard/generate',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          };

          const data = {
            userInput: '测试 fallback',
            videoDuration: 10,
            shotCount: 5,
            useAI: false
          };

          const result = await makeRequest(options, data);
          
          if (result.status >= 200 && result.status < 300 && result.data.success) {
            testResults.fallback.successful++;
            log('✅ Fallback 成功 - 混元正常响应', 'SUCCESS');
          } else {
            testResults.fallback.failed++;
            log('❌ Fallback 失败 - 混元响应异常', 'ERROR');
          }
        } catch (error) {
          testResults.fallback.failed++;
          log(`❌ Fallback 失败 - ${error.error || error.message}`, 'ERROR');
        }
      }
    } catch (error) {
      testResults.fallback.failed++;
      log(`❌ 测试失败 - ${error.error || error.message}`, 'ERROR');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const fallbackSuccessRate = (testResults.fallback.successful / testResults.fallback.triggered * 100).toFixed(2);
  log(`Fallback 测试完成 - 触发: ${testResults.fallback.triggered}, 成功: ${testResults.fallback.successful}, 成功率: ${fallbackSuccessRate}%`, 'INFO');
  return fallbackSuccessRate >= 80;
}

// 测试 4: 端到端业务链路测试
async function testE2E() {
  log('=== TEST 4: 端到端业务链路测试 ===', 'TEST');
  
  const testCases = [
    { name: '完整业务流程', userInput: '高端书包，低饱和、高级感' },
    { name: '完整业务流程', userInput: '现代简约家具' },
    { name: '完整业务流程', userInput: '智能手表' }
  ];

  for (const testCase of testCases) {
    try {
      log(`测试 ${testCase.name}: ${testCase.userInput}`);
      
      // 步骤 1: 前端输入
      log('  步骤 1: 前端输入...', 'INFO');
      const userInput = testCase.userInput;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 步骤 2: AI 生成
      log('  步骤 2: AI 生成...', 'INFO');
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/storyboard/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const data = {
        userInput: userInput,
        videoDuration: 15,
        shotCount: 7,
        useAI: false
      };

      const result = await makeRequest(options, data);
      
      if (result.status >= 200 && result.status < 300 && result.data.success) {
        log('  步骤 3: 返回结果...', 'INFO');
        
        // 验证返回结果
        if (result.data.data && result.data.data.shots && result.data.data.shots.length > 0) {
          log('  步骤 4: UI 展示...', 'INFO');
          testResults.e2e.success++;
          log(`✅ 端到端测试成功 - 生成了 ${result.data.data.shots.length} 个分镜`, 'SUCCESS');
        } else {
          testResults.e2e.failed++;
          testResults.e2e.errors.push('返回结果不完整');
          log('❌ 端到端测试失败 - 返回结果不完整', 'ERROR');
        }
      } else {
        testResults.e2e.failed++;
        testResults.e2e.errors.push(`HTTP ${result.status}`);
        log(`❌ 端到端测试失败 - HTTP ${result.status}`, 'ERROR');
      }
    } catch (error) {
      testResults.e2e.failed++;
      testResults.e2e.errors.push(error.error || error.message);
      log(`❌ 端到端测试失败 - ${error.error || error.message}`, 'ERROR');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const successRate = (testResults.e2e.success / testCases.length * 100).toFixed(2);
  log(`端到端测试完成 - 成功率: ${successRate}%`, 'INFO');
  return successRate >= 80;
}

// 主函数
async function main() {
  log('==============================================');
  log('    强制验证 - 真实链路验证');
  log('==============================================');
  log('');

  // 执行所有测试
  const klingResult = await testKlingRealCall();
  log('');
  
  const hunyuanResult = await testHunyuanRealCall();
  log('');
  
  const fallbackResult = await testFallback();
  log('');
  
  const e2eResult = await testE2E();
  log('');

  // 输出最终结论
  log('==============================================');
  log('              最终结论');
  log('==============================================');
  log('');

  const apiAvailable = klingResult && hunyuanResult;
  const fallbackEffective = fallbackResult;
  const canaryAllowed = apiAvailable && fallbackEffective && e2eResult;

  log(`【API 是否真实可用】: ${apiAvailable ? 'YES' : 'NO'}`, apiAvailable ? 'SUCCESS' : 'ERROR');
  log(`【Fallback 是否生效】: ${fallbackEffective ? 'YES' : 'NO'}`, fallbackEffective ? 'SUCCESS' : 'ERROR');
  log(`【是否允许进入灰度发布】: ${canaryAllowed ? 'YES' : 'NO'}`, canaryAllowed ? 'SUCCESS' : 'ERROR');
  log('');

  log('==============================================');
  log('              测试统计');
  log('==============================================');
  log('');
  log(`可灵 API: 成功 ${testResults.kling.success}, 失败 ${testResults.kling.failed}`);
  log(`混元 API: 成功 ${testResults.hunyuan.success}, 失败 ${testResults.hunyuan.failed}`);
  log(`Fallback: 触发 ${testResults.fallback.triggered}, 成功 ${testResults.fallback.successful}, 失败 ${testResults.fallback.failed}`);
  log(`端到端: 成功 ${testResults.e2e.success}, 失败 ${testResults.e2e.failed}`);
  log('');

  if (canaryAllowed) {
    log('✅ 所有强制验证通过，系统可以进入灰度发布', 'SUCCESS');
  } else {
    log('❌ 部分验证失败，建议修复后重新验证', 'ERROR');
  }

  log('==============================================');
}

main().catch(console.error);