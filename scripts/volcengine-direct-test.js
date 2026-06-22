const https = require('https');

const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function makeRequest(method, path, body) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, latency, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data }, latency, headers: res.headers });
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

async function testDirectAPI() {
  log('=== 火山方舟图生视频 API - 直接调用测试 ===', 'TEST');
  log('API Key: ' + API_KEY.substring(0, 20) + '...', 'INFO');
  log('Base URL: ' + BASE_URL, 'INFO');
  log('', 'INFO');

  const body = {
    model: 'doubao-seedance-2-0-mini-260615',
    input: {
      image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20mountain%20landscape%20with%20sunset&image_size=landscape_16_9',
      prompt: 'A beautiful mountain landscape with sunset, cinematic style, 4k resolution',
      duration: 4
    }
  };

  log('步骤1: 直接调用火山方舟API...', 'INFO');
  log('请求URL: ' + BASE_URL + '/contents/generations/tasks', 'DEBUG');
  log('请求体: ' + JSON.stringify(body), 'DEBUG');

  const result = await makeRequest('POST', '/api/v3/contents/generations/tasks', body);

  log('', 'INFO');
  log('步骤2: 检查响应结果...', 'INFO');
  log('HTTP状态码: ' + result.status, 'INFO');
  log('响应耗时: ' + result.latency + 'ms', 'INFO');
  log('响应数据: ' + JSON.stringify(result.data), 'DEBUG');

  if (result.status === 200 || result.status === 201) {
    log('✅ API调用成功!', 'SUCCESS');
    
    if (result.data.task_id || result.data.taskId) {
      const taskId = result.data.task_id || result.data.taskId;
      log('任务已创建，开始轮询...', 'INFO');
      await pollTask(taskId);
    } else if (result.data.data && result.data.data.video_url) {
      log('视频生成成功!', 'SUCCESS');
      log('视频URL: ' + result.data.data.video_url, 'INFO');
    } else {
      log('响应中未找到task_id或video_url', 'WARNING');
    }
  } else {
    log('❌ API调用失败 (状态码: ' + result.status + ')', 'ERROR');
    
    if (result.data.error) {
      log('错误代码: ' + (result.data.error.code || 'N/A'), 'ERROR');
      log('错误信息: ' + (result.data.error.message || 'N/A'), 'ERROR');
    }
    
    if (result.data.message) {
      log('错误信息: ' + result.data.message, 'ERROR');
    }
  }

  log('', 'INFO');
  log('=== 测试结果汇总 ===', 'TEST');
  log('HTTP状态码: ' + result.status, 'INFO');
  log('API调用: ' + (result.status === 200 || result.status === 201 ? '✅ 成功' : '❌ 失败'), 'INFO');
  
  if (result.status === 404 && result.data.error && result.data.error.code === 'ModelNotOpen') {
    log('', 'INFO');
    log('⚠️ 重要提示: 账户未开通图生视频模型权限', 'WARNING');
    log('请登录火山方舟控制台开通 doubao-seedance-2-0-mini-260615 模型', 'WARNING');
  }
}

async function pollTask(taskId) {
  const maxAttempts = 30;
  const delay = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    log(`轮询第 ${i + 1}/${maxAttempts} 次...`, 'INFO');
    
    const result = await makeRequest('GET', `/api/v3/contents/generations/tasks/${taskId}`, null);
    
    if (result.status === 200) {
      const status = result.data.status || result.data.task_status || 'unknown';
      log('任务状态: ' + status, 'INFO');
      
      if (result.data.data && result.data.data.video_url) {
        log('✅ 任务完成!', 'SUCCESS');
        log('视频URL: ' + result.data.data.video_url, 'INFO');
        return;
      }
      
      if (status === 'failed' || status === 'error') {
        log('❌ 任务失败', 'ERROR');
        log('错误信息: ' + (result.data.message || 'N/A'), 'ERROR');
        return;
      }
      
      if (status === 'success') {
        if (result.data.data && result.data.data.output) {
          log('✅ 任务完成!', 'SUCCESS');
          log('输出: ' + JSON.stringify(result.data.data.output), 'INFO');
        } else {
          log('任务成功但未找到输出', 'WARNING');
        }
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  log('❌ 轮询超时', 'ERROR');
}

testDirectAPI().catch(error => {
  log('测试异常: ' + error.message, 'ERROR');
});