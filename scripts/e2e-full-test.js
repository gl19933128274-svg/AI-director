const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'ark-9f898b51-14c1-4238-a36b-548d283be920-21f62';
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

const results = {
  success: [],
  failed: [],
  warnings: [],
  logs: []
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString('zh-CN');
  const logEntry = `[${timestamp}] [${type}] ${message}`;
  console.log(logEntry);
  results.logs.push(logEntry);
}

function checkStatusCode(status) {
  if (status >= 200 && status < 300) {
    return { ok: true, type: 'SUCCESS' };
  } else if (status >= 400 && status < 500) {
    return { ok: false, type: 'CLIENT_ERROR' };
  } else if (status >= 500) {
    return { ok: false, type: 'SERVER_ERROR' };
  }
  return { ok: false, type: 'UNKNOWN' };
}

function httpRequest(url, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data }, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 500, data: { message: error.message }, headers: {} });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testFrontendLoad() {
  log('=== 测试1: 前端界面加载 ===', 'TEST');
  
  const response = await httpRequest(BASE_URL);
  const statusCheck = checkStatusCode(response.status);
  
  if (statusCheck.ok) {
    const hasHtml = response.data.raw && response.data.raw.includes('<!DOCTYPE html>');
    const hasReactRoot = response.data.raw && response.data.raw.includes('id="__next"');
    
    if (hasHtml && hasReactRoot) {
      log('✅ 前端页面加载成功', 'SUCCESS');
      log(`状态码: ${response.status}`, 'INFO');
      log(`内容长度: ${response.data.raw?.length || 0} 字符`, 'INFO');
      results.success.push('前端界面正常加载');
    } else {
      log('❌ 前端页面内容异常', 'ERROR');
      log(`缺少必要HTML结构`, 'ERROR');
      results.failed.push('前端界面内容异常');
    }
  } else {
    log(`❌ 前端页面加载失败 (${statusCheck.type})`, 'ERROR');
    log(`状态码: ${response.status}`, 'ERROR');
    results.failed.push(`前端界面加载失败: ${statusCheck.type}`);
  }
  
  log('', 'INFO');
}

async function testTextToImage() {
  log('=== 测试2: 文生图功能 ===', 'TEST');
  
  const testCases = [
    { prompt: '一只可爱的小猫', description: '简单中文提示词' },
    { prompt: 'A beautiful sunset over the ocean', description: '英文提示词' },
    { prompt: '赛博朋克风格的未来城市', description: '风格化提示词' }
  ];
  
  for (const testCase of testCases) {
    log(`测试: ${testCase.description}`, 'INFO');
    
    const body = {
      prompt: testCase.prompt,
      image: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seed3d_imageTo3d.png',
      duration: 4
    };
    
    const response = await httpRequest(
      `${BASE_URL}/api/generate-video`,
      'POST',
      { 'Content-Type': 'application/json' },
      body
    );
    
    const statusCheck = checkStatusCode(response.status);
    
    if (statusCheck.ok) {
      if (response.data.data?.video_url) {
        const videoUrl = response.data.data.video_url;
        log(`✅ 视频生成成功: ${videoUrl.substring(0, 60)}...`, 'SUCCESS');
        log(`模型: ${response.data.data.model}`, 'INFO');
        log(`任务ID: ${response.data.data.task_id}`, 'INFO');
        
        let fullVideoUrl = videoUrl;
        if (videoUrl.startsWith('/')) {
          fullVideoUrl = `${BASE_URL}${videoUrl}`;
        }
        
        const videoResponse = await httpRequest(fullVideoUrl, 'HEAD');
        if (checkStatusCode(videoResponse.status).ok) {
          log(`✅ 视频URL可访问`, 'SUCCESS');
          results.success.push(`视频生成: ${testCase.description}`);
        } else {
          log(`⚠ 视频URL可能不可访问`, 'WARNING');
          results.warnings.push(`视频URL不可访问: ${testCase.description}`);
        }
      } else {
        log(`❌ 视频生成未返回视频URL`, 'ERROR');
        log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
        results.failed.push(`视频生成无返回: ${testCase.description}`);
      }
    } else {
      log(`❌ 视频生成失败 (${statusCheck.type})`, 'ERROR');
      log(`状态码: ${response.status}`, 'ERROR');
      log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
      results.failed.push(`视频生成失败: ${testCase.description}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  log('', 'INFO');
}

async function testTextToVideo() {
  log('=== 测试3: 文生视频功能 ===', 'TEST');
  
  const body = {
    prompt: 'A beautiful mountain landscape with sunset, cinematic style --rs 720p --rt 16:9 --dur 4',
    image: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seed3d_imageTo3d.png',
    duration: 4
  };
  
  log('请求: POST /api/generate-video', 'INFO');
  log('提示词: ' + body.prompt, 'INFO');
  
  const response = await httpRequest(
    `${BASE_URL}/api/generate-video`,
    'POST',
    { 'Content-Type': 'application/json' },
    body
  );
  
  const statusCheck = checkStatusCode(response.status);
  
  if (statusCheck.ok) {
      if (response.data.data?.video_url) {
        const videoUrl = response.data.data.video_url;
        log(`✅ 文生视频成功: ${videoUrl.substring(0, 60)}...`, 'SUCCESS');
        
        let fullVideoUrl = videoUrl;
        if (videoUrl.startsWith('/')) {
          fullVideoUrl = `${BASE_URL}${videoUrl}`;
        }
        
        const videoResponse = await httpRequest(fullVideoUrl, 'HEAD');
        if (checkStatusCode(videoResponse.status).ok) {
          log(`✅ 视频URL可访问`, 'SUCCESS');
          results.success.push('文生视频功能');
        } else {
          log(`⚠ 视频URL可能不可访问`, 'WARNING');
          results.warnings.push('文生视频URL不可访问');
        }
        
        log(`任务ID: ${response.data.data.task_id}`, 'INFO');
        log(`模型: ${response.data.data.model}`, 'INFO');
        log(`预估费用: ${response.data.data.cost_estimate}`, 'INFO');
      } else {
        log(`⚠ 文生视频响应格式异常`, 'WARNING');
        log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
        results.warnings.push('文生视频响应格式异常');
      }
    } else {
      log(`❌ 文生视频请求失败 (${statusCheck.type})`, 'ERROR');
      log(`状态码: ${response.status}`, 'ERROR');
      log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
      results.failed.push(`文生视频请求失败: ${statusCheck.type}`);
    }
  
  log('', 'INFO');
}

async function testImageToVideo() {
  log('=== 测试4: 图生视频功能 ===', 'TEST');
  
  const testImages = [
    'https://ark-project.tos-cn-beijing.volces.com/doc_image/seed3d_imageTo3d.png',
    'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
  ];
  
  for (const imageUrl of testImages) {
    log(`测试图片: ${imageUrl.substring(0, 50)}...`, 'INFO');
    
    const body = {
      prompt: '根据图片生成一段美丽的视频',
      image: imageUrl,
      model: 'volcengine',
      duration: 4
    };
    
    const response = await httpRequest(
      `${BASE_URL}/api/generate-video`,
      'POST',
      { 'Content-Type': 'application/json' },
      body
    );
    
    const statusCheck = checkStatusCode(response.status);
    
    if (statusCheck.ok) {
      if (response.data.data?.video_url || response.data.data?.output_url) {
        const videoUrl = response.data.data?.video_url || response.data.data?.output_url;
        log(`✅ 图生视频成功: ${videoUrl.substring(0, 60)}...`, 'SUCCESS');
        
        let fullVideoUrl = videoUrl;
        if (videoUrl.startsWith('/')) {
          fullVideoUrl = `${BASE_URL}${videoUrl}`;
        }
        
        const videoResponse = await httpRequest(fullVideoUrl, 'HEAD');
        if (checkStatusCode(videoResponse.status).ok) {
          log(`✅ 视频URL可访问`, 'SUCCESS');
          results.success.push(`图生视频: ${imageUrl.substring(0, 30)}...`);
        } else {
          log(`⚠ 视频URL可能不可访问`, 'WARNING');
          results.warnings.push(`图生视频URL不可访问: ${imageUrl.substring(0, 30)}...`);
        }
      } else if (response.data.status === 'failed') {
        log(`❌ 图生视频失败: ${response.data.error_message}`, 'ERROR');
        results.failed.push(`图生视频失败: ${response.data.error_message}`);
      } else {
        log(`⚠ 图生视频响应格式异常`, 'WARNING');
        log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
        results.warnings.push('图生视频响应格式异常');
      }
    } else {
      log(`❌ 图生视频请求失败 (${statusCheck.type})`, 'ERROR');
      log(`状态码: ${response.status}`, 'ERROR');
      log(`响应: ${JSON.stringify(response.data)}`, 'DEBUG');
      results.failed.push(`图生视频请求失败: ${statusCheck.type}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  log('', 'INFO');
}

async function testApiKeyValidation() {
  log('=== 测试5: API Key 验证 ===', 'TEST');
  
  const tests = [
    { name: '正确API Key', key: API_KEY, shouldPass: true },
    { name: '空API Key', key: '', shouldPass: false },
    { name: '错误API Key', key: 'invalid-key-123', shouldPass: false }
  ];
  
  for (const test of tests) {
    log(`测试: ${test.name}`, 'INFO');
    
    const body = {
      model: 'doubao-seedance-1-5-pro-251215',
      content: [{ type: 'text', text: 'test' }]
    };
    
    const response = await httpRequest(
      `${ARK_BASE_URL}/contents/generations/tasks`,
      'POST',
      {
        'Authorization': `Bearer ${test.key}`,
        'Content-Type': 'application/json'
      },
      body
    );
    
    const statusCheck = checkStatusCode(response.status);
    
    if (test.shouldPass) {
      if (statusCheck.ok) {
        log('✅ API Key验证通过', 'SUCCESS');
        results.success.push(`API Key验证: ${test.name}`);
      } else {
        log(`❌ API Key验证失败 (预期通过)`, 'ERROR');
        log(`状态码: ${response.status}`, 'ERROR');
        log(`错误: ${response.data.error?.message || 'Unknown'}`, 'ERROR');
        results.failed.push(`API Key验证失败: ${test.name}`);
      }
    } else {
      if (!statusCheck.ok && (response.status === 401 || response.status === 403)) {
        log(`✅ API Key验证失败 (预期行为)`, 'SUCCESS');
        log(`状态码: ${response.status}`, 'INFO');
        results.success.push(`API Key验证: ${test.name} (预期拒绝)`);
      } else {
        log(`⚠ API Key验证结果异常`, 'WARNING');
        log(`状态码: ${response.status}`, 'DEBUG');
        results.warnings.push(`API Key验证异常: ${test.name}`);
      }
    }
  }
  
  log('', 'INFO');
}

async function testAllEndpoints() {
  log('=== 测试6: 所有接口状态码检查 ===', 'TEST');
  
  const endpoints = [
    { method: 'GET', url: `${BASE_URL}/api/v1/health`, name: '健康检查' },
    { method: 'POST', url: `${BASE_URL}/api/generate-video`, name: '视频生成', body: { prompt: 'test', image: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seed3d_imageTo3d.png', duration: 4 } },
    { method: 'GET', url: `${BASE_URL}/api/v1/video/tasks`, name: '任务列表' },
    { method: 'POST', url: `${BASE_URL}/api/v1/storyboard/generate`, name: '分镜生成', body: { prompt: 'test storyboard' } }
  ];
  
  for (const endpoint of endpoints) {
    log(`测试: ${endpoint.name} (${endpoint.method} ${endpoint.url})`, 'INFO');
    
    const response = await httpRequest(
      endpoint.url,
      endpoint.method,
      { 'Content-Type': 'application/json' },
      endpoint.body || null
    );
    
    const statusCheck = checkStatusCode(response.status);
    
    if (statusCheck.ok) {
      log(`✅ ${endpoint.name}: 状态码 ${response.status}`, 'SUCCESS');
      results.success.push(`接口检查: ${endpoint.name}`);
    } else {
      log(`❌ ${endpoint.name}: 状态码 ${response.status} (${statusCheck.type})`, 'ERROR');
      results.failed.push(`接口检查失败: ${endpoint.name}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  log('', 'INFO');
}

async function testResourceValidity() {
  log('=== 测试7: 生成资源有效性检查 ===', 'TEST');
  
  const body = {
    model: 'doubao-seedance-1-5-pro-251215',
    content: [{ type: 'text', text: 'test resource validity --rs 720p --dur 2' }]
  };
  
  const createResponse = await httpRequest(
    `${ARK_BASE_URL}/contents/generations/tasks`,
    'POST',
    {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body
  );
  
  if (createResponse.status === 200) {
    const taskId = createResponse.data.id;
    log(`任务ID: ${taskId}`, 'INFO');
    
    for (let i = 0; i < 20; i++) {
      const pollResponse = await httpRequest(
        `${ARK_BASE_URL}/contents/generations/tasks/${taskId}`,
        'GET',
        { 'Authorization': `Bearer ${API_KEY}` }
      );
      
      if (pollResponse.data.status === 'succeeded') {
        const videoUrl = pollResponse.data.content?.video_url;
        
        if (videoUrl) {
          log(`视频URL: ${videoUrl.substring(0, 80)}...`, 'INFO');
          
          const headResponse = await httpRequest(videoUrl, 'HEAD');
          if (headResponse.status === 200) {
            const contentType = headResponse.headers['content-type'];
            const contentLength = headResponse.headers['content-length'];
            
            log(`✅ 资源有效`, 'SUCCESS');
            log(`Content-Type: ${contentType}`, 'INFO');
            log(`Content-Length: ${contentLength} bytes`, 'INFO');
            results.success.push('生成资源有效性检查');
          } else {
            log(`❌ 资源不可访问`, 'ERROR');
            results.failed.push('生成资源不可访问');
          }
        } else {
          log(`❌ 未返回视频URL`, 'ERROR');
          results.failed.push('未返回视频URL');
        }
        break;
      } else if (pollResponse.data.status === 'failed') {
        log(`❌ 任务失败: ${pollResponse.data.error?.message}`, 'ERROR');
        results.failed.push('资源生成任务失败');
        break;
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
  } else {
    log(`❌ 任务创建失败`, 'ERROR');
    results.failed.push('资源生成任务创建失败');
  }
  
  log('', 'INFO');
}

async function testServerLogs() {
  log('=== 测试8: 服务器日志检查 ===', 'TEST');
  
  log('检查前端开发服务器状态...', 'INFO');
  
  const healthResponse = await httpRequest(`${BASE_URL}/api/health`);
  
  if (healthResponse.status === 200) {
    log(`✅ 服务器健康检查通过`, 'SUCCESS');
    log(`响应: ${JSON.stringify(healthResponse.data)}`, 'INFO');
    results.success.push('服务器健康检查');
  } else {
    log(`❌ 服务器健康检查失败`, 'ERROR');
    results.failed.push('服务器健康检查失败');
  }
  
  log('', 'INFO');
}

function generateReport() {
  log('=== 测试报告 ===', 'REPORT');
  log('', 'INFO');
  
  log('【成功项】', 'REPORT');
  results.success.forEach((item, index) => {
    log(`${index + 1}. ${item}`, 'SUCCESS');
  });
  
  log('', 'INFO');
  log('【失败项】', 'REPORT');
  if (results.failed.length === 0) {
    log('无', 'SUCCESS');
  } else {
    results.failed.forEach((item, index) => {
      log(`${index + 1}. ${item}`, 'ERROR');
    });
  }
  
  log('', 'INFO');
  log('【警告项】', 'REPORT');
  if (results.warnings.length === 0) {
    log('无', 'INFO');
  } else {
    results.warnings.forEach((item, index) => {
      log(`${index + 1}. ${item}`, 'WARNING');
    });
  }
  
  log('', 'INFO');
  log('【测试统计】', 'REPORT');
  log(`成功: ${results.success.length}`, 'INFO');
  log(`失败: ${results.failed.length}`, 'INFO');
  log(`警告: ${results.warnings.length}`, 'INFO');
  log(`总测试: ${results.success.length + results.failed.length + results.warnings.length}`, 'INFO');
  
  log('', 'INFO');
  log('【建议修复点】', 'REPORT');
  
  if (results.failed.length > 0) {
    log('1. 优先修复所有失败项', 'WARNING');
    log('2. 检查API Key配置是否正确', 'WARNING');
    log('3. 检查后端服务是否正常运行', 'WARNING');
  }
  
  if (results.warnings.length > 0) {
    log('4. 关注警告项，确保资源URL可访问', 'WARNING');
    log('5. 检查响应格式是否符合预期', 'WARNING');
  }
  
  log('', 'INFO');
  log('【测试完成】', 'REPORT');
}

async function runAllTests() {
  log('=== 端到端自动化测试开始 ===', 'TEST');
  log(`测试时间: ${new Date().toLocaleString('zh-CN')}`, 'INFO');
  log(`前端地址: ${BASE_URL}`, 'INFO');
  log(`火山方舟API: ${ARK_BASE_URL}`, 'INFO');
  log('', 'INFO');
  
  await testFrontendLoad();
  await testTextToImage();
  await testTextToVideo();
  await testImageToVideo();
  await testApiKeyValidation();
  await testAllEndpoints();
  await testResourceValidity();
  await testServerLogs();
  
  generateReport();
}

runAllTests().catch(error => {
  log(`测试异常: ${error.message}`, 'ERROR');
  results.failed.push(`测试异常: ${error.message}`);
  generateReport();
});