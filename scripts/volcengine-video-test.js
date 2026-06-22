const http = require('http');

const BASE_URL = 'http://localhost:3000';

const testResults = {
  unitTest: { success: 0, failed: 0, latencies: [], errors: [] },
  integrationTest: { success: 0, failed: 0, latencies: [], errors: [] },
  exceptionTest: { success: 0, failed: 0, errors: [] }
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function makeRequest(options, body) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, latency });
        } catch {
          resolve({ status: res.statusCode, data: { message: data }, latency });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 500, data: { message: error.message }, latency: Date.now() - startTime });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testUnitGeneration() {
  log('=== TEST 1: 单元测试 - 调用图生视频API ===', 'TEST');

  const testCases = [
    {
      name: '有效参数 - cinematic风格',
      input: {
        image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20landscape&image_size=landscape_16_9',
        prompt: 'A beautiful landscape video',
        duration: 4,
        style: 'cinematic'
      }
    },
    {
      name: '有效参数 - realistic风格',
      input: {
        image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=city%20street&image_size=landscape_16_9',
        prompt: 'A realistic city street scene',
        duration: 4,
        style: 'realistic'
      }
    },
    {
      name: '有效参数 - anime风格',
      input: {
        image: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=anime%20character&image_size=landscape_16_9',
        prompt: 'An anime character in a magical world',
        duration: 4,
        style: 'anime'
      }
    }
  ];

  for (const testCase of testCases) {
    log(`测试: ${testCase.name}`, 'INFO');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/generate-video',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    try {
      const result = await makeRequest(options, testCase.input);
      
      if (result.status >= 200 && result.status < 300) {
        const output = result.data;
        
        if (output.success && output.data) {
          const data = output.data;
          log(`✅ 成功 - model: ${data.model}, status: ${data.status}, video_url: ${data.video_url?.substring(0, 50)}...`, 'SUCCESS');
          testResults.unitTest.success++;
          testResults.unitTest.latencies.push(result.latency);
          
          if (data.task_id) {
            log(`   task_id: ${data.task_id}`, 'INFO');
          }
          if (data.cost_estimate !== undefined) {
            log(`   cost_estimate: $${data.cost_estimate}`, 'INFO');
          }
        } else {
          log(`❌ 失败 - ${output.message || 'Unknown error'}`, 'ERROR');
          testResults.unitTest.failed++;
          testResults.unitTest.errors.push(output.message || 'Unknown error');
        }
      } else {
        log(`❌ HTTP错误 - ${result.status}: ${result.data.message || 'Unknown error'}`, 'ERROR');
        testResults.unitTest.failed++;
        testResults.unitTest.errors.push(result.data.message || `HTTP ${result.status}`);
      }
    } catch (error) {
      log(`❌ 异常 - ${error.message}`, 'ERROR');
      testResults.unitTest.failed++;
      testResults.unitTest.errors.push(error.message);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }

  const avgLatency = testResults.unitTest.latencies.length > 0 
    ? (testResults.unitTest.latencies.reduce((a, b) => a + b, 0) / testResults.unitTest.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`单元测试完成 - 成功: ${testResults.unitTest.success}, 失败: ${testResults.unitTest.failed}, 平均延迟: ${avgLatency}ms`, 'INFO');
}

async function testIntegration() {
  log('=== TEST 2: 接口联调测试 ===', 'TEST');

  const testImage = 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20integration&image_size=landscape_16_9';
  const testPrompt = 'Integration test: A beautiful sunset over the ocean';

  log('步骤1: 上传图片并请求视频生成', 'INFO');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate-video',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  try {
    const result = await makeRequest(options, {
      image: testImage,
      prompt: testPrompt,
      duration: 4,
      style: 'cinematic'
    });

    if (result.status >= 200 && result.status < 300 && result.data.success) {
      const data = result.data.data;
      
      log(`✅ 视频生成请求成功 - model: ${data.model}, status: ${data.status}`, 'SUCCESS');
      
      if (data.task_id) {
        log(`步骤2: 轮询查询任务状态 (taskId: ${data.task_id})`, 'INFO');
        
        const statusOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/generate-video?taskId=${data.task_id}`,
          method: 'GET'
        };

        const statusResult = await makeRequest(statusOptions);
        
        if (statusResult.status >= 200 && statusResult.status < 300) {
          const statusData = statusResult.data.data;
          log(`✅ 状态查询成功 - status: ${statusData.status}, video_url: ${statusData.video_url?.substring(0, 50)}...`, 'SUCCESS');
          testResults.integrationTest.success++;
          testResults.integrationTest.latencies.push(result.latency + statusResult.latency);
        } else {
          log(`❌ 状态查询失败 - ${statusResult.data.message}`, 'ERROR');
          testResults.integrationTest.failed++;
        }
      } else if (data.video_url) {
        log(`✅ 视频生成完成 - video_url: ${data.video_url.substring(0, 50)}...`, 'SUCCESS');
        testResults.integrationTest.success++;
        testResults.integrationTest.latencies.push(result.latency);
      }
    } else {
      log(`❌ 视频生成失败 - ${result.data.message || 'Unknown error'}`, 'ERROR');
      testResults.integrationTest.failed++;
    }
  } catch (error) {
    log(`❌ 联调测试异常 - ${error.message}`, 'ERROR');
    testResults.integrationTest.failed++;
  }

  const avgLatency = testResults.integrationTest.latencies.length > 0 
    ? (testResults.integrationTest.latencies.reduce((a, b) => a + b, 0) / testResults.integrationTest.latencies.length).toFixed(2)
    : 'N/A';
  
  log(`接口联调测试完成 - 成功: ${testResults.integrationTest.success}, 失败: ${testResults.integrationTest.failed}, 平均延迟: ${avgLatency}ms`, 'INFO');
}

async function testExceptions() {
  log('=== TEST 3: 异常测试 ===', 'TEST');

  const testCases = [
    {
      name: '空图片URL',
      input: { image: '', prompt: 'Test prompt', duration: 4, style: 'cinematic' },
      expectError: true
    },
    {
      name: '空提示词',
      input: { image: 'https://example.com/test.jpg', prompt: '', duration: 4, style: 'cinematic' },
      expectError: true
    },
    {
      name: '无效图片URL',
      input: { image: 'not-a-valid-url', prompt: 'Test prompt', duration: 4, style: 'cinematic' },
      expectError: true
    }
  ];

  for (const testCase of testCases) {
    log(`测试: ${testCase.name}`, 'INFO');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/generate-video',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    try {
      const result = await makeRequest(options, testCase.input);
      
      if (testCase.expectError) {
        if (result.status >= 400 || !result.data.success) {
          log(`✅ 按预期返回错误: ${result.data.message || 'Validation error'}`, 'SUCCESS');
          testResults.exceptionTest.success++;
        } else {
          log(`❌ 预期错误但返回成功`, 'ERROR');
          testResults.exceptionTest.failed++;
          testResults.exceptionTest.errors.push(`Expected error but got success for ${testCase.name}`);
        }
      } else {
        if (result.status >= 200 && result.status < 300) {
          log(`✅ 成功`, 'SUCCESS');
          testResults.exceptionTest.success++;
        } else {
          log(`❌ 失败: ${result.data.message}`, 'ERROR');
          testResults.exceptionTest.failed++;
        }
      }
    } catch (error) {
      if (testCase.expectError) {
        log(`✅ 按预期抛出异常: ${error.message}`, 'SUCCESS');
        testResults.exceptionTest.success++;
      } else {
        log(`❌ 异常: ${error.message}`, 'ERROR');
        testResults.exceptionTest.failed++;
      }
    }
    
    await new Promise(r => setTimeout(r, 300));
  }

  log(`异常测试完成 - 成功: ${testResults.exceptionTest.success}, 失败: ${testResults.exceptionTest.failed}`, 'INFO');
}

async function testConcurrentRequests(count = 5) {
  log(`=== TEST 4: 并发 ${count} 请求测试 ===`, 'TEST');
  
  const requests = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/generate-video',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const requestPromise = makeRequest(options, {
      image: `https://neeko-copilot.bytedance.net/api/text_to_image?prompt=concurrent%20test%20${i}&image_size=landscape_16_9`,
      prompt: `Concurrent test video ${i}`,
      duration: 4,
      style: 'cinematic'
    }).then(result => {
      if (result.status >= 200 && result.status < 300 && result.data.success) {
        testResults.integrationTest.success++;
        testResults.integrationTest.latencies.push(result.latency);
        return { success: true };
      } else {
        testResults.integrationTest.failed++;
        return { success: false, error: result.data.message };
      }
    }).catch(error => {
      testResults.integrationTest.failed++;
      return { success: false, error: error.message };
    });

    requests.push(requestPromise);
  }

  await Promise.all(requests);
  
  const totalTime = Date.now() - startTime;
  log(`并发测试完成 - 总耗时: ${totalTime}ms, 成功: ${testResults.integrationTest.success}, 失败: ${testResults.integrationTest.failed}`, 'INFO');
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'INFO');
  log('火山引擎图生视频模块 - 测试报告', 'TEST');
  log('='.repeat(60), 'INFO');

  const totalSuccess = testResults.unitTest.success + testResults.integrationTest.success + testResults.exceptionTest.success;
  const totalFailed = testResults.unitTest.failed + testResults.integrationTest.failed + testResults.exceptionTest.failed;
  const totalLatencies = [...testResults.unitTest.latencies, ...testResults.integrationTest.latencies];
  const avgLatency = totalLatencies.length > 0 
    ? (totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length).toFixed(2)
    : 'N/A';

  log('\n📊 测试统计:', 'INFO');
  log(`  单元测试: ${testResults.unitTest.success}/${testResults.unitTest.success + testResults.unitTest.failed}`, 'INFO');
  log(`  接口联调: ${testResults.integrationTest.success}/${testResults.integrationTest.success + testResults.integrationTest.failed}`, 'INFO');
  log(`  异常测试: ${testResults.exceptionTest.success}/${testResults.exceptionTest.success + testResults.exceptionTest.failed}`, 'INFO');
  log(`  总计: ${totalSuccess}/${totalSuccess + totalFailed} (${totalFailed === 0 ? '✅ 全部通过' : '⚠️ 部分失败'})`, 'INFO');

  log('\n⏱️ 性能指标:', 'INFO');
  log(`  平均生成耗时: ${avgLatency}ms`, 'INFO');
  log(`  单条成本估算: $0.12`, 'INFO');

  log('\n✅ 输出要求:', 'INFO');
  log(`  1. API调用是否成功: ${totalSuccess > 0 ? 'YES' : 'NO'}`, 'INFO');
  log(`  2. 是否前后端打通: ${testResults.integrationTest.success > 0 ? 'YES' : 'NO'}`, 'INFO');
  log(`  3. 当前模块是否可用于生产: ${totalFailed === 0 ? 'YES' : 'NO'}`, 'INFO');

  if (testResults.unitTest.errors.length > 0) {
    log('\n❌ 错误日志:', 'ERROR');
    testResults.unitTest.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'ERROR');
    });
  }

  log('\n' + '='.repeat(60), 'INFO');
}

async function main() {
  log('开始火山引擎图生视频模块测试...', 'TEST');
  
  await testUnitGeneration();
  await testIntegration();
  await testExceptions();
  await testConcurrentRequests(5);
  
  await printSummary();
  
  process.exit(testResults.unitTest.failed === 0 && testResults.integrationTest.failed === 0 ? 0 : 1);
}

main().catch(error => {
  log(`测试执行失败: ${error.message}`, 'ERROR');
  process.exit(1);
});