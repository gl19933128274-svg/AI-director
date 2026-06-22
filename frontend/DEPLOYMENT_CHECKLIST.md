# AI导演系统 - 部署检查清单

## ✅ 部署前检查清单

### 1. 环境配置

- [ ] `.env.local` 文件已创建
- [ ] `DATABASE_URL` 已配置（PostgreSQL连接字符串）
- [ ] `VOLC_API_KEY` 已配置（火山引擎API密钥）
- [ ] `VOLC_BASE_URL` 已配置
- [ ] `JWT_SECRET` 已配置（至少32字符）
- [ ] `NEXT_PUBLIC_APP_URL` 已配置
- [ ] `USE_REAL_AI` 已配置

### 2. 代码检查

- [ ] `npm install` 成功
- [ ] `npx prisma generate` 成功
- [ ] `npx prisma db push` 成功
- [ ] `npm run build` 成功
- [ ] `npm run lint` 无错误
- [ ] `npm test` 通过

### 3. GitHub 配置

- [ ] GitHub 仓库已创建
- [ ] 代码已推送到 GitHub
- [ ] Secrets 已配置：
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID_DEV`
  - [ ] `VERCEL_PROJECT_ID_PROD`

### 4. Vercel 配置

- [ ] Vercel 项目已创建
- [ ] GitHub 仓库已连接
- [ ] 环境变量已配置
- [ ] 构建命令已设置
- [ ] 部署成功

### 5. 数据库

- [ ] PostgreSQL 数据库已创建
- [ ] 连接测试成功
- [ ] 表结构已创建
- [ ] 灰度配置已初始化

### 6. API 测试

- [ ] `/api/v1/health` 返回 200
- [ ] `/api/v1/monitor/metrics` 返回指标
- [ ] `/api/v1/users/register` 可注册
- [ ] `/api/v1/users/login` 可登录
- [ ] `/api/v1/video/generate` 可生成视频

### 7. 前端测试

- [ ] 首页可访问
- [ ] 用户注册流程正常
- [ ] 用户登录流程正常
- [ ] 视频生成页面可访问
- [ ] 分镜生成页面可访问

---

## 🚀 部署步骤

### 第一阶段：本地验证

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local

# 3. 生成 Prisma Client
npx prisma generate

# 4. 初始化数据库
npx prisma db push

# 5. 构建
npm run build

# 6. 启动开发服务器
npm run dev

# 7. 测试健康检查
curl http://localhost:3000/api/v1/health
```

### 第二阶段：GitHub 准备

```bash
# 1. 初始化 Git
git init

# 2. 添加文件
git add .

# 3. 提交
git commit -m "feat: AI导演系统 SaaS级产品化版本"

# 4. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/ai-director.git

# 5. 推送
git branch -M main
git push -u origin main
```

### 第三阶段：Vercel 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 初始化项目
cd frontend
vercel init

# 4. 配置环境变量
vercel env add DATABASE_URL
vercel env add VOLC_API_KEY
# ... 添加其他变量

# 5. 部署预览
vercel

# 6. 部署生产
vercel --prod
```

---

## 🧪 部署后验证

### 1. 健康检查

```bash
curl https://your-app.vercel.app/api/v1/health
```

预期：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 2. 监控指标

```bash
curl https://your-app.vercel.app/api/v1/monitor/metrics
```

预期：
```json
{
  "success": true,
  "data": {
    "requestMetrics": {...},
    "aiMetrics": {...}
  }
}
```

### 3. 用户注册

```bash
curl -X POST https://your-app.vercel.app/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 4. 视频生成

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

## 🔧 故障排查

### 问题1：构建失败

**症状**: `npm run build` 报错

**解决方案**:
1. 检查 Node.js 版本（需要 18+）
2. 删除 `node_modules` 和 `.next`，重新安装
3. 查看错误日志定位具体问题

```bash
rm -rf node_modules .next
npm install
npm run build
```

### 问题2：数据库连接失败

**症状**: `DATABASE_URL` 连接错误

**解决方案**:
1. 检查 DATABASE_URL 格式
2. 确认数据库服务器运行中
3. 检查防火墙设置

```bash
# 格式应该是：
postgresql://user:password@host:5432/database?schema=public
```

### 问题3：API 调用返回 401

**症状**: 认证失败

**解决方案**:
1. 检查 Authorization header
2. 确认 JWT token 有效
3. 检查 JWT_SECRET 配置

### 问题4：视频生成返回 mock

**症状**: 生成的视频是示例链接

**解决方案**:
1. 检查 `USE_REAL_AI=true`
2. 检查 `VOLC_API_KEY` 是否正确
3. 确认火山引擎账号有额度

### 问题5：Vercel 部署失败

**症状**: GitHub Actions 失败

**解决方案**:
1. 检查 GitHub Secrets 配置
2. 查看 Actions 日志
3. 确认 Vercel 项目设置

```bash
# 查看 Vercel 日志
vercel logs
```

---

## 📞 获取帮助

### 文档
- [快速开始](./QUICKSTART.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [GitHub上传](./GITHUB_UPLOAD_GUIDE.md)
- [产品化文档](../PRODUCTIZATION_DOC.md)

### 社区
- GitHub Issues
- Vercel Support

### 联系
- 提交 Issue
- 查看系统日志

---

## 🎉 部署成功！

完成以上所有检查项后，你的AI导演系统就已经成功部署到Vercel了！

**系统状态**: ✅ Production Ready

**下一步**:
1. 配置自定义域名（可选）
2. 设置监控告警
3. 配置Sentry错误追踪
4. 开启CDN加速

---

**检查清单版本**: v1.0  
**最后更新**: 2025-01-15