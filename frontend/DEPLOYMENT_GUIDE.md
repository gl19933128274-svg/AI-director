# AI导演系统 - GitHub & Vercel 部署指南

## 📋 部署前检查清单

### 1. 环境变量配置 (.env.local)

在 `frontend` 目录下创建 `.env.local` 文件：

```bash
# =============================================================
# AI Director - 环境变量配置
# -------------------------------------------------------------
# 请复制 .env.local.example 并填入真实值
# =============================================================

# -------------------------------------------------------------
# 数据库配置 (PostgreSQL via Supabase/Neon)
# -------------------------------------------------------------
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# -------------------------------------------------------------
# 火山引擎 API (必填 - 视频生成)
# -------------------------------------------------------------
VOLC_API_KEY="ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
VOLC_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"

# -------------------------------------------------------------
# 腾讯混元 AI (可选 - 分镜生成)
# -------------------------------------------------------------
HUNYUAN_API_KEY=""

# -------------------------------------------------------------
# AI 能力开关
# -------------------------------------------------------------
USE_REAL_AI=true

# -------------------------------------------------------------
# AI Router 配置
# -------------------------------------------------------------
AI_PRIMARY_MODEL=volcengine
AI_FALLBACK_ENABLED=true
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=60000

# -------------------------------------------------------------
# JWT 配置
# -------------------------------------------------------------
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# -------------------------------------------------------------
# 应用配置
# -------------------------------------------------------------
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 2. Vercel环境变量配置

在 Vercel 项目 Settings → Environment Variables 中添加：

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | PostgreSQL连接字符串 | Production, Preview, Development |
| `VOLC_API_KEY` | 火山引擎API密钥 | Production, Preview, Development |
| `VOLC_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | Production, Preview, Development |
| `JWT_SECRET` | JWT签名密钥 | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | 应用URL | All |
| `USE_REAL_AI` | `true` | Production |

---

## 🚀 GitHub 上传步骤

### 1. 初始化 Git 仓库 (如果尚未初始化)

```bash
cd frontend

# 初始化仓库
git init

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/ai-director.git

# 添加所有文件
git add .

# 提交
git commit -m "feat: AI导演系统 SaaS级产品化版本

- 完成9层系统架构重构
- 实现成本控制系统
- 实现灰度发布系统
- 完善日志与可观测性
- 标准化核心业务链路
- 添加监控指标API"

# 推送到GitHub
git branch -M main
git push -u origin main
```

### 2. GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret Name | 说明 | 获取方式 |
|------------|------|----------|
| `VERCEL_TOKEN` | Vercel访问令牌 | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel组织ID | `vercel org ls` 或 Settings |
| `VERCEL_PROJECT_ID_DEV` | 开发环境项目ID | Vercel项目Settings |
| `VERCEL_PROJECT_ID_PROD` | 生产环境项目ID | Vercel项目Settings |

---

## 🌐 Vercel 部署步骤

### 1. Vercel 项目创建

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 进入项目目录
cd frontend

# 初始化项目
vercel init

# 按提示配置：
# - Project Name: ai-director
# - Directory: ./
# - Framework: Next.js
# - Build Command: npm run build
# - Output Directory: .next
```

### 2. 本地预览部署

```bash
cd frontend
vercel
```

### 3. 生产环境部署

```bash
cd frontend
vercel --prod
```

### 4. Vercel 环境变量配置 (Web界面)

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 → Settings → Environment Variables
3. 添加以下变量：

```
DATABASE_URL = postgresql://...
VOLC_API_KEY = ark-...
VOLC_BASE_URL = https://ark.cn-beijing.volces.com/api/v3
JWT_SECRET = your-secret-key
NEXT_PUBLIC_APP_URL = https://ai-director.vercel.app
USE_REAL_AI = true
```

4. 点击 Save Changes
5. 选择 Deployments → 点击 Redeploy

---

## 📊 部署后验证

### 1. 健康检查 API

```bash
curl https://your-app.vercel.app/api/v1/health
```

预期响应：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:00:00.000Z",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

### 2. 视频生成 API 测试

```bash
curl -X POST https://your-app.vercel.app/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "prompt": "一只猫在草地上奔跑",
    "image_url": "https://example.com/cat.jpg",
    "duration": 4
  }'
```

### 3. 监控指标检查

```bash
curl https://your-app.vercel.app/api/v1/monitor/metrics
```

---

## 🔄 CI/CD 自动化流程

### GitHub Actions 工作流

每次推送到 `main` 分支会自动：

1. **代码质量检查**
   - ESLint 检查
   - 测试运行

2. **生产构建**
   - 安装依赖
   - 生成 Prisma Client
   - Next.js 生产构建

3. **自动部署**
   - 开发分支 → 开发环境
   - 主分支 → 生产环境

4. **健康检查**
   - 部署后自动检查 `/api/v1/health`

### 手动触发部署

```bash
# 使用 Vercel CLI
vercel --prod

# 或通过 GitHub Actions
gh workflow run deploy.yml
```

---

## 🛠️ 故障排查

### 1. 构建失败

检查日志：
```bash
vercel logs
```

常见问题：
- 环境变量未配置
- DATABASE_URL 格式错误
- 依赖安装失败

### 2. 数据库连接失败

确保：
- PostgreSQL 数据库已创建
- 连接字符串格式正确
- 防火墙允许Vercel访问

### 3. API 调用失败

检查：
- VOLC_API_KEY 是否正确
- API 额度是否充足
- 网络连接是否正常

### 4. 查看部署日志

```bash
vercel logs -f
```

---

## 📞 联系方式

如有问题，请查看：
- [产品化文档](../PRODUCTIZATION_DOC.md)
- [系统架构文档](../SYSTEM_ARCHITECTURE.md)
- [部署执行报告](../DEPLOYMENT_EXECUTION_REPORT.md)

---

**部署状态**: Ready for Production  
**文档版本**: v1.0  
**更新时间**: 2025-01-15