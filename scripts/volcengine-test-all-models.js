const https = require('https');

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

async function testAllVideoModels() {
  console.log('=== 测试所有视频相关模型 ===');
  console.log('');

  const videoModels = [
    { id: 'doubao-seedance-2-0-mini-260615', name: 'doubao-seedance-2-0-mini' },
    { id: 'doubao-seedance-2-0-fast-260128', name: 'doubao-seedance-2-0-fast' },
    { id: 'doubao-seedance-2-0-260128', name: 'doubao-seedance-2-0' },
    { id: 'doubao-seedance-1-0-pro-fast-251015', name: 'doubao-seedance-1-0-pro-fast' },
    { id: 'doubao-seedance-1-5-pro-251215', name: 'doubao-seedance-1-5-pro' },
    { id: 'wan2-1-14b-i2v-250225', name: 'wan2-1-14b-i2v (图生视频)' },
    { id: 'wan2-1-14b-t2v-250225', name: 'wan2-1-14b-t2v (文生视频)' },
    { id: 'wan2-1-14b-flf2v-250417', name: 'wan2-1-14b-flf2v' },
    { id: 'doubao-seedream-5-0-260128', name: 'doubao-seedream-5-0 (图生图)' },
    { id: 'doubao-seedream-4-5-251128', name: 'doubao-seedream-4-5 (图生图)' },
    { id: 'doubao-seed3d-2-0-260328', name: 'doubao-seed3d-2-0 (3D)' },
    { id: 'hyper3d-gen2-260112', name: 'hyper3d-gen2 (3D)' },
  ];

  const body = {
    input: {
      image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9',
      prompt: 'test video generation',
      duration: 4
    }
  };

  let foundAvailable = false;

  for (const model of videoModels) {
    console.log(`测试模型: ${model.name}`);
    console.log(`模型ID: ${model.id}`);
    
    const result = await makeRequest('POST', `/api/v3/contents/generations/tasks`, {
      ...body,
      model: model.id
    });
    
    console.log(`状态码: ${result.status}`);
    
    if (result.data && result.data.error) {
      const code = result.data.error.code;
      const message = result.data.error.message;
      
      if (code === 'ModelNotOpen') {
        console.log(`状态: ❌ 未开通`);
      } else if (code === 'MissingParameter') {
        console.log(`状态: ⚠️ 参数缺失（模型存在但需要不同参数）`);
        console.log(`提示: ${message}`);
      } else {
        console.log(`状态: ❌ 错误 (${code})`);
        console.log(`信息: ${message}`);
      }
    } else if (result.status === 200 || result.status === 201) {
      console.log(`状态: ✅ 成功！`);
      console.log(`响应: ${JSON.stringify(result.data).substring(0, 500)}`);
      foundAvailable = true;
    } else {
      console.log(`状态: ❌ 未知错误`);
      if (result.data.raw) {
        console.log(`响应: ${result.data.raw}`);
      }
    }
    
    console.log('');
  }

  if (foundAvailable) {
    console.log('🎉 找到可用的视频模型！');
  } else {
    console.log('❌ 所有视频模型都未开通');
    console.log('');
    console.log('请登录火山方舟控制台开通视频模型权限：');
    console.log('https://console.volcengine.com/ark');
    console.log('');
    console.log('推荐开通的模型：');
    console.log('- doubao-seedance-2-0-mini (轻量级，适合测试)');
    console.log('- doubao-seedance-2-0 (标准版)');
  }

  console.log('');
  console.log('=== 尝试文生视频模型 ===');
  
  const t2vBody = {
    input: {
      prompt: 'A beautiful mountain landscape with sunset, cinematic style',
      duration: 4
    }
  };

  const t2vModels = [
    { id: 'doubao-seedance-2-0-mini-260615', name: 'doubao-seedance-2-0-mini' },
    { id: 'wan2-1-14b-t2v-250225', name: 'wan2-1-14b-t2v' },
  ];

  for (const model of t2vModels) {
    console.log(`测试文生视频: ${model.name}`);
    const result = await makeRequest('POST', `/api/v3/contents/generations/tasks`, {
      ...t2vBody,
      model: model.id
    });
    
    console.log(`状态码: ${result.status}`);
    if (result.data && result.data.error) {
      console.log(`错误: ${result.data.error.code} - ${result.data.error.message}`);
    } else if (result.status === 200 || result.status === 201) {
      console.log(`✅ 成功！响应: ${JSON.stringify(result.data).substring(0, 300)}`);
    }
    console.log('');
  }
}

testAllVideoModels().catch(console.error);