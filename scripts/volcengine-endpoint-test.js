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
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 500)
        });
      });
    });

    req.on('error', (error) => {
      resolve({ path, status: 0, error: error.message });
    });

    req.end();
  });
}

async function testEndpoints() {
  console.log('=== 火山方舟 API 端点测试 ===');
  console.log('Base URL:', BASE_URL);
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  console.log('');

  const endpoints = [
    '/api/v3',
    '/api/v3/models',
    '/api/v3/text_to_video',
    '/api/v3/text_to_video/submit',
    '/api/v3/models/text_to_video',
    '/api/v3/models/text_to_video/invoke',
    '/api/text_to_video',
    '/api/text_to_video/submit',
    '/text_to_video',
    '/api/v1/text_to_video',
    '/api/v1/models/text_to_video/invoke'
  ];

  console.log('正在测试以下端点：');
  endpoints.forEach((ep, i) => console.log(`${i + 1}. ${ep}`));
  console.log('');

  const results = await Promise.all(endpoints.map(makeRequest));

  console.log('=== 测试结果 ===');
  console.log('');

  let foundWorking = false;

  results.forEach((result, index) => {
    const status = result.status;
    const prefix = status === 200 ? '✅' : status === 401 ? '🔒' : status === 403 ? '🚫' : status === 404 ? '❓' : '⚠️';
    
    console.log(`${prefix} [${status}] ${endpoints[index]}`);
    
    if (result.body) {
      console.log(`   Response: ${result.body}`);
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('');

    if (status === 200 || (status >= 400 && status < 500)) {
      foundWorking = true;
    }
  });

  if (!foundWorking) {
    console.log('❌ 未找到可用的API端点');
    console.log('');
    console.log('建议检查：');
    console.log('1. API Key 是否正确');
    console.log('2. 网络是否能访问火山引擎');
    console.log('3. 是否需要使用其他区域（如 sg 区域）');
  } else {
    console.log('✅ 找到至少一个有响应的端点');
  }

  console.log('');
  console.log('=== POST 请求测试 ===');
  
  function makePostRequest(path) {
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
          resolve({
            path,
            status: res.statusCode,
            body: data.substring(0, 500)
          });
        });
      });

      req.on('error', (error) => {
        resolve({ path, status: 0, error: error.message });
      });

      req.write(JSON.stringify({
        image_url: 'https://example.com/test.jpg',
        prompt: 'test'
      }));
      req.end();
    });
  }

  const postEndpoints = [
    '/api/v3/text_to_video',
    '/api/v3/text_to_video/submit',
    '/api/v3/models/text_to_video/invoke',
    '/api/text_to_video',
    '/api/text_to_video/submit'
  ];

  const postResults = await Promise.all(postEndpoints.map(makePostRequest));

  console.log('');
  postResults.forEach((result) => {
    const status = result.status;
    const prefix = status === 200 || status === 201 ? '✅' : status === 401 ? '🔒' : status === 403 ? '🚫' : status === 404 ? '❓' : '⚠️';
    
    console.log(`${prefix} POST [${status}] ${result.path}`);
    if (result.body) {
      console.log(`   Response: ${result.body}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
}

testEndpoints().catch(console.error);