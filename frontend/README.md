# AI导演系统 - 前端

> SaaS级AI视频生成平台前端

## 🎯 项目介绍

AI导演系统是一个基于 Next.js 14 构建的 SaaS 级 AI 视频生成平台，提供：
- 视频生成（基于火山引擎doubao-seedance模型）
- 分镜生成
- 作品管理
- 会员订阅
- 完整的运营监控

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 数据库
- 火山引擎 API 密钥

### 安装

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入真实值

# 生成 Prisma Client
npx prisma generate

# 初始化数据库
npx prisma db push
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   └── v1/            # API v1 版本
│   │   │       ├── video/     # 视频生成 API
│   │   │       ├── storyboard/# 分镜生成 API
│   │   │       ├── users/    # 用户管理 API
│   │   │       ├── monitor/  # 监控 API
│   │   │       └── cost/     # 成本管理 API
│   │   ├── (routes)/         # 页面路由
│   │   └── layout.tsx        # 根布局
│   ├── components/           # React 组件
│   ├── modules/              # 业务模块
│   ├── services/            # 服务层
│   │   ├── logger.ts        # 日志服务
│   │   ├── costControl.ts   # 成本控制
│   │   └── releaseControl.ts# 灰度发布
│   ├── middleware/          # 中间件
│   │   ├── auth.ts          # 认证
│   │   └── rateLimit.ts     # 限流
│   └── lib/                 # 工具库
├── prisma/
│   └── schema.prisma        # 数据库 Schema
├── public/                  # 静态资源
└── tests/                  # 测试文件
```

## 🔑 核心 API

### 视频生成

```typescript
POST /api/v1/video/generate
{
  "prompt": "一只猫在草地上奔跑",
  "image_url": "https://example.com/cat.jpg",
  "duration": 4
}
```

### 任务查询

```typescript
GET /api/v1/video/task?task_id=xxx
GET /api/v1/video/tasks?page=1&limit=10
```

### 监控指标

```typescript
GET /api/v1/monitor/metrics
```

### 成本查询

```typescript
GET /api/v1/cost
```

## 🎨 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL + Prisma
- **认证**: JWT
- **部署**: Vercel

## 📦 部署

详见文档：
- [快速开始](./QUICKSTART.md)
- [完整部署指南](./DEPLOYMENT_GUIDE.md)
- [GitHub上传指南](./GITHUB_UPLOAD_GUIDE.md)

### Vercel 快速部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署预览
vercel

# 部署生产
vercel --prod
```

### GitHub Actions CI/CD

推送到 main 分支自动部署到生产环境：
1. 代码质量检查
2. 生产构建
3. Vercel 自动部署
4. 健康检查

## 🔧 配置

### 环境变量 (.env.local)

```bash
# 数据库
DATABASE_URL="postgresql://..."

# 火山引擎
VOLC_API_KEY="ark-..."
VOLC_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"

# JWT
JWT_SECRET="your-secret-key"

# 应用
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
USE_REAL_AI=true
```

### 功能开关

系统支持通过灰度发布配置控制功能：

| 开关 | 说明 |
|------|------|
| `video_generation` | 视频生成功能 |
| `scene_generation` | 分镜生成功能 |
| `kill_switch` | 全局紧急关闭 |

## 📊 系统特性

### 可观测性
- 全链路追踪 (request_id, trace_id, user_id)
- 结构化日志
- 核心指标监控
- 错误分类统计

### 成本控制
- AI调用成本记录
- 用户每日额度限制
- 超额自动降级
- 重复调用阻止

### 灰度发布
- 用户分层 (100%/10%/1%)
- 功能开关
- Kill Switch
- 灰度比例控制

### 安全
- JWT认证
- API限流
- 参数验证
- CORS配置

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试并监听
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 📝 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请查看：
- [产品化文档](../PRODUCTIZATION_DOC.md)
- [部署文档](./DEPLOYMENT_GUIDE.md)
