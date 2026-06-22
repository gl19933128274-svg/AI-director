# AI导演系统 - GitHub 上传指南

## 📋 上传前准备

### 1. 检查必要文件

确保以下文件已准备好：

- [x] `.env.local` - 环境变量配置（已在 .gitignore，不会被提交）
- [x] `.gitignore` - Git忽略文件
- [x] `vercel.json` - Vercel部署配置
- [x] `package.json` - 项目依赖配置
- [x] `prisma/schema.prisma` - 数据库schema

### 2. 清理本地构建文件

```bash
# 在 frontend 目录下执行
cd frontend

# 删除 .next 构建目录
Remove-Item -Recurse -Force .next

# 删除 node_modules（可选，会在CI/CD重新安装）
# Remove-Item -Recurse -Force node_modules
```

---

## 🚀 GitHub 仓库创建步骤

### 方法一：通过 GitHub Web 界面创建

1. **登录 GitHub**
   - 访问 https://github.com
   - 登录你的账号

2. **创建新仓库**
   - 点击右上角 `+` → `New repository`
   - 填写仓库信息：
     - Repository name: `ai-director`
     - Description: `AI导演系统 - SaaS级AI视频生成平台`
     - Private/Public: 根据需要选择
     - 不要勾选 "Initialize this repository with a README"
   - 点击 `Create repository`

3. **获取仓库URL**
   - 复制仓库地址，例如：
     - HTTPS: `https://github.com/YOUR_USERNAME/ai-director.git`
     - SSH: `git@github.com:YOUR_USERNAME/ai-director.git`

### 方法二：通过命令行创建

```bash
# 在 frontend 目录下执行
cd frontend

# 初始化Git仓库
git init

# 添加所有文件（除 .env.local 外）
git add .

# 提交
git commit -m "feat: AI导演系统 SaaS级产品化版本

Features:
- 9层系统架构重构
- 成本控制系统
- 灰度发布系统
- 日志与可观测性
- 核心业务链路标准化
- 监控指标API"

# 添加远程仓库（替换 YOUR_USERNAME 为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/ai-director.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

---

## ⚙️ GitHub Secrets 配置

### 1. 获取 Vercel Token

```bash
# 使用 Vercel CLI
vercel tokens create

# 或在 Web 界面获取
# Vercel Dashboard → Settings → Tokens → Create
```

### 2. 获取 Vercel 组织ID和项目ID

```bash
# 使用 Vercel CLI
vercel org ls
vercel project ls

# 或在 Web 界面获取
# Vercel Dashboard → 项目 Settings → General
```

### 3. 配置 GitHub Secrets

1. 打开你的 GitHub 仓库
2. 进入 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`，添加以下密钥：

| Secret Name | Value | 说明 |
|------------|--------|------|
| `VERCEL_TOKEN` | `xxxxx` | Vercel访问令牌 |
| `VERCEL_ORG_ID` | `team_xxxxx` | Vercel组织ID |
| `VERCEL_PROJECT_ID_DEV` | `prj_xxxxx` | 开发环境项目ID |
| `VERCEL_PROJECT_ID_PROD` | `prj_xxxxx` | 生产环境项目ID |

---

## 🔄 Git 分支管理策略

### 分支结构

```
main        → 生产环境 (自动部署)
develop     → 开发环境 (自动部署)
feature/*   → 功能分支 (需PR合并)
hotfix/*    → 紧急修复分支
```

### 工作流程

```bash
# 1. 从 main 创建功能分支
git checkout -b feature/cost-control

# 2. 开发完成后提交
git add .
git commit -m "feat: 添加成本控制模块"

# 3. 推送到远程
git push -u origin feature/cost-control

# 4. 创建 Pull Request
# GitHub Web界面: Compare & pull request → Create pull request

# 5. 代码审查后合并到 develop
# GitHub会自动部署到开发环境进行测试

# 6. 测试通过后合并到 main
# GitHub会自动部署到生产环境
```

---

## ✅ 验证部署

### 1. 检查 GitHub Actions

1. 打开 GitHub 仓库
2. 进入 `Actions` 标签页
3. 查看部署状态：
   - ✓ 绿色 = 成功
   - ✗ 红色 = 失败
   - 旋转 = 运行中

### 2. 测试部署结果

```bash
# 替换为你的实际URL
$APP_URL = "https://ai-director.vercel.app"

# 健康检查
curl "$APP_URL/api/v1/health"

# 监控指标
curl "$APP_URL/api/v1/monitor/metrics"
```

### 3. 常见问题排查

#### 构建失败

```bash
# 查看构建日志
# GitHub Actions → 点击失败的workflow → 查看日志

# 本地测试构建
npm run build
```

#### 部署失败

```bash
# 查看Vercel日志
vercel logs

# 手动触发部署
gh workflow run deploy.yml
```

#### 环境变量问题

```bash
# 检查Vercel环境变量
vercel env ls

# 添加缺失的环境变量
vercel env add DATABASE_URL
vercel env add VOLC_API_KEY
```

---

## 📊 部署后检查清单

- [ ] GitHub Actions 显示绿色 ✓
- [ ] Vercel 部署成功
- [ ] `/api/v1/health` 返回 200
- [ ] `/api/v1/monitor/metrics` 返回指标数据
- [ ] 前端页面可正常访问
- [ ] 视频生成API可正常调用

---

## 🎯 后续优化

### 1. 添加监控告警

在 Vercel 项目中添加：
- Error tracking (Sentry)
- Uptime monitoring
- Performance monitoring

### 2. 配置自定义域名

1. Vercel Dashboard → Domains
2. 添加你的域名
3. 配置DNS记录
4. 等待SSL证书自动签发

### 3. 启用增强安全

- 添加 Rate Limiting
- 配置 WAF
- 启用 DDoS Protection

---

## 📞 帮助资源

- [Vercel 文档](https://vercel.com/docs)
- [GitHub Actions 文档](https://docs.github.com/actions)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)

---

**文档版本**: v1.0  
**最后更新**: 2025-01-15