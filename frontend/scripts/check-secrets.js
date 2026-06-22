#!/usr/bin/env node
/**
 * 敏感信息泄露检查脚本
 * 在部署前检查代码中是否存在明文 Token、API Key 等敏感信息
 * 
 * 使用方式：
 *   node scripts/check-secrets.js
 * 
 * 退出码：
 *   0 - 无敏感信息泄露
 *   1 - 发现敏感信息泄露
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 要扫描的目录
  scanDirs: ['src', 'monitoring', 'scripts'],
  
  // 要扫描的文件扩展名
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.env.example'],
  
  // 排除的目录
  excludeDirs: ['node_modules', '.next', 'dist', 'build', 'coverage', '.git'],
  
  // 排除的文件
  excludeFiles: ['check-secrets.js', 'package-lock.json'],
  
  // 敏感信息正则模式
  patterns: [
    // 钉钉 Token (64位十六进制)
    {
      name: '钉钉 Robot Token',
      pattern: /access_token=[a-f0-9]{64}/gi,
      severity: 'critical'
    },
    {
      name: '钉钉 Token 变量',
      pattern: /DINGDING_ROBOT_TOKEN\s*=\s*['"][a-f0-9]{40,}['"]/gi,
      severity: 'critical'
    },
    
    // 腾讯混元 API Key
    {
      name: '腾讯混元 API Key',
      pattern: /sk-[A-Za-z0-9]{32,}/g,
      severity: 'critical'
    },
    {
      name: 'HUNYUAN_API_KEY',
      pattern: /HUNYUAN_API_KEY\s*=\s*['"]sk-[^'"]+['"]/gi,
      severity: 'critical'
    },
    
    // 可灵 AI Key
    {
      name: '可灵 API Key',
      pattern: /KLING_API_KEY\s*=\s*['"][A-Za-z0-9]{20,}['"]/gi,
      severity: 'critical'
    },
    {
      name: '可灵 Secret Key',
      pattern: /KLING_SECRET_KEY\s*=\s*['"][A-Za-z0-9]{20,}['"]/gi,
      severity: 'critical'
    },
    
    // 通用 API Key 模式
    {
      name: '通用 API Key',
      pattern: /api[_-]?key\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
      severity: 'high'
    },
    
    // AWS Key
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical'
    },
    
    // 私钥
    {
      name: 'RSA 私钥',
      pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
      severity: 'critical'
    },
    
    // 密码
    {
      name: '密码字段',
      pattern: /password\s*=\s*['"][^'"]{8,}['"]/gi,
      severity: 'high'
    },
    
    // 数据库连接字符串
    {
      name: '数据库连接字符串',
      pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi,
      severity: 'critical'
    },
    {
      name: 'MySQL 连接字符串',
      pattern: /mysql:\/\/[^:]+:[^@]+@/gi,
      severity: 'critical'
    },
    
    // JWT Secret
    {
      name: 'JWT Secret',
      pattern: /jwt[_-]?secret\s*=\s*['"][^'"]{16,}['"]/gi,
      severity: 'high'
    }
  ],
  
  // 允许的占位符
  allowedPlaceholders: [
    'your-token-here',
    'your-api-key-here',
    'your-secret-here',
    'your-dingding-robot-token-here',
    'sk-your-key',
    'xxx',
    'placeholder',
    'example'
  ]
};

// 扫描结果
const results = {
  totalFiles: 0,
  scannedFiles: 0,
  issues: [],
  warnings: []
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查是否为允许的占位符
function isAllowedPlaceholder(match) {
  const lowerMatch = match.toLowerCase();
  return CONFIG.allowedPlaceholders.some(placeholder => 
    lowerMatch.includes(placeholder.toLowerCase())
  );
}

// 扫描单个文件
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    CONFIG.patterns.forEach(({ name, pattern, severity }) => {
      lines.forEach((line, lineIndex) => {
        const matches = line.match(pattern);
        
        if (matches) {
          matches.forEach(match => {
            // 检查是否为允许的占位符
            if (isAllowedPlaceholder(match)) {
              return;
            }
            
            results.issues.push({
              file: filePath,
              line: lineIndex + 1,
              type: name,
              severity,
              match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
              context: line.trim().substring(0, 100)
            });
          });
        }
      });
    });
    
    results.scannedFiles++;
  } catch (error) {
    results.warnings.push(`无法读取文件: ${filePath}`);
  }
}

// 递归扫描目录
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    results.warnings.push(`目录不存在: ${dirPath}`);
    return;
  }
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // 排除特定目录
      if (CONFIG.excludeDirs.includes(item)) {
        return;
      }
      scanDirectory(itemPath);
    } else if (stat.isFile()) {
      results.totalFiles++;
      
      // 检查文件扩展名
      const ext = path.extname(item);
      if (!CONFIG.extensions.includes(ext)) {
        return;
      }
      
      // 排除特定文件
      if (CONFIG.excludeFiles.includes(item)) {
        return;
      }
      
      scanFile(itemPath);
    }
  });
}

// 打印报告
function printReport() {
  console.log('\n' + '='.repeat(60));
  colorLog('cyan', '  敏感信息泄露检查报告');
  console.log('='.repeat(60));
  
  // 统计信息
  console.log('\n【扫描统计】');
  console.log(`  扫描目录: ${CONFIG.scanDirs.join(', ')}`);
  console.log(`  总文件数: ${results.totalFiles}`);
  console.log(`  已扫描: ${results.scannedFiles}`);
  
  // 警告信息
  if (results.warnings.length > 0) {
    console.log('\n【警告】');
    results.warnings.forEach(warning => {
      colorLog('yellow', `  ⚠️  ${warning}`);
    });
  }
  
  // 问题详情
  if (results.issues.length === 0) {
    console.log('\n' + '='.repeat(60));
    colorLog('green', '  ✅ 未发现敏感信息泄露');
    console.log('='.repeat(60) + '\n');
    return 0;
  }
  
  console.log('\n' + '='.repeat(60));
  colorLog('red', `  ❌ 发现 ${results.issues.length} 个敏感信息泄露问题`);
  console.log('='.repeat(60));
  
  // 按严重程度分组
  const critical = results.issues.filter(i => i.severity === 'critical');
  const high = results.issues.filter(i => i.severity === 'high');
  const others = results.issues.filter(i => !['critical', 'high'].includes(i.severity));
  
  if (critical.length > 0) {
    console.log('\n【🚨 CRITICAL - 严重】');
    critical.forEach((issue, index) => {
      console.log(`\n  ${index + 1}. ${issue.type}`);
      console.log(`     文件: ${issue.file}:${issue.line}`);
      console.log(`     匹配: ${issue.match}`);
    });
  }
  
  if (high.length > 0) {
    console.log('\n【⚠️  HIGH - 高危】');
    high.forEach((issue, index) => {
      console.log(`\n  ${index + 1}. ${issue.type}`);
      console.log(`     文件: ${issue.file}:${issue.line}`);
      console.log(`     匹配: ${issue.match}`);
    });
  }
  
  if (others.length > 0) {
    console.log('\n【⚠️  MEDIUM/LOW - 中低危】');
    others.forEach((issue, index) => {
      console.log(`\n  ${index + 1}. ${issue.type}`);
      console.log(`     文件: ${issue.file}:${issue.line}`);
    });
  }
  
  // 修复建议
  console.log('\n' + '-'.repeat(60));
  console.log('【修复建议】');
  console.log('  1. 将敏感信息移至 .env 文件（已在 .gitignore 中排除）');
  console.log('  2. 使用环境变量: process.env.YOUR_TOKEN');
  console.log('  3. 文档中使用占位符: your-token-here');
  console.log('  4. 如已提交到远程仓库，请立即轮换 Token');
  console.log('-'.repeat(60) + '\n');
  
  return 1;
}

// 主函数
function main() {
  colorLog('blue', '\n🔍 开始扫描敏感信息...\n');
  
  const rootDir = process.cwd();
  
  // 扫描配置的目录
  CONFIG.scanDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    scanDirectory(dirPath);
  });
  
  // 扫描根目录的配置文件
  const rootFiles = ['.env.example', '.env.local.example'];
  rootFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      results.totalFiles++;
      scanFile(filePath);
    }
  });
  
  // 打印报告并返回退出码
  const exitCode = printReport();
  process.exit(exitCode);
}

// 运行
main();
