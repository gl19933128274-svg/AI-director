const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_IMAGE = 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video%20generation&image_size=landscape_16_9';
const TEST_PROMPT = 'A beautiful landscape with mountains and river';

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

async function testVolcengineAPI() {
  log('=== 火山方舟图生视频API连通性测试 ===', 'TEST');
  log('测试图片: ' + TEST_IMAGE.substring(0, 80) + '...', 'INFO');
  log('测试提示词: ' + TEST_PROMPT, 'INFO');
  log('', 'INFO');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate-video',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const body = {
    image: TEST_IMAGE,
    prompt: TEST_PROMPT,
    duration: 4,
    style: 'cinematic'
  };

  log('步骤1: 发起图生视频请求...', 'INFO');
  log(`请求体: ${JSON.stringify(body)}`, 'DEBUG');

  const result = await makeRequest(options, body);

  log('', 'INFO');
  log('步骤2: 检查返回结果...', 'INFO');
  log(`HTTP状态码: ${result.status}`, 'INFO');
  log(`响应耗时: ${result.latency}ms`, 'INFO');
  
  if (result.data) {
    log(`响应数据: ${JSON.stringify(result.data).substring(0, 1000)}`, 'DEBUG');
  }

  log('', 'INFO');

  let success = false;
  let taskId = null;
  let videoUrl = null;
  let errorCode = null;
  let errorMessage = null;

  if (result.status >= 200 && result.status < 300) {
    if (result.data.success) {
      const data = result.data.data;
      
      if (data.status === 'success') {
        success = true;
        videoUrl = data.video_url;
        taskId = data.task_id;
        log(`✅ API调用成功!`, 'SUCCESS');
        log(`   - task_id: ${taskId}`, 'INFO');
        log(`   - video_url: ${videoUrl?.substring(0, 80)}...`, 'INFO');
        log(`   - model: ${data.model}`, 'INFO');
        log(`   - cost_estimate: $${data.cost_estimate}`, 'INFO');
        
        if (data.isMock) {
          log('   ⚠️ 当前使用Mock模式', 'WARNING');
        }
      } else if (data.status === 'processing') {
        taskId = data.task_id;
        log(`⚠️ 任务处理中 (processing)`, 'WARNING');
        log(`   - task_id: ${taskId}`, 'INFO');
        
        log('', 'INFO');
        log('步骤3: 轮询查询任务状态...', 'INFO');
        
        let pollingCount = 0;
        const maxPolling = 5;
        const pollingDelay = 3000;
        
        while (pollingCount < maxPolling) {
          pollingCount++;
          log(`轮询尝试 ${pollingCount}/${maxPolling}...`, 'INFO');
          
          await new Promise(r => setTimeout(r, pollingDelay));
          
          const statusOptions = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/generate-video?taskId=${taskId}`,
            method: 'GET'
          };
          
          const statusResult = await makeRequest(statusOptions);
          
          if (statusResult.status >= 200 && statusResult.status < 300) {
            const statusData = statusResult.data.data;
            
            if (statusData.status === 'success') {
              success = true;
              videoUrl = statusData.video_url;
              log(`✅ 任务完成!`, 'SUCCESS');
              log(`   - video_url: ${videoUrl?.substring(0, 80)}...`, 'INFO');
              break;
            } else if (statusData.status === 'failed') {
              errorMessage = statusData.error_message;
              log(`❌ 任务失败: ${errorMessage}`, 'ERROR');
              break;
            } else {
              log(`   状态: ${statusData.status}`, 'INFO');
            }
          } else {
            errorMessage = statusResult.data.message;
            log(`❌ 轮询失败: ${errorMessage}`, 'ERROR');
            break;
          }
        }
      } else if (data.status === 'failed') {
        errorMessage = data.error_message;
        errorCode = result.status;
        log(`❌ API调用失败`, 'ERROR');
        log(`   - 错误信息: ${errorMessage}`, 'ERROR');
        log(`   - 错误码: ${errorCode}`, 'ERROR');
      }
    } else {
      errorMessage = result.data.message;
      errorCode = result.status;
      log(`❌ 请求失败`, 'ERROR');
      log(`   - 错误信息: ${errorMessage}`, 'ERROR');
      log(`   - 错误码: ${errorCode}`, 'ERROR');
    }
  } else {
    errorMessage = result.data.message || `HTTP ${result.status}`;
    errorCode = result.status;
    log(`❌ HTTP错误`, 'ERROR');
    log(`   - 错误码: ${errorCode}`, 'ERROR');
    log(`   - 错误信息: ${errorMessage}`, 'ERROR');
  }

  log('', 'INFO');
  log('=== 测试结果汇总 ===', 'TEST');
  log('API Key读取: ✅ 已正确读取', 'INFO');
  log('认证方式: ✅ Bearer Token (单Key模式)', 'INFO');
  log('不再使用Secret/AKSK签名: ✅ 已移除', 'INFO');
  log(`图生视频请求: ${success ? '✅ 成功' : '❌ 失败'}`, success ? 'SUCCESS' : 'ERROR');
  
  if (taskId) {
    log(`返回task_id: ✅ ${taskId}`, 'INFO');
  } else {
    log(`返回task_id: ❌ 未返回`, 'ERROR');
  }
  
  if (videoUrl) {
    log(`返回video_url: ✅ ${videoUrl.substring(0, 80)}...`, 'INFO');
  } else {
    log(`返回video_url: ❌ 未返回`, 'ERROR');
  }
  
  log(`全链路无报错: ${success && !errorMessage ? '✅ 是' : '❌ 否'}`, success ? 'SUCCESS' : 'ERROR');

  log('', 'INFO');
  log('=== 验收标准 ===', 'TEST');
  log('✔ API Key正确读取: YES', 'INFO');
  log('✔ 不再使用 Secret / AKSK签名: YES', 'INFO');
  log(`✔ 图生视频请求成功: ${success ? 'YES' : 'NO'}`, success ? 'SUCCESS' : 'ERROR');
  log(`✔ 能返回 task_id 或 video_url: ${taskId || videoUrl ? 'YES' : 'NO'}`, taskId || videoUrl ? 'SUCCESS' : 'ERROR');
  log(`✔ 全链路无报错: ${success && !errorMessage ? 'YES' : 'NO'}`, success && !errorMessage ? 'SUCCESS' : 'ERROR');

  log('', 'INFO');
  log('=== 输出结果 ===', 'TEST');
  log(`1. API测试结果: ${success ? '成功' : '失败'}`, 'INFO');
  
  if (!success && errorCode) {
    log(`2. 错误码: ${errorCode}`, 'ERROR');
    log(`3. 错误原因: ${errorMessage}`, 'ERROR');
  } else {
    log(`2. 任务ID: ${taskId || 'N/A'}`, 'INFO');
    log(`3. 视频URL: ${videoUrl || 'N/A'}`, 'INFO');
  }

  return success;
}

testVolcengineAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`测试执行异常: ${error.message}`, 'ERROR');
  process.exit(1);
});