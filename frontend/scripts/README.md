# 敏感信息安全检查工具

## 概述

本工具用于在部署前自动检查代码中是否存在明文 Token、API Key 等敏感信息泄露。

---

## 使用方式

### 1. 手动检查

```bash
# 运行完整扫描
npm run check:secrets

# 或直接运行脚本
node scripts/check-secrets.js
```

### 2. 部署前自动检查

```bash
# 部署前自动检查 + 构建
npm run predeploy
```

### 3. Git Commit 前自动检查（推荐）

安装 husky 实现 pre-commit hook：

```bash
# 安装 husky
npm install husky --save-dev

# 初始化 husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "node scripts/pre-commit-check.js"
```

---

## 检查规则

### 检测的敏感信息类型

| 类型 | 模式 | 严重程度 |
|------|------|----------|
| 钉钉 Robot Token | 64位十六进制 | CRITICAL |
| 腾讯混元 API Key | sk- 开头 | CRITICAL |
| 可灵 API Key | 20+ 字符 | CRITICAL |
| AWS Access Key | AKIA 开头 | CRITICAL |
| RSA 私钥 | -----BEGIN PRIVATE KEY----- | CRITICAL |
| 数据库连接字符串 | mongodb://user:pass@ | CRITICAL |
| JWT Secret | jwt_secret=... | HIGH |
| 通用密码 | password=... | HIGH |

### 扫描范围

- **目录**: `src/`, `monitoring/`, `scripts/`
- **文件类型**: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.yml`, `.yaml`
- **排除**: `node_modules/`, `.next/`, `dist/`, `.git/`

---

## 输出示例

### 无泄露

```
============================================================
  敏感信息泄露检查报告
============================================================

【扫描统计】
  扫描目录: src, monitoring, scripts
  总文件数: 70
  已扫描: 63

============================================================
  ✅ 未发现敏感信息泄露
============================================================
```

### 发现泄露

```
============================================================
  ❌ 发现 3 个敏感信息泄露问题
============================================================

【🚨 CRITICAL - 严重】

  1. 钉钉 Robot Token
     文件: monitoring/report.md:49
     匹配: access_token=ad1ce63369d854de4a8c619ad4af9b3b...

  2. 腾讯混元 API Key
     文件: .env.local:16
     匹配: sk-SQQrJ0QkLdOBzPrmXJ9CKh9J5PMxtUnT...

------------------------------------------------------------
【修复建议】
  1. 将敏感信息移至 .env 文件（已在 .gitignore 中排除）
  2. 使用环境变量: process.env.YOUR_TOKEN
  3. 文档中使用占位符: your-token-here
  4. 如已提交到远程仓库，请立即轮换 Token
------------------------------------------------------------
```

---

## CI/CD 集成

### GitHub Actions

```yaml
name: Security Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  check-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Check for secrets
        run: node scripts/check-secrets.js
```

### GitLab CI

```yaml
security-check:
  stage: test
  script:
    - node scripts/check-secrets.js
  only:
    - merge_requests
    - main
```

---

## 最佳实践

### 1. 环境变量管理

```typescript
// ✅ 正确：使用环境变量
const token = process.env.DINGDING_ROBOT_TOKEN;

// ❌ 错误：硬编码
const token = 'ad1ce63369d854de4a8c619ad4af9b3b...';
```

### 2. 文档中使用占位符

```markdown
# ✅ 正确
DINGDING_ROBOT_TOKEN=your-dingding-robot-token-here

# ❌ 错误
DINGDING_ROBOT_TOKEN=ad1ce63369d854de4a8c619ad4af9b3b...
```

### 3. .env 文件管理

```bash
# .env.local（已在 .gitignore 中排除）
DINGDING_ROBOT_TOKEN=real-token-here
HUNYUAN_API_KEY=sk-real-key-here

# .env.local.example（可提交到仓库）
DINGDING_ROBOT_TOKEN=your-dingding-robot-token-here
HUNYUAN_API_KEY=sk-your-key-here
```

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `scripts/check-secrets.js` | 完整扫描脚本 |
| `scripts/pre-commit-check.js` | Git pre-commit hook |
| `package.json` | npm scripts 配置 |

---

## 常见问题

### Q: 检查脚本误报怎么办？

可以在脚本中的 `allowedPlaceholders` 数组添加允许的占位符：

```javascript
const allowedPlaceholders = [
  'your-token-here',
  'your-custom-placeholder'
];
```

### Q: 如何跳过 pre-commit 检查？

```bash
# 不推荐，仅紧急情况使用
git commit --no-verify -m "message"
```

### Q: 敏感信息已提交到远程仓库怎么办？

1. **立即轮换 Token** - 在对应平台重新生成
2. **清理 Git 历史** - 使用 `git filter-branch` 或 BFG Repo-Cleaner
3. **通知团队** - 告知相关人员更换凭证
