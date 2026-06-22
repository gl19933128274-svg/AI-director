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

async function testContentParam() {
  console.log('=== 测试使用 content 参数的模型 ===');
  console.log('');

  const models = [
    { id: 'doubao-seedance-2-0-fast-260128', name: 'doubao-seedance-2-0-fast' },
    { id: 'doubao-seedance-1-5-pro-251215', name: 'doubao-seedance-1-5-pro' },
  ];

  const bodyVariants = [
    {
      name: 'content字段 - 纯文本',
      body: {
        model: '',
        content: '生成一段4秒的山景日落视频'
      }
    },
    {
      name: 'content字段 - JSON字符串',
      body: {
        model: '',
        content: JSON.stringify({
          image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
          prompt: 'test video',
          duration: 4
        })
      }
    },
    {
      name: 'content字段 - 带图片URL',
      body: {
        model: '',
        content: {
          image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
          prompt: 'test video',
          duration: 4
        }
      }
    },
    {
      name: 'input.content字段',
      body: {
        model: '',
        input: {
          content: '生成一段4秒的山景日落视频'
        }
      }
    },
    {
      name: 'input.content字段 - 完整参数',
      body: {
        model: '',
        input: {
          content: {
            image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
            prompt: 'test video',
            duration: 4
          }
        }
      }
    },
    {
      name: 'task_type + input',
      body: {
        model: '',
        task_type: 'video_generation',
        input: {
          image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
          prompt: 'test video',
          duration: 4
        }
      }
    },
    {
      name: '简化格式 - image_url + prompt',
      body: {
        model: '',
        image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9',
        prompt: 'test video',
        duration: 4
      }
    }
  ];

  for (const model of models) {
    console.log(`=== 测试模型: ${model.name} ===`);
    console.log(`模型ID: ${model.id}`);
    console.log('');

    for (const variant of bodyVariants) {
      console.log(`测试格式: ${variant.name}`);
      
      const body = { ...variant.body };
      body.model = model.id;
      
      const result = await makeRequest('POST', '/api/v3/contents/generations/tasks', body);
      
      console.log(`状态码: ${result.status}`);
      
      if (result.data) {
        if (result.data.error) {
          const code = result.data.error.code;
          const message = result.data.error.message;
          
          if (code === 'ModelNotOpen') {
            console.log(`状态: ❌ 未开通`);
          } else if (code === 'MissingParameter') {
            console.log(`状态: ⚠️ 参数缺失`);
            console.log(`提示: ${message}`);
          } else {
            console.log(`状态: ❌ ${code}`);
            console.log(`信息: ${message}`);
          }
        } else if (result.status === 200 || result.status === 201) {
          console.log(`状态: ✅ 成功！`);
          console.log(`响应: ${JSON.stringify(result.data).substring(0, 1000)}`);
          
          if (result.data.task_id || result.data.taskId) {
            const taskId = result.data.task_id || result.data.taskId;
            console.log(`任务ID: ${taskId}`);
            await pollTask(taskId);
          }
        } else {
          console.log(`响应: ${JSON.stringify(result.data).substring(0, 500)}`);
        }
      }
      
      console.log('');
    }
  }
}

async function pollTask(taskId) {
  console.log(`开始轮询任务 ${taskId}...`);
  
  for (let i = 0; i < 10; i++) {
    const result = await makeRequest('GET', `/api/v3/contents/generations/tasks/${taskId}`, null);
    
    if (result.status === 200) {
      const status = result.data.status || 'unknown';
      console.log(`轮询 ${i+1}: 状态=${status}`);
      
      if (result.data.data && result.data.data.video_url) {
        console.log(`✅ 视频生成成功! URL: ${result.data.data.video_url}`);
        return;
      }
      
      if (status === 'failed' || status === 'error') {
        console.log(`❌ 任务失败: ${result.data.message || 'Unknown error'}`);
        return;
      }
      
      if (status === 'success') {
        console.log(`✅ 任务完成! 响应: ${JSON.stringify(result.data).substring(0, 500)}`);
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('❌ 轮询超时');
}

testContentParam().catch(console.error);