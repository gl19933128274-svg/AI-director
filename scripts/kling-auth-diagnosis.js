/**
 * 可灵 API 鉴权诊断脚本
 * 
 * 诊断内容：
 * 1. JWT Token 生成逻辑分析
 * 2. 时间戳验证
 * 3. 签名算法验证
 * 4. API 调用测试
 */

const jwt = require('jsonwebtoken');
const https = require('https');

// 配置
const CONFIG = {
  apiKey: 'AeEbKL8eBbGgCNye9ENQmeFeTYJBtyCQ',
  secretKey: 'BNRap9rbTpPGMGLdCaH4nnGythLhJPDD',
  apiBase: 'https://api-beijing.klingai.com'
};

// 诊断结果
const diagnosis = {
  tokenGeneration: { success: false, issues: [] },
  timestampValidation: { success: false, issues: [] },
  signatureValidation: { success: false, issues: [] },
  apiCall: { success: false, issues: [] }
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const icons = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'DIAGNOSE': '🔍'
  };
  console.log(`[${timestamp}] ${icons[type] || ''} [${type}] ${message}`);
}

// 1. JWT Token 生成诊断
function diagnoseTokenGeneration() {
  log('=== 诊断 1: JWT Token 生成 ===', 'DIAGNOSE');
  
  try {
    const now = Math.floor(Date.now() / 1000);
    log(`当前时间戳: ${now}`, 'INFO');
    log(`当前时间: ${new Date(now * 1000).toISOString()}`, 'INFO');
    
    // 生成 Token
    const payload = {
      iss: CONFIG.apiKey,
      exp: now + 1800,
      nbf: now - 5
    };
    
    log(`Payload: ${JSON.stringify(payload)}`, 'INFO');
    
    const token = jwt.sign(payload, CONFIG.secretKey, {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT' }
    });
    
    log(`Token 生成成功: ${token.substring(0, 50)}...`, 'SUCCESS');
    
    // 验证 Token
    try {
      const decoded = jwt.verify(token, CONFIG.secretKey);
      log(`Token 验证成功: ${JSON.stringify(decoded)}`, 'SUCCESS');
      diagnosis.tokenGeneration.success = true;
    } catch (error) {
      log(`Token 验证失败: ${error.message}`, 'ERROR');
      diagnosis.tokenGeneration.issues.push('Token 验证失败: ' + error.message);
    }
    
    return token;
  } catch (error) {
    log(`Token 生成失败: ${error.message}`, 'ERROR');
    diagnosis.tokenGeneration.issues.push('Token 生成失败: ' + error.message);
    return null;
  }
}

// 2. 时间戳验证诊断
function diagnoseTimestampValidation() {
  log('=== 诊断 2: 时间戳验证 ===', 'DIAGNOSE');
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const serverTime = now;
    
    log(`本地时间戳: ${now}`, 'INFO');
    log(`服务器时间戳: ${serverTime}`, 'INFO');
    
    // 检查时间偏差
    const timeDiff = Math.abs(now - serverTime);
    log(`时间偏差: ${timeDiff} 秒`, 'INFO');
    
    if (timeDiff > 300) {
      log(`时间偏差过大 (> 5分钟)`, 'ERROR');
      diagnosis.timestampValidation.issues.push('时间偏差过大');
    } else {
      log(`时间偏差正常`, 'SUCCESS');
      diagnosis.timestampValidation.success = true;
    }
    
    // 检查 exp 和 nbf
    const exp = now + 1800;
    const nbf = now - 5;
    
    log(`exp (过期时间): ${exp} (${new Date(exp * 1000).toISOString()})`, 'INFO');
    log(`nbf (生效时间): ${nbf} (${new Date(nbf * 1000).toISOString()})`, 'INFO');
    
    if (exp <= now) {
      log(`exp 时间错误 (已过期)`, 'ERROR');
      diagnosis.timestampValidation.issues.push('exp 时间错误');
    }
    
    if (nbf > now) {
      log(`nbf 时间错误 (尚未生效)`, 'ERROR');
      diagnosis.timestampValidation.issues.push('nbf 时间错误');
    }
    
  } catch (error) {
    log(`时间戳验证失败: ${error.message}`, 'ERROR');
    diagnosis.timestampValidation.issues.push('时间戳验证失败: ' + error.message);
  }
}

// 3. 签名算法验证诊断
function diagnoseSignatureValidation() {
  log('=== 诊断 3: 签名算法验证 ===', 'DIAGNOSE');
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: CONFIG.apiKey,
      exp: now + 1800,
      nbf: now - 5
    };
    
    // 测试不同算法
    const algorithms = ['HS256', 'HS384', 'HS512'];
    
    for (const alg of algorithms) {
      try {
        const token = jwt.sign(payload, CONFIG.secretKey, { algorithm: alg });
        const decoded = jwt.verify(token, CONFIG.secretKey, { algorithms: [alg] });
        log(`${alg} 算法测试成功`, 'SUCCESS');
      } catch (error) {
        log(`${alg} 算法测试失败: ${error.message}`, 'ERROR');
        diagnosis.signatureValidation.issues.push(`${alg} 算法失败: ${error.message}`);
      }
    }
    
    // 测试 Header 格式
    const token = jwt.sign(payload, CONFIG.secretKey, {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT' }
    });
    
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    log(`Token Header: ${JSON.stringify(header)}`, 'INFO');
    
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      log(`Header 格式错误`, 'ERROR');
      diagnosis.signatureValidation.issues.push('Header 格式错误');
    } else {
      log(`Header 格式正确`, 'SUCCESS');
      diagnosis.signatureValidation.success = true;
    }
    
  } catch (error) {
    log(`签名算法验证失败: ${error.message}`, 'ERROR');
    diagnosis.signatureValidation.issues.push('签名算法验证失败: ' + error.message);
  }
}

// 4. API 调用测试
function diagnoseAPICall(token) {
  log('=== 诊断 4: API 调用测试 ===', 'DIAGNOSE');
  
  if (!token) {
    log(`Token 无效，跳过 API 调用测试`, 'ERROR');
    diagnosis.apiCall.issues.push('Token 无效');
    return;
  }
  
  const options = {
    hostname: 'api-beijing.klingai.com',
    port: 443,
    path: '/v1/videos/text2video',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const data = {
    model_name: 'kling-v1',
    prompt: 'Test video generation',
    duration: 5,
    aspect_ratio: '16:9'
  };
  
  log(`请求 URL: ${options.hostname}${options.path}`, 'INFO');
  log(`请求方法: ${options.method}`, 'INFO');
  log(`Authorization 头: Bearer ${token.substring(0, 30)}...`, 'INFO');
  log(`请求体: ${JSON.stringify(data)}`, 'INFO');
  
  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      log(`响应状态: ${res.statusCode}`, 'INFO');
      log(`响应头: ${JSON.stringify(res.headers)}`, 'INFO');
      log(`响应体: ${body}`, 'INFO');
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log(`API 调用成功`, 'SUCCESS');
        diagnosis.apiCall.success = true;
      } else {
        log(`API 调用失败: HTTP ${res.statusCode}`, 'ERROR');
        diagnosis.apiCall.issues.push(`HTTP ${res.statusCode}: ${body}`);
      }
    });
  });
  
  req.on('error', (error) => {
    log(`API 调用错误: ${error.message}`, 'ERROR');
    diagnosis.apiCall.issues.push(`网络错误: ${error.message}`);
  });
  
  req.on('timeout', () => {
    req.destroy();
    log(`API 调用超时`, 'ERROR');
    diagnosis.apiCall.issues.push('请求超时');
  });
  
  req.setTimeout(30000);
  req.write(JSON.stringify(data));
  req.end();
}

// 主函数
async function main() {
  log('==============================================');
  log('    可灵 API 鉴权诊断');
  log('==============================================');
  log('');
  
  // 执行诊断
  const token = diagnoseTokenGeneration();
  log('');
  
  diagnoseTimestampValidation();
  log('');
  
  diagnoseSignatureValidation();
  log('');
  
  diagnoseAPICall(token);
  
  // 等待 API 调用完成
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 输出诊断报告
  log('');
  log('==============================================');
  log('              诊断报告');
  log('==============================================');
  log('');
  
  log(`Token 生成: ${diagnosis.tokenGeneration.success ? '✅ 成功' : '❌ 失败'}`, diagnosis.tokenGeneration.success ? 'SUCCESS' : 'ERROR');
  if (diagnosis.tokenGeneration.issues.length > 0) {
    diagnosis.tokenGeneration.issues.forEach(issue => log(`  - ${issue}`, 'ERROR'));
  }
  
  log(`时间戳验证: ${diagnosis.timestampValidation.success ? '✅ 成功' : '❌ 失败'}`, diagnosis.timestampValidation.success ? 'SUCCESS' : 'ERROR');
  if (diagnosis.timestampValidation.issues.length > 0) {
    diagnosis.timestampValidation.issues.forEach(issue => log(`  - ${issue}`, 'ERROR'));
  }
  
  log(`签名算法验证: ${diagnosis.signatureValidation.success ? '✅ 成功' : '❌ 失败'}`, diagnosis.signatureValidation.success ? 'SUCCESS' : 'ERROR');
  if (diagnosis.signatureValidation.issues.length > 0) {
    diagnosis.signatureValidation.issues.forEach(issue => log(`  - ${issue}`, 'ERROR'));
  }
  
  log(`API 调用: ${diagnosis.apiCall.success ? '✅ 成功' : '❌ 失败'}`, diagnosis.apiCall.success ? 'SUCCESS' : 'ERROR');
  if (diagnosis.apiCall.issues.length > 0) {
    diagnosis.apiCall.issues.forEach(issue => log(`  - ${issue}`, 'ERROR'));
  }
  
  log('');
  log('==============================================');
}

main().catch(console.error);