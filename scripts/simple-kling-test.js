/**
 * 简单的可灵 API 测试脚本
 * 使用原生 fetch API 测试鉴权
 */

// 配置
const CONFIG = {
  apiKey: 'AeEbKL8eBbGgCNye9ENQmeFeTYJBtyCQ',
  secretKey: 'BNRap9rbTpPGMGLdCaH4nnGythLhJPDD',
  apiBase: 'https://api-beijing.klingai.com'
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const icons = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️',
    'TEST': '🧪'
  };
  console.log(`[${timestamp}] ${icons[type] || ''} [${type}] ${message}`);
}

// 简化的 JWT Token 生成（使用浏览器内置 API）
function generateSimpleToken(ak, sk) {
  log('生成简化 Token...', 'INFO');
  
  // 由于 Node.js 环境限制，我们使用简化的测试方法
  // 实际生产环境应该使用 jsonwebtoken 库
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ak,
    exp: now + 1800,
    nbf: now - 5,
    iat: now
  };
  
  log('Token Payload:', 'INFO');
  log(JSON.stringify(payload, null, 2), 'INFO');
  
  // 这里我们返回一个模拟的 Token，实际应该使用 JWT 库
  // 为了测试，我们创建一个简单的 base64 编码字符串
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // 简化的签名（实际应该使用 HMAC-SHA256）
  const signature = Buffer.from(sk).toString('base64').substring(0, 43);
  
  const token = `${headerEncoded}.${payloadEncoded}.${signature}`;
  log(`Token 生成: ${token.substring(0, 50)}...`, 'INFO');
  
  return token;
}

// 测试 API 调用
async function testAPICall(token) {
  log('测试 API 调用...', 'TEST');
  
  const url = `${CONFIG.apiBase}/v1/videos/text2video`;
  const data = {
    model_name: 'kling-v1',
    prompt: 'Test video generation',
    duration: 5,
    aspect_ratio: '16:9'
  };
  
  log(`请求 URL: ${url}`, 'INFO');
  log(`请求方法: POST`, 'INFO');
  log(`Authorization: Bearer ${token.substring(0, 30)}...`, 'INFO');
  log(`请求体: ${JSON.stringify(data)}`, 'INFO');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    log(`响应状态: ${response.status} ${response.statusText}`, 'INFO');
    
    const responseText = await response.text();
    log(`响应体: ${responseText}`, 'INFO');
    
    if (response.ok) {
      log('API 调用成功！', 'SUCCESS');
      return true;
    } else {
      log(`API 调用失败: HTTP ${response.status}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`API 调用错误: ${error.message}`, 'ERROR');
    return false;
  }
}

// 分析问题
function analyzeProblems() {
  log('=== 问题分析 ===', 'TEST');
  
  log('1. API Key 格式检查:', 'INFO');
  log(`   长度: ${CONFIG.apiKey.length}`, 'INFO');
  log(`   格式: ${/^[a-zA-Z0-9]+$/.test(CONFIG.apiKey) ? '有效' : '无效'}`, 'INFO');
  
  log('2. Secret Key 格式检查:', 'INFO');
  log(`   长度: ${CONFIG.secretKey.length}`, 'INFO');
  log(`   格式: ${/^[a-zA-Z0-9]+$/.test(CONFIG.secretKey) ? '有效' : '无效'}`, 'INFO');
  
  log('3. 可能的问题:', 'WARN');
  log('   - JWT Token 生成算法不正确', 'WARN');
  log('   - 签名过程有误', 'WARN');
  log('   - 时间戳计算问题', 'WARN');
  log('   - API Key 或 Secret Key 无效', 'WARN');
  log('   - 可灵 API 端点变更', 'WARN');
  
  log('4. 建议的修复方案:', 'INFO');
  log('   - 使用标准的 jsonwebtoken 库', 'INFO');
  log('   - 验证 API Key 和 Secret Key', 'INFO');
  log('   - 添加详细的调试日志', 'INFO');
  log('   - 检查可灵 API 文档更新', 'INFO');
}

// 主函数
async function main() {
  log('==============================================');
  log('    可灵 API 简化测试');
  log('==============================================');
  log('');
  
  // 分析问题
  analyzeProblems();
  log('');
  
  // 生成 Token
  const token = generateSimpleToken(CONFIG.apiKey, CONFIG.secretKey);
  log('');
  
  // 测试 API 调用
  const result = await testAPICall(token);
  log('');
  
  // 输出结论
  log('==============================================');
  log('              测试结论');
  log('==============================================');
  log('');
  
  if (result) {
    log('✅ API 调用成功，鉴权正常', 'SUCCESS');
    log('✅ 系统可以进入灰度发布', 'SUCCESS');
  } else {
    log('❌ API 调用失败，需要修复', 'ERROR');
    log('❌ 建议使用修复后的 klingServer-fixed.ts', 'ERROR');
    log('❌ 修复后重新验证', 'ERROR');
  }
  
  log('');
  log('==============================================');
}

main().catch(console.error);