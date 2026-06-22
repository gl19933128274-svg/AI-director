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
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: { raw: data.substring(0, 1000) } });
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

async function testImageToVideo() {
  console.log('=== 火山方舟图生视频 API 真实调用测试 ===');
  console.log('');
  console.log('模型ID:', MODEL_ID);
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  console.log('');

  const url = `/api/v3/models/${MODEL_ID}/invoke`;
  
  const body = {
    image_url: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20mountain%20landscape%20with%20sunset&image_size=landscape_16_9',
    prompt: 'A beautiful mountain landscape with sunset, cinematic style, 4k resolution',
    duration: 4
  };

  console.log('请求URL:', url);
  console.log('请求体:', JSON.stringify(body, null, 2));
  console.log('');

  console.log('正在发起请求...');
  const result = await makePostRequest(url, body);

  console.log('');
  console.log('=== 响应结果 ===');
  console.log('HTTP状态码:', result.status);
  
  if (result.headers) {
    console.log('响应头:', JSON.stringify(result.headers));
  }
  
  if (result.data) {
    console.log('响应数据:', JSON.stringify(result.data, null, 2));
  }
  
  if (result.error) {
    console.log('错误:', result.error);
  }

  console.log('');
  
  if (result.status === 200 || result.status === 201) {
    const data = result.data;
    
    if (data.task_id || data.taskId) {
      const taskId = data.task_id || data.taskId;
      console.log('✅ 任务已创建!');
      console.log('任务ID:', taskId);
      
      console.log('');
      console.log('=== 轮询查询任务状态 ===');
      
      await pollTaskStatus(taskId);
    } else if (data.video_url || data.output_url) {
      console.log('✅ 视频生成成功!');
      console.log('视频URL:', data.video_url || data.output_url);
    } else {
      console.log('⚠️ 响应中未找到task_id或video_url');
    }
  } else if (result.status === 401) {
    console.log('❌ 认证失败 (401)');
    console.log('请检查API Key是否正确');
  } else if (result.status === 403) {
    console.log('❌ 权限不足 (403)');
    console.log('请确认是否已开通图生视频服务');
  } else if (result.status === 404) {
    console.log('❌ 端点不存在 (404)');
  } else {
    console.log(`❌ 请求失败 (${result.status})`);
  }
}

async function pollTaskStatus(taskId) {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`\n轮询尝试 ${i + 1}/${maxAttempts}...`);
    
    const result = await makePostRequest(`/api/v3/tasks/${taskId}`, {});
    
    console.log('状态码:', result.status);
    
    if (result.data) {
      const status = result.data.status || result.data.task_status || 'unknown';
      console.log('任务状态:', status);
      
      if (result.data.video_url || result.data.output_url) {
        console.log('✅ 任务完成!');
        console.log('视频URL:', result.data.video_url || result.data.output_url);
        return;
      }
      
      if (status === 'failed' || status === 'error') {
        console.log('❌ 任务失败');
        console.log('错误信息:', result.data.message || result.data.error);
        return;
      }
      
      console.log('任务处理中，等待...');
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.log('❌ 轮询超时');
}

testImageToVideo().catch(console.error);