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
          resolve({ status: res.statusCode, data: parsed, latency });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data }, latency });
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

async function testRealVideoGeneration() {
  log('=== 火山方舟文生视频 API - 完整测试 ===', 'TEST');
  log('API Key: ' + API_KEY.substring(0, 20) + '...', 'INFO');
  log('Base URL: ' + BASE_URL, 'INFO');
  log('模型: doubao-seedance-1-5-pro-251215', 'INFO');
  log('', 'INFO');

  const body = {
    model: 'doubao-seedance-1-5-pro-251215',
    content: [
      {
        type: 'text',
        text: 'A beautiful mountain landscape with sunset, cinematic style, 4k resolution --rs 720p --rt 16:9 --dur 4'
      }
    ]
  };

  log('步骤1: 创建视频生成任务...', 'INFO');
  log('请求URL: ' + BASE_URL + '/contents/generations/tasks', 'DEBUG');
  log('请求体: ' + JSON.stringify(body), 'DEBUG');

  const createResult = await makeRequest('POST', '/api/v3/contents/generations/tasks', body);

  log('', 'INFO');
  log('步骤2: 检查创建结果...', 'INFO');
  log('HTTP状态码: ' + createResult.status, 'INFO');
  log('响应耗时: ' + createResult.latency + 'ms', 'INFO');

  if (createResult.status === 200 || createResult.status === 201) {
    const taskId = createResult.data.id;
    log('✅ 任务创建成功!', 'SUCCESS');
    log('任务ID: ' + taskId, 'INFO');

    log('', 'INFO');
    log('步骤3: 轮询等待视频生成...', 'INFO');
    log('预计等待时间: 30-60秒', 'INFO');

    const maxAttempts = 30;
    const delay = 3000;

    for (let i = 0; i < maxAttempts; i++) {
      log(`轮询第 ${i + 1}/${maxAttempts} 次...`, 'INFO');

      const pollResult = await makeRequest('GET', `/api/v3/contents/generations/tasks/${taskId}`, null);

      if (pollResult.status === 200) {
        const status = pollResult.data.status || 'unknown';
        log('任务状态: ' + status, 'INFO');

        if (status === 'succeeded') {
          const videoUrl = pollResult.data.content?.video_url;
          log('✅ 视频生成成功!', 'SUCCESS');
          log('视频URL: ' + videoUrl, 'INFO');
          log('视频分辨率: ' + pollResult.data.resolution, 'INFO');
          log('视频时长: ' + pollResult.data.duration + '秒', 'INFO');
          log('视频宽高比: ' + pollResult.data.ratio, 'INFO');
          log('是否包含音频: ' + pollResult.data.generate_audio, 'INFO');
          break;
        } else if (status === 'failed') {
          const errorMsg = pollResult.data.error?.message || 'Unknown error';
          log('❌ 任务失败', 'ERROR');
          log('错误信息: ' + errorMsg, 'ERROR');
          break;
        } else if (status === 'cancelled') {
          log('❌ 任务已取消', 'ERROR');
          break;
        } else if (status === 'expired') {
          log('❌ 任务已过期', 'ERROR');
          break;
        }
      }

      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } else {
    log('❌ 任务创建失败', 'ERROR');
    
    if (createResult.data.error) {
      log('错误代码: ' + createResult.data.error.code, 'ERROR');
      log('错误信息: ' + createResult.data.error.message, 'ERROR');
    } else if (createResult.data.raw) {
      log('原始响应: ' + createResult.data.raw, 'ERROR');
    }
  }

  log('', 'INFO');
  log('=== 测试完成 ===', 'TEST');
}

testRealVideoGeneration().catch(error => {
  log('测试异常: ' + error.message, 'ERROR');
});