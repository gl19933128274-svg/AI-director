const https = require('https');

const BASE_URL = 'https://ark.cn-beijing.volces.com';
const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';
const MODEL_ID = 'doubao-seedance-2-0-mini-260615';

function makePostRequest(path, body) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      path: path,
      method: 'POST',
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

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testChatCompletions() {
  console.log('=== 火山方舟 chat/completions API 测试 ===');
  console.log('');

  const tests = [
    {
      name: '标准chat格式调用视频模型',
      body: {
        model: MODEL_ID,
        messages: [
          { role: 'user', content: '请根据这张图片生成视频: https://neeko-copilot.bytedance.net/api/text_to_image?prompt=test%20video&image_size=landscape_16_9' }
        ]
      }
    },
    {
      name: '详细指令调用',
      body: {
        model: MODEL_ID,
        messages: [
          { 
            role: 'user', 
            content: '生成一段4秒的视频，场景是美丽的山景日落，电影风格' 
          }
        ]
      }
    },
    {
      name: '使用vision模型测试',
      model: 'doubao-seed-1-6-vision-250815',
      body: {
        model: 'doubao-seed-1-6-vision-250815',
        messages: [
          { role: 'user', content: '这张图片里有什么？' }
        ]
      }
    },
    {
      name: '使用普通对话模型测试',
      body: {
        model: 'doubao-seed-2-0-lite-260428',
        messages: [
          { role: 'user', content: '你好' }
        ]
      }
    }
  ];

  for (const test of tests) {
    console.log(`测试: ${test.name}`);
    console.log(`模型: ${test.body.model}`);
    
    const result = await makePostRequest('/api/v3/chat/completions', test.body);
    
    console.log(`状态码: ${result.status}`);
    
    if (result.data) {
      if (result.data.raw) {
        console.log(`响应: ${result.data.raw}`);
      } else {
        const jsonStr = JSON.stringify(result.data);
        console.log(`响应长度: ${jsonStr.length}`);
        console.log(`响应前1000字符: ${jsonStr.substring(0, 1000)}`);
        
        if (result.data.choices && result.data.choices[0] && result.data.choices[0].message) {
          console.log('消息内容:', result.data.choices[0].message.content.substring(0, 500));
        }
        
        if (result.data.error) {
          console.log('错误:', JSON.stringify(result.data.error));
        }
      }
    }
    
    console.log('');
  }
}

testChatCompletions().catch(console.error);