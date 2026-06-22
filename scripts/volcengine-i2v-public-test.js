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

async function testImageToVideo() {
  log('=== 火山方舟图生视频 API - 使用公网图片测试 ===', 'TEST');
  log('API Key: ' + API_KEY.substring(0, 20) + '...', 'INFO');
  log('Base URL: ' + BASE_URL, 'INFO');
  log('模型: doubao-seedance-1-5-pro-251215', 'INFO');
  log('', 'INFO');

  const testImages = [
    {
      name: '火山引擎TOS示例图片',
      url: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seed3d_imageTo3d.png'
    },
    {
      name: 'GitHub示例图片',
      url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
    },
    {
      name: 'Wikipedia示例图片',
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Red_panda.jpg'
    },
    {
      name: 'Imgur示例图片',
      url: 'https://i.imgur.com/7CjZ7lA.jpg'
    }
  ];

  for (const img of testImages) {
    log(`测试图片: ${img.name}`, 'INFO');
    log(`图片URL: ${img.url}`, 'INFO');

    const body = {
      model: 'doubao-seedance-1-5-pro-251215',
      content: [
        {
          type: 'text',
          text: '根据这张图片生成一段美丽的视频，保持画面风格一致 --rs 720p --rt 16:9 --dur 4'
        },
        {
          type: 'image_url',
          image_url: {
            url: img.url
          }
        }
      ]
    };

    log('步骤1: 创建图生视频任务...', 'INFO');

    const createResult = await makeRequest('POST', '/api/v3/contents/generations/tasks', body);

    if (createResult.status === 200 || createResult.status === 201) {
      const taskId = createResult.data.id;
      log('✅ 任务创建成功!', 'SUCCESS');
      log('任务ID: ' + taskId, 'INFO');

      log('步骤2: 轮询等待视频生成...', 'INFO');

      const maxAttempts = 30;
      const delay = 3000;

      for (let i = 0; i < maxAttempts; i++) {
        const pollResult = await makeRequest('GET', `/api/v3/contents/generations/tasks/${taskId}`, null);

        if (pollResult.status === 200) {
          const status = pollResult.data.status || 'unknown';
          log(`轮询 ${i + 1}: ${status}`, 'INFO');

          if (status === 'succeeded') {
            const videoUrl = pollResult.data.content?.video_url;
            log('✅ 视频生成成功!', 'SUCCESS');
            log('视频URL: ' + videoUrl, 'INFO');
            log('视频分辨率: ' + pollResult.data.resolution, 'INFO');
            log('视频时长: ' + pollResult.data.duration + '秒', 'INFO');
            log('是否包含音频: ' + pollResult.data.generate_audio, 'INFO');
            return;
          } else if (status === 'failed') {
            const errorMsg = pollResult.data.error?.message || 'Unknown error';
            log('❌ 任务失败: ' + errorMsg, 'ERROR');
            break;
          }
        }

        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } else {
      log('❌ 任务创建失败 (状态码: ' + createResult.status + ')', 'ERROR');
      
      if (createResult.data.error) {
        log('错误代码: ' + createResult.data.error.code, 'ERROR');
        log('错误信息: ' + createResult.data.error.message, 'ERROR');
      }
    }

    log('', 'INFO');
    log('--- 尝试下一张图片 ---', 'INFO');
    log('', 'INFO');
  }

  log('❌ 所有图片测试均失败', 'ERROR');
  log('请检查图片URL是否可被火山引擎访问', 'WARNING');
}

testImageToVideo().catch(error => {
  log('测试异常: ' + error.message, 'ERROR');
});