/**
 * V2.0 全系统验收测试 - 全链路功能测试
 * 模拟用户从0到1的完整使用流程
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_RESULTS = [];
let authToken = null;
let testUserId = null;
let testEmail = null; // 保存注册时的邮箱

// 日志记录
function log(step, status, message, data = null) {
  const result = {
    step,
    status,
    message,
    timestamp: new Date().toISOString(),
    data
  };
  TEST_RESULTS.push(result);
  console.log(`[${status}] Step ${step}: ${message}`);
  if (data) console.log('  Data:', JSON.stringify(data, null, 2));
}

// API请求封装
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

// 等待函数
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 测试步骤 ====================

async function testUserRegistration() {
  log(1, 'RUNNING', '用户注册测试');
  
  const timestamp = Date.now();
  testEmail = `test_${timestamp}@example.com`; // 保存到全局变量
  const testData = {
    email: testEmail,
    password: 'Test@123456',
    nickname: `测试用户_${timestamp}`,
    captcha: '123456' // 模拟验证码
  };

  const result = await apiRequest('/api/v1/users/register', {
    method: 'POST',
    body: JSON.stringify(testData)
  });

  if (result.ok && result.data.success) {
    authToken = result.data.data?.token;
    testUserId = result.data.data?.user?.id;
    log(1, 'PASS', `用户注册成功: ${testEmail}`, { userId: testUserId });
    return true;
  } else {
    log(1, 'FAIL', `用户注册失败: ${result.data?.message || result.error}`, result.data);
    return false;
  }
}

async function testUserLogin() {
  log(2, 'RUNNING', '用户登录测试');
  
  const result = await apiRequest('/api/v1/users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail, // 使用之前注册的邮箱
      password: 'Test@123456'
    })
  });

  if (result.ok) {
    authToken = result.data.data?.accessToken; // 注意字段名是accessToken
    log(2, 'PASS', '用户登录成功', { hasToken: !!authToken });
    return true;
  } else {
    log(2, 'FAIL', `登录失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testGetUserProfile() {
  log(3, 'RUNNING', '获取用户信息测试');
  
  const result = await apiRequest('/api/v1/users/me');
  
  if (result.ok && result.data.success) {
    log(3, 'PASS', '获取用户信息成功', result.data.data);
    return true;
  } else {
    log(3, 'FAIL', `获取用户信息失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testMembershipConfig() {
  log(4, 'RUNNING', '获取会员配置测试');
  
  const result = await apiRequest('/api/v1/membership/config');
  
  if (result.ok && result.data.success) {
    const config = result.data.data;
    const hasRequiredLevels = config.free && config.pro && config.studio;
    if (hasRequiredLevels) {
      log(4, 'PASS', '会员配置获取成功', {
        free: config.free.name,
        pro: config.pro.name,
        studio: config.studio.name
      });
      return true;
    } else {
      log(4, 'FAIL', '会员配置不完整', config);
      return false;
    }
  } else {
    log(4, 'FAIL', `会员配置获取失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testStoryboardGeneration() {
  log(5, 'RUNNING', 'AI分镜生成测试');
  
  const requestData = {
    prompt: '一个人走在城市街道上，阳光明媚',
    sceneConfig: {
      setting: '城市街道',
      timeOfDay: '早晨',
      mood: '平静'
    },
    shotCount: 5,
    targetDuration: 30,
    style: 'cinematic',
    quality: 'medium'
  };

  const result = await apiRequest('/api/v1/storyboard/generate', {
    method: 'POST',
    body: JSON.stringify(requestData)
  });

  if (result.ok && result.data.success) {
    const storyboard = result.data.data;
    const hasShots = storyboard.shots && storyboard.shots.length > 0;
    log(5, 'PASS', '分镜生成成功', {
      shotCount: storyboard.shots?.length || 0,
      totalDuration: storyboard.totalDuration
    });
    return storyboard;
  } else {
    log(5, 'FAIL', `分镜生成失败: ${result.data?.message}`, result.data);
    return null;
  }
}

async function testStoryboardConfig() {
  log(6, 'RUNNING', '分镜配置查询测试');
  
  const result = await apiRequest('/api/v1/storyboard/config?type=shotTypes');
  
  if (result.ok && result.data.success) {
    const shotTypes = result.data.data;
    log(6, 'PASS', '分镜配置查询成功', { shotTypes: shotTypes.length });
    return true;
  } else {
    log(6, 'FAIL', `分镜配置查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testVideoGeneration(storyboardId) {
  log(7, 'RUNNING', '视频生成任务测试');
  
  const requestData = {
    storyboardId: storyboardId || 'test_storyboard_123',
    quality: '720p',
    fps: 30,
    aspectRatio: '16:9',
    audioEnabled: true
  };

  const result = await apiRequest('/api/v1/video/generate', {
    method: 'POST',
    body: JSON.stringify(requestData)
  });

  if (result.ok && result.data.success) {
    const task = result.data.data;
    log(7, 'PASS', '视频生成任务创建成功', {
      taskId: task.id,
      status: task.status
    });
    return task;
  } else {
    log(7, 'FAIL', `视频生成任务创建失败: ${result.data?.message}`, result.data);
    return null;
  }
}

async function testVideoTaskStatus(taskId) {
  log(8, 'RUNNING', '视频任务状态查询测试');
  
  const result = await apiRequest(`/api/v1/video/task/${taskId}`);
  
  if (result.ok && result.data.success) {
    const task = result.data.data;
    log(8, 'PASS', '视频任务状态查询成功', {
      taskId: task.id,
      status: task.status
    });
    return true;
  } else {
    log(8, 'FAIL', `视频任务状态查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testVideoQueueStatus() {
  log(9, 'RUNNING', '视频队列状态查询测试');
  
  const result = await apiRequest('/api/v1/video/queue');
  
  if (result.ok && result.data.success) {
    const queue = result.data.data;
    log(9, 'PASS', '视频队列状态查询成功', queue);
    return true;
  } else {
    log(9, 'FAIL', `视频队列状态查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

let testWorkId = null; // 保存创建的作品ID

async function testWorkCreation() {
  log(10, 'RUNNING', '作品创建测试');
  
  const workData = {
    title: `测试作品_${Date.now()}`,
    description: '这是一个测试作品',
    thumbnail: 'https://example.com/thumb.jpg',
    videoUrl: 'https://example.com/video.mp4', // 添加videoUrl使状态为completed
    tags: ['测试', '样例'],
    visibility: 'public'
  };

  const result = await apiRequest('/api/v1/works', {
    method: 'POST',
    body: JSON.stringify(workData)
  });

  if (result.ok && result.data.success) {
    const work = result.data.data;
    testWorkId = work.id; // 保存作品ID
    log(10, 'PASS', '作品创建成功', {
      workId: work.id,
      title: work.title
    });
    return work;
  } else {
    log(10, 'FAIL', `作品创建失败: ${result.data?.message}`, result.data);
    return null;
  }
}

async function testWorkList() {
  log(11, 'RUNNING', '作品列表查询测试');
  
  const result = await apiRequest('/api/v1/works?page=1&limit=10');
  
  if (result.ok && result.data.success) {
    const works = result.data.data;
    log(11, 'PASS', '作品列表查询成功', {
      count: works.length || 0
    });
    return true;
  } else {
    log(11, 'FAIL', `作品列表查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testWorkSquare() {
  log(12, 'RUNNING', '作品广场查询测试');
  
  // GET /api/v1/works 返回公开作品列表
  const result = await apiRequest('/api/v1/works?page=1&limit=20');
  
  if (result.ok && result.data.success) {
    const data = result.data.data;
    log(12, 'PASS', '作品广场查询成功', {
      count: data.works?.length || 0
    });
    return true;
  } else {
    log(12, 'FAIL', `作品广场查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testTemplateList() {
  log(13, 'RUNNING', '模板列表查询测试');
  
  const result = await apiRequest('/api/v1/templates');
  
  if (result.ok && result.data.success) {
    const templates = result.data.data;
    log(13, 'PASS', '模板列表查询成功', {
      count: templates.length || 0
    });
    return true;
  } else {
    log(13, 'FAIL', `模板列表查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testAvailableTemplates() {
  log(14, 'RUNNING', '用户可用模板查询测试');
  
  const result = await apiRequest('/api/v1/templates/available');
  
  if (result.ok && result.data.success) {
    const templates = result.data.data;
    log(14, 'PASS', '用户可用模板查询成功', {
      count: templates.length || 0
    });
    return true;
  } else {
    log(14, 'FAIL', `用户可用模板查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testAnalyticsDashboard() {
  log(15, 'RUNNING', '数据分析仪表盘测试');
  
  const result = await apiRequest('/api/v1/analytics/dashboard?timeRange=week');
  
  if (result.ok && result.data.success) {
    const dashboard = result.data.data;
    log(15, 'PASS', '数据分析仪表盘查询成功', {
      hasUsers: !!dashboard.users,
      hasGeneration: !!dashboard.generation,
      hasRevenue: !!dashboard.revenue,
      hasSystem: !!dashboard.system
    });
    return true;
  } else {
    log(15, 'FAIL', `数据分析仪表盘查询失败: ${result.data?.message}`, result.data);
    return false;
  }
}

async function testUnauthenticatedAccess() {
  log(16, 'RUNNING', '未授权访问测试');
  
  // 临时清除token
  const savedToken = authToken;
  authToken = null;
  
  const result = await apiRequest('/api/v1/users/me');
  
  // 恢复token
  authToken = savedToken;
  
  if (!result.ok && result.status === 401) {
    log(16, 'PASS', '未授权访问被正确拒绝');
    return true;
  } else {
    log(16, 'FAIL', `未授权访问未被拒绝: ${result.status}`, result.data);
    return false;
  }
}

// ==================== 主测试流程 ====================

async function runFullChainTest() {
  console.log('========================================');
  console.log('  V2.0 全链路功能测试开始');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // 1. 用户注册
  if (await testUserRegistration()) passed++; else failed++;

  // 2. 用户登录
  if (await testUserLogin()) passed++; else failed++;

  // 3. 获取用户信息
  if (await testGetUserProfile()) passed++; else failed++;

  // 4. 会员配置
  if (await testMembershipConfig()) passed++; else failed++;

  // 5. AI分镜生成
  const storyboard = await testStoryboardGeneration();
  if (storyboard) passed++; else failed++;

  // 6. 分镜配置
  if (await testStoryboardConfig()) passed++; else failed++;

  // 7. 视频生成
  const videoTask = await testVideoGeneration(storyboard?.id);
  if (videoTask) passed++; else failed++;

  // 8. 视频任务状态
  if (videoTask && await testVideoTaskStatus(videoTask.id)) passed++; else failed++;

  // 9. 视频队列状态
  if (await testVideoQueueStatus()) passed++; else failed++;

  // 10. 作品创建
  const work = await testWorkCreation();
  if (work) passed++; else failed++;

  // 11. 作品列表
  if (await testWorkList()) passed++; else failed++;

  // 12. 作品广场
  if (await testWorkSquare()) passed++; else failed++;

  // 13. 模板列表
  if (await testTemplateList()) passed++; else failed++;

  // 14. 可用模板
  if (await testAvailableTemplates()) passed++; else failed++;

  // 15. 数据分析
  if (await testAnalyticsDashboard()) passed++; else failed++;

  // 16. 未授权访问
  if (await testUnauthenticatedAccess()) passed++; else failed++;

  console.log('\n========================================');
  console.log('  全链路功能测试完成');
  console.log('========================================');
  console.log(`  通过: ${passed}/${passed + failed}`);
  console.log(`  失败: ${failed}/${passed + failed}`);
  console.log(`  成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  return { passed, failed, results: TEST_RESULTS };
}

// 导出结果
module.exports = { runFullChainTest, TEST_RESULTS };

// 如果直接运行
if (require.main === module) {
  runFullChainTest().then(result => {
    console.log('\n测试结果摘要:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}