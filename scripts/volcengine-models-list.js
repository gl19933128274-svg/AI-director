const https = require('https');

const BASE_URL = 'https://ark.cn-beijing.volces.com';
const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';

function makeRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, error: error.message });
    });

    req.end();
  });
}

async function listModels() {
  console.log('=== 火山方舟可用模型列表 ===');
  console.log('');

  const result = await makeRequest('/api/v3/models');
  
  if (result.status === 200) {
    const models = result.data.data;
    
    console.log(`共找到 ${models.length} 个模型:`);
    console.log('');
    
    models.forEach((model, index) => {
      const statusColor = model.status === 'Running' ? '🟢' : model.status === 'Shutdown' ? '🔴' : '🟡';
      console.log(`${statusColor} [${index + 1}] ${model.name}`);
      console.log(`   ID: ${model.id}`);
      console.log(`   Status: ${model.status}`);
      console.log(`   Version: ${model.version}`);
      console.log(`   Created: ${new Date(model.created * 1000).toLocaleString()}`);
      console.log('');
    });
    
    const videoModels = models.filter(m => m.name.includes('video') || m.name.includes('video') || m.id.includes('video'));
    if (videoModels.length > 0) {
      console.log('=== 视频相关模型 ===');
      videoModels.forEach(m => console.log(`✅ ${m.name} (${m.id})`));
    } else {
      console.log('❌ 未找到视频相关模型');
      console.log('');
      console.log('请确认：');
      console.log('1. 是否已在火山方舟控制台开通图生视频服务');
      console.log('2. 是否需要申请视频模型权限');
      console.log('3. 当前账户是否有图生视频模型可用');
    }
  } else {
    console.log(`❌ 请求失败: ${result.status}`);
    console.log(result.error || result.data);
  }

  console.log('');
  console.log('=== API调用示例 ===');
  console.log('');
  console.log('假设模型ID为 "video-model-id"，调用方式：');
  console.log('POST /api/v3/models/{model_id}/invoke');
  console.log('');
  console.log('请求体:');
  console.log('{');
  console.log('  "image_url": "https://example.com/image.jpg",');
  console.log('  "prompt": "描述文本"');
  console.log('}');
}

listModels().catch(console.error);