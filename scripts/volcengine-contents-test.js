const https = require('https');

const BASE_URL = 'https://ark.cn-beijing.volces.com';
const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';

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
          resolve({ status: res.statusCode, data: { raw: data.substring(0, 2000) } });
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

async function testContentsEndpoint() {
  console.log('=== 测试用户提供的端点 ===');
  console.log('');

  const endpoints = [
    { method: 'POST', path: '/api/v3/contents/generations/tasks', desc: '创建生成任务' },
    { method: 'GET', path: '/api/v3/contents/generations/tasks', desc: '获取任务列表' },
    { method: 'POST', path: '/api/v3/contents/generations', desc: '生成内容' },
    { method: 'POST', path: '/api/v3/generations/tasks', desc: '生成任务' },
    { method: 'GET', path: '/api/v3/contents', desc: '获取内容' },
  ];

  const body = {
    input: {
      image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
      prompt: 'test video generation',
      duration: 4
    }
  };

  for (const ep of endpoints) {
    console.log(`测试: ${ep.method} ${ep.path}`);
    console.log(`描述: ${ep.desc}`);
    
    const result = await makeRequest(ep.method, ep.path, ep.method === 'POST' ? body : undefined);
    
    console.log(`状态码: ${result.status}`);
    
    if (result.data) {
      if (result.data.raw) {
        console.log(`响应: ${result.data.raw}`);
      } else {
        const jsonStr = JSON.stringify(result.data);
        console.log(`响应长度: ${jsonStr.length}`);
        console.log(`响应前1000字符: ${jsonStr.substring(0, 1000)}`);
        
        if (result.data.error) {
          console.log('错误:', JSON.stringify(result.data.error));
        }
      }
    }
    
    if (result.error) {
      console.log(`错误: ${result.error}`);
    }
    
    console.log('');
  }

  console.log('=== 尝试不同的请求体格式 ===');
  console.log('');

  const bodyVariants = [
    {
      name: '标准格式',
      body: {
        image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
        prompt: 'test video',
        duration: 4
      }
    },
    {
      name: '嵌套input格式',
      body: {
        input: {
          image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
          prompt: 'test video'
        }
      }
    },
    {
      name: '指定模型格式',
      body: {
        model: 'doubao-seedance-2-0-mini-260615',
        image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
        prompt: 'test video'
      }
    },
    {
      name: 'task创建格式',
      body: {
        task_type: 'video_generation',
        input: {
          image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
          prompt: 'test video'
        }
      }
    }
  ];

  for (const variant of bodyVariants) {
    console.log(`测试格式: ${variant.name}`);
    const result = await makeRequest('POST', '/api/v3/contents/generations/tasks', variant.body);
    console.log(`状态码: ${result.status}`);
    if (result.data) {
      console.log(`响应: ${JSON.stringify(result.data).substring(0, 1000)}`);
    }
    console.log('');
  }
}

testContentsEndpoint().catch(console.error);