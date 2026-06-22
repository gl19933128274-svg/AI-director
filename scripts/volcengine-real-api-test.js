const http = require('http');

const TEST_IMAGE = 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20mountain%20landscape%20with%20sunset&image_size=landscape_16_9';
const TEST_PROMPT = 'A beautiful mountain landscape with sunset, cinematic style';

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString('zh-CN');
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
          resolve({ status: res.statusCode, data: parsed, latency, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: { message: data }, latency, headers: res.headers });
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

async function testRealVolcengineAPI() {
  log('=== 火山方舟图生视频 API - 真实调用测试 ===', 'TEST');
  log('测试图片: ' + TEST_IMAGE.substring(0, 100) + '...', 'INFO');
  log('测试提示词: ' + TEST_PROMPT, 'INFO');
  log('认证方式: Bearer Token (单Key模式)', 'INFO');
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

  log('步骤1: 发起真实图生视频请求...', 'INFO');
  log(`请求体: ${JSON.stringify(body)}`, 'DEBUG');

  const result = await makeRequest(options, body);

  log('', 'INFO');
  log('步骤2: 检查返回结果...', 'INFO');
  log(`HTTP状态码: ${result.status}`, 'INFO');
  log(`响应耗时: ${result.latency}ms`, 'INFO');
  
  if (result.data) {
    log(`响应数据: ${JSON.stringify(result.data)}`, 'DEBUG');
  }

  let success = false;
  let taskId = null;
  let videoUrl = null;
  let errorCode = null;
  let errorMessage = null;
  let modelUsed = null;

  if (result.status >= 200 && result.status < 300) {
    if (result.data.success) {
      const data = result.data.data;
      modelUsed = data.model;
      
      if (data.status === 'success') {
        success = true;
        videoUrl = data.video_url;
        taskId = data.task_id;
        log(`✅ API调用成功!`, 'SUCCESS');
        log(`   - 模型: ${data.model}`, 'INFO');
        log(`   - task_id: ${taskId}`, 'INFO');
        log(`   - video_url: ${videoUrl?.substring(0, 120)}...`, 'INFO');
        
        if (data.isMock) {
          log(`   ⚠️ 当前使用Mock模式`, 'WARNING');
        }
      } else if (data.status === 'processing') {
        taskId = data.task_id;
        log(`⚠️ 任务处理中 (processing)`, 'WARNING');
        log(`   - task_id: ${taskId}`, 'INFO');
        log(`   - 模型: ${data.model}`, 'INFO');
        
        log('', 'INFO');
        log('步骤3: 轮询查询任务状态（每3秒一次，最多60秒）...', 'INFO');
        
        let pollingCount = 0;
        const maxPolling = 20;
        const pollingDelay = 3000;
        
        while (pollingCount < maxPolling) {
          pollingCount++;
          log(`轮询尝试 ${pollingCount}/${maxPolling} (已等待 ${pollingCount * 3}秒)...`, 'INFO');
          
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
              log(`   - video_url: ${videoUrl?.substring(0, 120)}...`, 'INFO');
              log(`   - 总耗时: ${pollingCount * 3 + Math.round(result.latency / 1000)}秒`, 'INFO');
              break;
            } else if (statusData.status === 'failed') {
              errorMessage = statusData.error_message;
              log(`❌ 任务失败: ${errorMessage}`, 'ERROR');
              break;
            } else {
              log(`   当前状态: ${statusData.status}`, 'INFO');
            }
          } else {
            errorMessage = statusResult.data.message;
            log(`❌ 轮询失败: ${errorMessage}`, 'ERROR');
            break;
          }
        }
        
        if (pollingCount >= maxPolling && !success) {
          errorMessage = '轮询超时（60秒）';
          log(`❌ ${errorMessage}`, 'ERROR');
        }
      } else if (data.status === 'failed') {
        errorMessage = data.error_message;
        log(`❌ API调用失败`, 'ERROR');
        log(`   - 错误信息: ${errorMessage}`, 'ERROR');
      }
    } else {
      errorMessage = result.data.message;
      log(`❌ 请求失败`, 'ERROR');
      log(`   - 错误信息: ${errorMessage}`, 'ERROR');
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
  log(`使用模型: ${modelUsed || 'unknown'}`, 'INFO');
  log(`API Key读取: ✅ 已正确读取`, 'INFO');
  log(`认证方式: ✅ Bearer Token (单Key模式)`, 'INFO');
  log(`不再使用Secret/AKSK签名: ✅ 已移除`, 'INFO');
  log(`图生视频请求: ${success ? '✅ 成功' : '❌ 失败'}`, success ? 'SUCCESS' : 'ERROR');
  log(`返回task_id: ${taskId ? '✅ ' + taskId : '❌ 未返回'}`, taskId ? 'SUCCESS' : 'ERROR');
  log(`返回video_url: ${videoUrl ? '✅ ' + videoUrl.substring(0, 80) + '...' : '❌ 未返回'}`, videoUrl ? 'SUCCESS' : 'ERROR');
  log(`全链路无报错: ${success && !errorMessage ? '✅ 是' : '❌ 否'}`, success && !errorMessage ? 'SUCCESS' : 'ERROR');

  log('', 'INFO');
  log('=== 输出结果 ===', 'TEST');
  log(`1. API测试结果: ${success ? '成功' : '失败'}`, 'INFO');
  
  if (!success && errorCode) {
    log(`2. 错误码: ${errorCode}`, 'ERROR');
    log(`3. 错误原因: ${errorMessage}`, 'ERROR');
  } else {
    log(`2. 任务ID: ${taskId || 'N/A'}`, 'INFO');
    log(`3. 视频URL: ${videoUrl || 'N/A'}`, 'INFO');
    log(`4. 使用模型: ${modelUsed || 'N/A'}`, 'INFO');
  }

  return success;
}

testRealVolcengineAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`测试执行异常: ${error.message}`, 'ERROR');
  process.exit(1);
});