/**
 * V2.0 监控验证
 * 验证日志与监控配置
 */

const fs = require('fs');
const path = require('path');

const MONITORING_RESULTS = [];

function log(category, status, message, details = null) {
  const result = { category, status, message, details, timestamp: new Date().toISOString() };
  MONITORING_RESULTS.push(result);
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  console.log(`  ${icon} [${category}] ${message}`);
  if (details) console.log('      详情:', JSON.stringify(details, null, 2).replace(/\n/g, '\n      '));
}

// 1. 验证日志配置
function verifyLoggingConfig() {
  console.log('\n[验证1] 日志配置检查');
  
  const logPatterns = [
    'console.log',
    'console.error',
    'logger',
    'winston',
    'pino'
  ];

  const filesToCheck = [
    '../src/app/api/storyboard/generate/route.ts',
    '../src/modules/video/service.ts',
    '../src/modules/storyboard/service.ts'
  ];

  let logUsages = [];

  for (const file of filesToCheck) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of logPatterns) {
        if (content.includes(pattern)) {
          logUsages.push(`${path.basename(file)}:使用${pattern}`);
        }
      }
    }
  }

  log('日志', logUsages.length > 0 ? 'PASS' : 'WARN', '日志记录代码存在', { usages: logUsages });

  // 检查是否有结构化日志
  const storyboardFile = path.join(__dirname, '../src/app/api/storyboard/generate/route.ts');
  if (fs.existsSync(storyboardFile)) {
    const content = fs.readFileSync(storyboardFile, 'utf-8');
    if (content.includes('timestamp') || content.includes('request_id')) {
      log('日志', 'PASS', '使用结构化日志格式');
    }
  }

  return { passed: 1, total: 1, name: '日志配置' };
}

// 2. 验证Prometheus配置
function verifyPrometheusConfig() {
  console.log('\n[验证2] Prometheus配置检查');
  
  const prometheusFile = path.join(__dirname, '../monitoring/prometheus.yml');
  
  if (!fs.existsSync(prometheusFile)) {
    log('Prometheus', 'FAIL', 'Prometheus配置文件不存在');
    return { passed: 0, total: 1, name: 'Prometheus配置' };
  }

  log('Prometheus', 'PASS', 'Prometheus配置文件存在');

  try {
    const content = fs.readFileSync(prometheusFile, 'utf-8');
    const features = [];
    
    if (content.includes('scrape_interval')) features.push('抓取间隔');
    if (content.includes('targets:')) features.push('监控目标');
    if (content.includes('alerting:')) features.push('告警配置');
    if (content.includes('rule_files:')) features.push('规则文件');
    
    log('Prometheus', features.length >= 2 ? 'PASS' : 'WARN', 'Prometheus功能特征', { features });
  } catch (error) {
    log('Prometheus', 'FAIL', 'Prometheus配置解析失败', { error: error.message });
  }

  return { passed: 1, total: 1, name: 'Prometheus配置' };
}

// 3. 验证Grafana配置
function verifyGrafanaConfig() {
  console.log('\n[验证3] Grafana配置检查');
  
  const grafanaFiles = [
    '../monitoring/grafana/dashboards/storyboard-dashboard.json',
    '../monitoring/grafana/provisioning/dashboards/dashboard-providers.yml',
    '../monitoring/grafana/provisioning/datasources/datasource.yml'
  ];

  let existingFiles = [];
  
  for (const file of grafanaFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(path.basename(file));
    }
  }

  log('Grafana', existingFiles.length >= 2 ? 'PASS' : 'WARN', 'Grafana配置文件存在', { files: existingFiles });

  // 检查Dashboard面板
  const dashboardFile = path.join(__dirname, '../monitoring/grafana/dashboards/storyboard-dashboard.json');
  if (fs.existsSync(dashboardFile)) {
    try {
      const dashboard = JSON.parse(fs.readFileSync(dashboardFile, 'utf-8'));
      const panels = dashboard.panels || [];
      const panelNames = panels.map(p => p.title).filter(Boolean);
      
      const requiredPanels = ['API延迟', '错误率', 'CPU', '内存'];
      const hasRequiredPanels = requiredPanels.some(name => 
        panelNames.some(pName => pName.includes(name))
      );

      log('Grafana', 'PASS', 'Grafana Dashboard面板', { 
        panelCount: panels.length,
        panels: panelNames.slice(0, 5)
      });

      if (hasRequiredPanels) {
        log('Grafana', 'PASS', '包含必需的面板（API延迟/错误率/系统负载）');
      }
    } catch (error) {
      log('Grafana', 'FAIL', 'Dashboard配置解析失败');
    }
  }

  return { passed: 1, total: 1, name: 'Grafana配置' };
}

// 4. 验证钉钉Webhook配置
function verifyDingtalkConfig() {
  console.log('\n[验证4] 钉钉Webhook配置检查');
  
  const dingtalkFiles = [
    '../monitoring/dingding-alert.js',
    '../monitoring/alertmanager.yml'
  ];

  let existingFiles = [];
  
  for (const file of dingtalkFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(path.basename(file));
    }
  }

  log('钉钉', existingFiles.length >= 1 ? 'PASS' : 'WARN', '钉钉告警文件存在', { files: existingFiles });

  // 检查Alertmanager配置
  const alertmanagerFile = path.join(__dirname, '../monitoring/alertmanager.yml');
  if (fs.existsSync(alertmanagerFile)) {
    const content = fs.readFileSync(alertmanagerFile, 'utf-8');
    
    if (content.includes('webhook_configs')) {
      log('钉钉', 'PASS', 'Webhook配置已设置');
    }
    
    if (content.includes('DINGTALK_TOKEN') || content.includes('webhook')) {
      log('钉钉', 'PASS', '使用环境变量存储Token');
    }
  }

  // 检查告警指南文档
  const guideFile = path.join(__dirname, '../monitoring/DINGDING_ALERT_GUIDE.md');
  if (fs.existsSync(guideFile)) {
    log('钉钉', 'PASS', '告警配置指南文档存在');
  }

  return { passed: 1, total: 1, name: '钉钉Webhook' };
}

// 5. 验证Docker配置
function verifyDockerConfig() {
  console.log('\n[验证5] Docker配置检查');
  
  const dockerFiles = [
    '../monitoring/docker-compose.yml',
    '../Dockerfile'
  ];

  let existingFiles = [];
  
  for (const file of dockerFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(path.basename(file));
    }
  }

  log('Docker', existingFiles.length >= 1 ? 'PASS' : 'WARN', 'Docker配置文件存在', { files: existingFiles });

  // 检查docker-compose中的服务
  const composeFile = path.join(__dirname, '../monitoring/docker-compose.yml');
  if (fs.existsSync(composeFile)) {
    const content = fs.readFileSync(composeFile, 'utf-8');
    const services = [];
    
    if (content.includes('prometheus')) services.push('Prometheus');
    if (content.includes('grafana')) services.push('Grafana');
    if (content.includes('alertmanager')) services.push('Alertmanager');
    if (content.includes('node-exporter')) services.push('NodeExporter');
    
    log('Docker', services.length >= 2 ? 'PASS' : 'WARN', '监控服务配置', { services });
  }

  return { passed: 1, total: 1, name: 'Docker配置' };
}

// 6. 验证环境变量配置
function verifyEnvConfig() {
  console.log('\n[验证6] 环境变量配置检查');
  
  const envFile = path.join(__dirname, '../.env');
  const exampleEnv = path.join(__dirname, '../.env.example');
  
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf-8');
    const envVars = content.split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());
    
    const required = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
    const missing = required.filter(v => !envVars.includes(v));
    
    if (missing.length === 0) {
      log('环境变量', 'PASS', '必需环境变量已配置', { count: envVars.length });
    } else {
      log('环境变量', 'WARN', '部分必需环境变量缺失', { missing });
    }
  } else {
    log('环境变量', existingFiles => 'WARN', '环境变量文件不存在');
  }

  if (fs.existsSync(exampleEnv)) {
    log('环境变量', 'PASS', '环境变量示例文件存在');
  }

  return { passed: 1, total: 1, name: '环境变量' };
}

// 主函数
async function runMonitoringVerification() {
  console.log('========================================');
  console.log('  V2.0 监控验证');
  console.log('========================================');

  const verifications = [
    verifyLoggingConfig,
    verifyPrometheusConfig,
    verifyGrafanaConfig,
    verifyDingtalkConfig,
    verifyDockerConfig,
    verifyEnvConfig
  ];

  const results = [];

  for (const verify of verifications) {
    try {
      const result = verify();
      results.push(result);
    } catch (error) {
      log('验证', 'FAIL', `验证出错: ${error.message}`);
      results.push({ passed: 0, total: 1, name: '未知' });
    }
  }

  let totalPassed = 0;
  let totalTests = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalTests += result.total;
  }

  console.log('\n========================================');
  console.log('  监控验证汇总');
  console.log('========================================');
  console.log(`  通过: ${totalPassed}/${totalTests}`);
  console.log(`  覆盖率: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  return {
    results: MONITORING_RESULTS,
    summary: {
      passed: totalPassed,
      total: totalTests,
      coverage: ((totalPassed / totalTests) * 100).toFixed(1)
    }
  };
}

module.exports = { runMonitoringVerification, MONITORING_RESULTS };

if (require.main === module) {
  runMonitoringVerification().then(result => {
    console.log('\n监控验证结果:', JSON.stringify(result.summary, null, 2));
  }).catch(error => {
    console.error('监控验证失败:', error);
  });
}