#!/usr/bin/env node
/**
 * Pre-commit Hook - 敏感信息检查
 * 在 git commit 前自动运行，阻止包含敏感信息的代码提交
 * 
 * 安装方式：
 *   1. npm install husky --save-dev
 *   2. npx husky install
 *   3. npx husky add .husky/pre-commit "node scripts/pre-commit-check.js"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  // 钉钉 Token
  /access_token=[a-f0-9]{64}/gi,
  /DINGDING_ROBOT_TOKEN\s*=\s*['"][a-f0-9]{40,}['"]/gi,
  
  // 腾讯混元
  /sk-[A-Za-z0-9]{32,}/g,
  /HUNYUAN_API_KEY\s*=\s*['"]sk-[^'"]+['"]/gi,
  
  // 可灵 AI
  /KLING_API_KEY\s*=\s*['"][A-Za-z0-9]{20,}['"]/gi,
  /KLING_SECRET_KEY\s*=\s*['"][A-Za-z0-9]{20,}['"]/gi,
  
  // AWS
  /AKIA[0-9A-Z]{16}/g,
  
  // 私钥
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  
  // 数据库连接
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi,
  /mysql:\/\/[^:]+:[^@]+@/gi
];

// 允许的占位符
const ALLOWED = [
  'your-token-here',
  'your-api-key-here',
  'your-dingding-robot-token-here',
  'sk-your-key',
  'placeholder',
  'example'
];

function isAllowed(content) {
  return ALLOWED.some(placeholder => 
    content.toLowerCase().includes(placeholder.toLowerCase())
  );
}

function checkStagedFiles() {
  try {
    // 获取暂存的文件
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8'
    }).trim().split('\n').filter(Boolean);
    
    if (stagedFiles.length === 0) {
      return { success: true };
    }
    
    const issues = [];
    
    stagedFiles.forEach(file => {
      // 只检查特定类型的文件
      const ext = path.extname(file);
      const checkExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml'];
      
      if (!checkExtensions.includes(ext)) {
        return;
      }
      
      // 排除 node_modules 和 lock 文件
      if (file.includes('node_modules') || file.includes('package-lock.json')) {
        return;
      }
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        SENSITIVE_PATTERNS.forEach(pattern => {
          const matches = content.match(pattern);
          
          if (matches && !isAllowed(content)) {
            issues.push({
              file,
              match: matches[0].substring(0, 30) + '...'
            });
          }
        });
      } catch (e) {
        // 文件可能不存在或无法读取
      }
    });
    
    return {
      success: issues.length === 0,
      issues
    };
  } catch (error) {
    // 不是 git 仓库或其他错误，允许提交
    return { success: true };
  }
}

// 运行检查
console.log('\n🔍 检查暂存文件中的敏感信息...\n');

const result = checkStagedFiles();

if (result.success) {
  console.log('✅ 未发现敏感信息泄露\n');
  process.exit(0);
} else {
  console.log('❌ 发现敏感信息泄露！\n');
  console.log('问题文件:');
  result.issues.forEach(issue => {
    console.log(`  - ${issue.file}: ${issue.match}`);
  });
  console.log('\n请将敏感信息移至 .env 文件后再提交。\n');
  process.exit(1);
}
