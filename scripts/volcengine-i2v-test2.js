const https = require('https');

const BASE_URL = 'https://ark.cn-beijing.volces.com';
const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';
const MODEL_ID = 'doubao-seedance-2-0-mini-260615';

function makeRequest(method, path, body) {
  return new Promise((resolve) => {
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
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data.substring(0, 1000) } });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, error: error.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('=== 火山方舟图生视频 API - 端点测试 ===');
  console.log('');

  const body = {
    image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
    prompt: 'test video generation',
    duration: 4
  };

  const endpoints = [
    { method: 'POST', path: `/api/v3/models/${MODEL_ID}/invoke`, desc: '模型调用' },
    { method: 'POST', path: `/api/v3/models/${MODEL_ID}/completions`, desc: '补全调用' },
    { method: 'POST', path: `/api/v3/chat/completions`, desc: '聊天补全' },
    { method: 'POST', path: `/api/v3/text_to_video`, desc: '直接text_to_video' },
    { method: 'POST', path: `/api/v3/tasks`, desc: '创建任务' },
    { method: 'POST', path: `/api/v1/models/${MODEL_ID}/invoke`, desc: 'v1版本' },
    { method: 'POST', path: `/api/v1/text_to_video`, desc: 'v1 text_to_video' },
    { method: 'POST', path: `/api/text_to_video`, desc: '无版本号' },
    { method: 'GET', path: `/api/v3/models/${MODEL_ID}`, desc: '获取模型详情' },
    { method: 'GET', path: `/api/v3/models/${MODEL_ID}/info`, desc: '模型信息' },
  ];

  console.log(`测试模型: ${MODEL_ID}`);
  console.log('');

  for (const ep of endpoints) {
    console.log(`测试: ${ep.method} ${ep.path}`);
    console.log(`描述: ${ep.desc}`);
    
    const result = await makeRequest(ep.method, ep.path, ep.method === 'POST' ? body : undefined);
    
    console.log(`状态码: ${result.status}`);
    
    if (result.data) {
      if (result.data.raw) {
        console.log(`响应: ${result.data.raw}`);
      } else if (Object.keys(result.data).length > 0) {
        console.log(`响应: ${JSON.stringify(result.data).substring(0, 500)}`);
      }
    }
    
    if (result.error) {
      console.log(`错误: ${result.error}`);
    }
    
    console.log('');
  }

  console.log('=== 特殊格式测试 ===');
  console.log('');

  const specialBodies = [
    {
      name: '图片URL格式',
      body: {
        image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
        prompt: 'test'
      }
    },
    {
      name: '图片base64格式',
      body: {
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/',
        prompt: 'test'
      }
    },
    {
      name: '完整参数',
      body: {
        image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
        prompt: 'test',
        duration: 4,
        resolution: '720p',
        style: 'cinematic'
      }
    }
  ];

  for (const sb of specialBodies) {
    console.log(`测试格式: ${sb.name}`);
    const result = await makeRequest('POST', `/api/v3/models/${MODEL_ID}/invoke`, sb.body);
    console.log(`状态码: ${result.status}`);
    if (result.data) {
      console.log(`响应: ${JSON.stringify(result.data).substring(0, 500)}`);
    }
    console.log('');
  }
}

testAllEndpoints().catch(console.error);