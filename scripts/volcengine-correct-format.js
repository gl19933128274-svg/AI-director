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

async function testCorrectFormat() {
  console.log('=== 使用正确的 content 数组格式测试 ===');
  console.log('');

  const models = [
    { id: 'doubao-seedance-2-0-fast-260128', name: 'doubao-seedance-2-0-fast' },
    { id: 'doubao-seedance-1-5-pro-251215', name: 'doubao-seedance-1-5-pro' },
    { id: 'doubao-seedance-2-0-mini-260615', name: 'doubao-seedance-2-0-mini' },
  ];

  const bodyTemplates = [
    {
      name: '图生视频 - 完整参数',
      body: {
        content: [
          {
            type: 'text',
            text: '生成一段美丽的山景日落视频，电影风格，4K分辨率 --rs 720p --rt 16:9 --dur 4 --fps 24 --wm true'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20mountain%20sunset&image_size=landscape_16_9'
            }
          }
        ]
      }
    },
    {
      name: '文生视频 - 纯文本',
      body: {
        content: [
          {
            type: 'text',
            text: '生成一段美丽的山景日落视频，电影风格 --rs 720p --rt 16:9 --dur 4'
          }
        ]
      }
    },
    {
      name: '图生视频 - 简化参数',
      body: {
        content: [
          {
            type: 'text',
            text: '生成视频 --dur 4'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9'
            }
          }
        ]
      }
    },
    {
      name: '图生视频 - 无额外参数',
      body: {
        content: [
          {
            type: 'text',
            text: '生成视频'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test&image_size=landscape_16_9'
            }
          }
        ]
      }
    }
  ];

  for (const model of models) {
    console.log(`=== 测试模型: ${model.name} ===`);
    console.log(`模型ID: ${model.id}`);
    console.log('');

    for (const template of bodyTemplates) {
      console.log(`测试格式: ${template.name}`);
      
      const body = {
        model: model.id,
        ...template.body
      };
      
      console.log(`请求体: ${JSON.stringify(body)}`);
      
      const result = await makeRequest('POST', '/api/v3/contents/generations/tasks', body);
      
      console.log(`状态码: ${result.status}`);
      
      if (result.data) {
        if (result.data.error) {
          const code = result.data.error.code;
          const message = result.data.error.message;
          
          if (code === 'ModelNotOpen') {
            console.log(`状态: ❌ 未开通`);
          } else if (code === 'MissingParameter') {
            console.log(`状态: ⚠️ 参数缺失 - ${message}`);
          } else if (code === 'InvalidParameter') {
            console.log(`状态: ⚠️ 参数无效 - ${message}`);
          } else {
            console.log(`状态: ❌ ${code} - ${message}`);
          }
        } else if (result.status === 200 || result.status === 201) {
          console.log(`状态: ✅ 成功！`);
          console.log(`响应: ${JSON.stringify(result.data)}`);
          
          if (result.data.id) {
            const taskId = result.data.id;
            console.log(`任务ID: ${taskId}`);
            await pollTask(taskId);
          }
        } else {
          console.log(`响应: ${JSON.stringify(result.data)}`);
        }
      }
      
      console.log('');
    }
  }
}

async function pollTask(taskId) {
  console.log(`开始轮询任务 ${taskId}...`);
  
  for (let i = 0; i < 15; i++) {
    const result = await makeRequest('GET', `/api/v3/contents/generations/tasks/${taskId}`, null);
    
    if (result.status === 200) {
      const status = result.data.status || 'unknown';
      console.log(`轮询 ${i+1}: 状态=${status}`);
      
      if (result.data.content && result.data.content.video_url) {
        console.log(`✅ 视频生成成功! URL: ${result.data.content.video_url}`);
        return;
      }
      
      if (status === 'failed' || status === 'error') {
        const errorMsg = result.data.error ? result.data.error.message : 'Unknown error';
        console.log(`❌ 任务失败: ${errorMsg}`);
        return;
      }
      
      if (status === 'succeeded') {
        console.log(`✅ 任务完成!`);
        if (result.data.content) {
          console.log(`输出: ${JSON.stringify(result.data.content)}`);
        }
        return;
      }
    } else {
      console.log(`轮询 ${i+1}: HTTP ${result.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('❌ 轮询超时');
}

testCorrectFormat().catch(console.error);