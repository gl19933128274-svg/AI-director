# AI导演系统 - 部署脚本工具

本目录包含用于部署 AI导演系统 到 GitHub 和 Vercel 的脚本工具。

## 📁 脚本文件

| 脚本 | 说明 | 使用方式 |
|------|------|----------|
| `setup-github.ps1` | GitHub 仓库初始化 | `.\setup-github.ps1 -GitHubUsername "your_username"` |
| `deploy-vercel.ps1` | 部署到 Vercel | `.\deploy-vercel.ps1 -Production` |
| `init-database.ps1` | 初始化数据库 | `.\init-database.ps1 -Production` |

## 🚀 快速开始

### 方式一：使用 PowerShell（推荐）

```powershell
# 1. GitHub 初始化
cd frontend
.\setup-github.ps1 -GitHubUsername "your_username"

# 2. 初始化数据库
.\init-database.ps1

# 3. 部署到 Vercel
.\deploy-vercel.ps1 -Production
```

### 方式二：手动部署

```bash
# 1. GitHub
git init
git add .
git commit -m "AI导演系统 SaaS级产品化版本"
git remote add origin https://github.com/YOUR_USERNAME/ai-director.git
git push -u origin main

# 2. Vercel
vercel --prod
```

## 📋 详细步骤

### 1. GitHub 初始化

```powershell
.\setup-github.ps1 -GitHubUsername "your_username" -RepoName "ai-director"
```

这会：
- 初始化 Git 仓库
- 添加所有文件
- 创建初始提交
- 配置远程仓库
- 推送到 GitHub

### 2. 数据库初始化

```powershell
.\init-database.ps1
```

这会：
- 检查环境变量
- 生成 Prisma Client
- 执行数据库迁移
- 初始化灰度配置

### 3. Vercel 部署

```powershell
# 部署到开发环境
.\deploy-vercel.ps1 -Development

# 部署到生产环境
.\deploy-vercel.ps1 -Production
```

这会：
- 检查环境变量
- 安装依赖
- 生成 Prisma Client
- 构建项目
- 部署到 Vercel

## ⚙️ 前置要求

### 安装工具

```bash
# Node.js 18+
node --version

# Git
git --version

# Vercel CLI
npm i -g vercel
```

### 配置环境变量

在 `frontend` 目录下创建 `.env.local`：

```bash
DATABASE_URL="postgresql://..."
VOLC_API_KEY="ark-..."
JWT_SECRET="your-secret-key..."
NEXT_PUBLIC_APP_URL="https://..."
USE_REAL_AI=true
```

## 🎯 下一步

1. **配置 GitHub Secrets**
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - VERCEL_PROJECT_ID_DEV
   - VERCEL_PROJECT_ID_PROD

2. **配置 Vercel 环境变量**
   - 在 Vercel Dashboard → Settings → Environment Variables

3. **测试部署**
   - 健康检查: `curl https://your-app.vercel.app/api/v1/health`
   - 监控指标: `curl https://your-app.vercel.app/api/v1/monitor/metrics`

## 📚 更多文档

- [快速开始](./QUICKSTART.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [GitHub上传指南](./GITHUB_UPLOAD_GUIDE.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)

## ❓ 常见问题

### Q: 脚本执行失败？

A: 检查：
1. PowerShell 执行策略：`Get-ExecutionPolicy`
2. 以管理员身份运行 PowerShell
3. 启用脚本执行：`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned`

### Q: GitHub 推送失败？

A: 确保：
1. GitHub 用户名正确
2. GitHub 仓库已创建
3. Personal Access Token 有 push 权限

### Q: Vercel 部署失败？

A: 检查：
1. 环境变量是否配置
2. DATABASE_URL 是否正确
3. Vercel 项目是否正确连接 GitHub

---

**版本**: v1.0  
**更新**: 2025-01-15