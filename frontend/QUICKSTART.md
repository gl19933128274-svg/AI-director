# AI导演系统 - 快速开始指南

## 🚀 5分钟快速部署

### 准备工作

1. **注册必要账号**
   - [GitHub](https://github.com) 账号
   - [Vercel](https://vercel.com) 账号
   - [火山引擎](https://console.volcengine.com/ark) API密钥
   - [Supabase](https://supabase.com) 或 [Neon](https://neon.tech) PostgreSQL数据库

2. **安装工具**
   ```bash
   # Node.js 18+
   node --version

   # Vercel CLI
   npm i -g vercel

   # Git
   git --version
   ```

### 第一步：配置环境变量

在 `frontend` 目录下创建 `.env.local`：

```bash
# 数据库
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 火山引擎
VOLC_API_KEY="ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
VOLC_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"

# JWT
JWT_SECRET="your-super-secret-key-at-least-32-characters"

# 应用
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
USE_REAL_AI=true
```

### 第二步：初始化数据库

```bash
cd frontend

# 初始化数据库
npx prisma generate
npx prisma db push
```

### 第三步：本地测试

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 第四步：部署到 Vercel

```bash
# 部署到开发环境预览
vercel

# 部署到生产环境
vercel --prod
```

---

## 📋 完整部署清单

### 1. GitHub 配置

- [ ] 创建 GitHub 仓库
- [ ] 配置 GitHub Secrets
  - [ ] VERCEL_TOKEN
  - [ ] VERCEL_ORG_ID
  - [ ] VERCEL_PROJECT_ID_DEV
  - [ ] VERCEL_PROJECT_ID_PROD
- [ ] 推送代码到 GitHub

### 2. Vercel 配置

- [ ] 导入 GitHub 仓库
- [ ] 配置环境变量
- [ ] 配置构建命令
- [ ] 部署完成

### 3. 数据库配置

- [ ] 创建 PostgreSQL 数据库
- [ ] 配置 DATABASE_URL
- [ ] 执行数据库迁移
- [ ] 初始化灰度配置

### 4. API 配置

- [ ] 获取火山引擎 API Key
- [ ] 配置 VOLC_API_KEY
- [ ] 测试视频生成 API

### 5. 验证部署

- [ ] 健康检查通过
- [ ] 监控指标可用
- [ ] 前端页面正常
- [ ] 视频生成功能正常

---

## 🎯 快速测试命令

### 健康检查

```bash
curl https://your-app.vercel.app/api/v1/health
```

预期输出：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 监控指标

```bash
curl https://your-app.vercel.app/api/v1/monitor/metrics
```

### 用户注册

```bash
curl -X POST https://your-app.vercel.app/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 用户登录

```bash
curl -X POST https://your-app.vercel.app/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 视频生成

```bash
curl -X POST https://your-app.vercel.app/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "prompt": "一只猫在草地上奔跑",
    "image_url": "https://example.com/cat.jpg",
    "duration": 4
  }'
```

---

## 🔧 常见问题

### Q: 数据库连接失败？

A: 检查 DATABASE_URL 格式是否正确：
```
postgresql://user:password@host:5432/database?schema=public
```

### Q: API 调用返回 401？

A: 检查 Authorization header：
```
Authorization: Bearer <your_jwt_token>
```

### Q: 视频生成返回 mock 结果？

A: 检查：
1. VOLC_API_KEY 是否配置
2. USE_REAL_AI 是否为 true
3. 火山引擎账号是否有额度

### Q: 部署失败？

A: 查看 Vercel 部署日志：
```bash
vercel logs
```

---

## 📚 更多文档

- [完整部署指南](./DEPLOYMENT_GUIDE.md)
- [GitHub上传指南](./GITHUB_UPLOAD_GUIDE.md)
- [产品化文档](../PRODUCTIZATION_DOC.md)

---

**版本**: v1.0  
**更新时间**: 2025-01-15