# AI导演系统 - SaaS级产品化升级文档

## 一、系统架构图（文字版）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend)                                │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │   Web 客户端     │     │   Admin 管理端   │     │   监控仪表盘     │    │
│  │  (Next.js 14)    │     │  (Next.js 14)    │     │  (React)        │    │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘    │
└───────────┼───────────────────────┼───────────────────────┼─────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API Gateway (Next.js Route Handler)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  鉴权    │ │  限流    │ │  路由    │ │  熔断    │ │  请求追踪    │   │
│  │  Auth    │ │  Rate    │ │  Router  │ │  Circuit │ │  Tracing     │   │
│  │          │ │  Limit   │ │          │ │  Breaker │ │              │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Task Queue    │     │   AI Service    │     │   Admin API         │
│   (Redis)       │     │   火山方舟API    │     │   (CRUD/配置)        │
│  ┌───────────┐  │     │  ┌─────────────┐ │     │                     │
│  │ 视频生成   │  │     │  │ doubao-1.5  │ │     │                     │
│  │ 分镜生成   │  │     │  │ seedance    │ │     │                     │
│  │ 任务队列   │  │     │  │ pro-251215  │ │     │                     │
│  └───────────┘  │     │  └─────────────┘ │     │                     │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
           │                        │
           ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│   OSS 存储层    │     │   成本控制系统   │
│  (TOS/签名URL)  │     │  Cost Controller│
│  ┌───────────┐  │     │  ┌───────────┐  │
│  │ 视频文件   │  │     │  │ 成本记录   │  │
│  │ 图片文件   │  │     │  │ 额度控制   │  │
│  │ 分镜数据   │  │     │  │ 降级策略   │  │
│  └───────────┘  │     │  └───────────┘  │
└─────────────────┘     └─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据库层 (PostgreSQL)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   user   │ │   task   │ │   cost   │ │   log    │ │  release │     │
│  │  用户表   │ │  任务表   │ │  成本表   │ │  日志表   │ │  灰度表   │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       监控系统 (Observability)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  结构化日志   │ │  链路追踪     │ │  指标监控     │ │  告警系统     │    │
│  │  Logging     │ │  Tracing     │ │  Metrics     │ │  Alerting    │    │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 二、模块拆分结构

### 2.1 前端模块 (Frontend)

| 模块 | 路径 | 职责 |
|------|------|------|
| Web客户端 | `src/app/` | 用户主界面、视频生成、作品管理 |
| Admin管理端 | `src/app/admin/` | 系统管理、用户管理、配置管理 |
| 监控仪表盘 | `src/app/monitor/` | 实时指标、日志查询、错误追踪 |
| 用户模块 | `src/modules/user/` | 登录注册、权限管理 |
| 视频模块 | `src/modules/video/` | 视频生成、播放、任务管理 |
| 分镜模块 | `src/modules/storyboard/` | 分镜生成、编辑 |
| 会员模块 | `src/modules/membership/` | 订阅管理、支付集成 |

### 2.2 后端模块 (Backend)

| 模块 | 路径 | 职责 |
|------|------|------|
| API网关 | `src/app/api/` | 路由、鉴权、限流 |
| 视频API | `src/app/api/v1/video/` | 视频生成、任务查询 |
| 分镜API | `src/app/api/v1/storyboard/` | 分镜生成 |
| 用户API | `src/app/api/v1/users/` | 用户CRUD |
| 监控API | `src/app/api/v1/monitor/` | 指标查询、健康检查 |
| 成本API | `src/app/api/v1/cost/` | 成本查询 |
| 认证中间件 | `src/middleware/auth.ts` | JWT验证 |
| 限流中间件 | `src/middleware/rateLimit.ts` | 速率限制、去重 |
| 日志服务 | `src/services/logger.ts` | 统一日志、链路追踪 |
| 成本控制 | `src/services/costControl.ts` | 成本记录、额度管理 |
| 灰度控制 | `src/services/releaseControl.ts` | 功能开关、Kill Switch |

## 三、API列表

### 3.1 用户认证

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 用户注册 | POST | `/api/v1/users/register` | 否 | 创建新用户 |
| 用户登录 | POST | `/api/v1/users/login` | 否 | 用户登录 |
| 用户信息 | GET | `/api/v1/users/me` | 是 | 获取当前用户信息 |

### 3.2 视频生成

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 视频生成 | POST | `/api/v1/video/generate` | 是 | 发起视频生成任务 |
| 任务查询 | GET | `/api/v1/video/task?task_id=xxx` | 是 | 查询单个任务 |
| 任务列表 | GET | `/api/v1/video/tasks?page=1&limit=10` | 是 | 查询任务列表 |
| 视频代理 | GET | `/api/video-proxy?url=xxx` | 否 | 视频URL代理访问 |

### 3.3 分镜生成

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 分镜生成 | POST | `/api/v1/storyboard/generate` | 是 | 生成分镜脚本 |
| 分镜配置 | GET | `/api/v1/storyboard/config` | 否 | 获取分镜配置 |

### 3.4 监控与运维

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 系统指标 | GET | `/api/v1/monitor/metrics` | 是 | 获取系统监控指标 |
| 健康检查 | GET | `/api/v1/health` | 否 | 系统健康检查 |
| 日志查询 | GET | `/api/logs` | 是 | 查询日志 |
| 灰度状态 | GET | `/api/release` | 是 | 获取灰度发布状态 |

### 3.5 成本管理

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 成本查询 | GET | `/api/v1/cost` | 是 | 查询用户成本记录 |
| 日成本 | GET | `/api/cost/daily` | 是 | 日成本统计 |

### 3.6 作品管理

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 作品列表 | GET | `/api/v1/works` | 是 | 获取作品列表 |
| 作品详情 | GET | `/api/v1/works/[id]` | 是 | 获取单个作品 |
| 作品搜索 | GET | `/api/v1/works/search` | 否 | 搜索作品 |

### 3.7 会员与订单

| API | 方法 | 路径 | 认证 | 说明 |
|-----|------|------|------|------|
| 会员配置 | GET | `/api/v1/membership/config` | 否 | 获取会员套餐配置 |
| 会员状态 | GET | `/api/v1/membership/me` | 是 | 获取当前会员状态 |
| 订单列表 | GET | `/api/v1/orders` | 是 | 获取订单列表 |
| 订单详情 | GET | `/api/v1/orders/[id]` | 是 | 获取订单详情 |

## 四、核心业务链路数据流

### 4.1 视频生成完整链路

```
用户上传图片
    │
    ▼
生成 request_id + trace_id
    │
    ▼
参数验证 (prompt, image_url)
    │
    ▼
Kill Switch 检查
    │
    ▼
功能开关检查 (video_generation_enabled)
    │
    ▼
灰度用户检查 (isUserInRelease)
    │
    ▼
速率限制检查 (3次/分钟, 30次/日)
    │
    ▼
重复请求检查 (Deduplication)
    │
    ▼
成本额度检查 (Daily Limit)
    │
    ▼
创建任务记录 (task表)
    │
    ▼
调用火山方舟API (doubao-seedance-1-5-pro-251215)
    │
    ▼
轮询任务状态 (最多20次, 间隔3秒)
    │
    ▼
生成成功 → 更新任务状态 → 记录成本 → 返回视频URL
    │
    ▼
生成失败 → 更新任务状态 → 记录错误 → 返回错误信息
    │
    ▼
前端播放 (通过代理URL)
```

### 4.2 链路追踪字段传递

| 步骤 | request_id | trace_id | user_id | task_id | 日志记录 |
|------|------------|----------|---------|---------|----------|
| 请求入口 | ✅ | ✅ | ✅ | - | ✅ |
| 参数验证 | ✅ | ✅ | ✅ | - | ✅ |
| 权限检查 | ✅ | ✅ | ✅ | - | ✅ |
| 任务创建 | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI调用 | ✅ | ✅ | ✅ | ✅ | ✅ |
| OSS存储 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 结果返回 | ✅ | ✅ | ✅ | ✅ | ✅ |

## 五、部署方式

### 5.1 前端部署 (Vercel)

```bash
# 项目根目录
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 部署到Vercel (通过GitHub Actions自动部署)
# 配置环境变量：
# - DATABASE_URL (PostgreSQL连接字符串)
# - VOLC_API_KEY (火山引擎API密钥)
# - VOLC_BASE_URL (火山引擎API地址)
# - JWT_SECRET (JWT签名密钥)
# - NEXT_PUBLIC_APP_URL (应用公网地址)
```

### 5.2 数据库部署 (Supabase/Neon)

```sql
-- 使用Prisma迁移
npx prisma migrate deploy

-- 初始化必要数据
INSERT INTO "ReleaseConfig" ("id", "name", "enabled", "percentage", "createdAt", "updatedAt") VALUES
('video_generation', '视频生成', true, 100, NOW(), NOW()),
('scene_generation', '分镜生成', true, 100, NOW(), NOW()),
('kill_switch', '全局开关', false, 0, NOW(), NOW());
```

### 5.3 Redis部署 (Upstash/Vercel KV)

```bash
# 使用Upstash免费层
# 配置环境变量：
# - REDIS_URL (Upstash Redis连接字符串)
```

### 5.4 CI/CD流程

```
GitHub Push → GitHub Actions → Vercel Deploy → Production
                                      │
                                      ▼
                            健康检查 (/api/v1/health)
                                      │
                                      ▼
                            灰度发布验证
```

## 六、灰度发布流程

### 6.1 用户分层策略

| 用户类型 | 比例 | 说明 |
|----------|------|------|
| 正式用户 | 100% | 稳定版功能 |
| 灰度用户 | 10% | 体验新功能 |
| 实验用户 | 1% | 测试前沿功能 |

### 6.2 灰度发布流程

```
开发完成
    │
    ▼
代码审查 + 测试
    │
    ▼
部署到灰度环境
    │
    ▼
配置功能开关 (percentage=1%)
    │
    ▼
监控实验用户反馈
    │
    ▼
无异常 → 提升到10%
    │
    ▼
监控灰度用户反馈
    │
    ▼
无异常 → 提升到100%
    │
    ▼
全量发布
    │
    ▼
出现问题 → Kill Switch关闭 → 回滚
```

### 6.3 功能开关配置

| 开关名称 | 描述 | 默认值 |
|----------|------|--------|
| `video_generation_enabled` | 视频生成功能开关 | true |
| `scene_generation_enabled` | 分镜生成功能开关 | true |
| `kill_switch` | 全局紧急关闭开关 | false |

### 6.4 Kill Switch 操作

```bash
# 通过API关闭
curl -X POST /api/release \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "kill_switch", "enabled": true}'

# 通过API开启
curl -X POST /api/release \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "kill_switch", "enabled": false}'
```

## 七、成本控制策略

### 7.1 成本记录结构

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户ID |
| taskId | string | 任务ID |
| modelId | string | 模型ID |
| inputTokens | int | 输入token数 |
| inputImageSize | int | 输入图片大小 |
| outputDuration | float | 输出视频时长 |
| estimatedCost | float | 预估成本 |
| actualCost | float | 实际成本 |
| status | string | 状态(success/failed/pending) |

### 7.2 成本控制策略

| 策略 | 配置 | 说明 |
|------|------|------|
| 每日额度 | 3元/用户/日 | 防止单个用户过度消耗 |
| 超额降级 | Mock模式 | 超过额度后返回模拟结果 |
| 重复调用阻止 | 相同prompt+image | 5分钟内相同请求直接拒绝 |
| 速率限制 | 3次/分钟 | 防止API滥用 |
| 每日上限 | 30次/用户/日 | 每日最大调用次数 |

### 7.3 成本计算模型

```
视频生成成本 = 基础费用(0.12元) + 时长费用(0.03元/秒)
分镜生成成本 = 基础费用(0.05元) + Token费用(0.00001元/token)
```

### 7.4 成本告警

| 阈值 | 告警级别 | 通知方式 |
|------|----------|----------|
| 日成本 > 100元 | 警告 | 日志 |
| 日成本 > 500元 | 严重 | 日志 + 邮件 |
| 单用户日成本 > 3元 | 警告 | 日志 |

## 八、可观测性设计

### 8.1 日志结构

```json
{
  "request_id": "j8z1k3m-abc123",
  "trace_id": "trace-j8z1k3m-xyz789",
  "user_id": "user-001",
  "step": "VIDEO_GENERATE_AI_CALL",
  "service": "ai-service",
  "status": "success",
  "latency": 45230,
  "input": { "prompt": "...", "image_url": "..." },
  "output": { "video_url": "..." },
  "error": null,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "INFO",
  "task_id": "video-1736956200-abc"
}
```

### 8.2 错误分类

| 错误类型 | 状态码 | 说明 |
|----------|--------|------|
| AUTH_ERROR | 401 | 认证失败 |
| PERMISSION_ERROR | 403 | 权限不足 |
| LIMIT_ERROR | 429 | 限流触发 |
| VALIDATION_ERROR | 400 | 参数验证失败 |
| AI_ERROR | 500 | AI服务错误 |
| STORAGE_ERROR | 500 | 存储错误 |
| TIMEOUT_ERROR | 504 | 超时错误 |
| SERVER_ERROR | 500 | 服务器错误 |

### 8.3 核心指标

| 指标 | 说明 |
|------|------|
| requestSuccessRate | 请求成功率 |
| aiSuccessRate | AI调用成功率 |
| avgLatency | 平均响应时间 |
| p95Latency | P95响应时间 |
| p99Latency | P99响应时间 |
| totalRequests | 总请求数 |
| totalAiCalls | AI调用总数 |

## 九、数据库设计

### 9.1 User表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | string | PK | 用户ID |
| email | string | Unique | 邮箱 |
| name | string | - | 用户名 |
| password | string | - | 密码哈希 |
| tier | string | Default: 'free' | 用户等级 |
| releaseGroup | string | Default: 'stable' | 灰度分组 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

### 9.2 Task表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | string | PK | 主键ID |
| taskId | string | Unique | 任务ID |
| userId | string | FK | 用户ID |
| type | string | - | 任务类型 |
| status | string | Default: 'pending' | 任务状态 |
| prompt | string | - | 生成提示词 |
| imageUrl | string | - | 输入图片URL |
| videoUrl | string | - | 输出视频URL |
| cost | float | Default: 0 | 实际成本 |
| estimatedCost | float | Default: 0 | 预估成本 |
| requestId | string | - | 请求ID |
| traceId | string | - | 追踪ID |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |
| completedAt | DateTime | - | 完成时间 |

### 9.3 CostRecord表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | string | PK | 主键ID |
| userId | string | - | 用户ID |
| taskId | string | - | 任务ID |
| modelId | string | - | 模型ID |
| inputTokens | int | Default: 0 | 输入Token数 |
| outputDuration | float | Default: 0 | 输出时长 |
| estimatedCost | float | - | 预估成本 |
| actualCost | float | Default: 0 | 实际成本 |
| status | string | - | 状态 |
| createdAt | DateTime | - | 创建时间 |

### 9.4 ReleaseConfig表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | string | PK | 配置ID |
| name | string | Unique | 配置名称 |
| enabled | boolean | Default: true | 是否启用 |
| percentage | int | Default: 100 | 灰度比例 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

## 十、最终验收标准

### 10.1 可上线标准

- ✅ 所有API返回标准化响应格式
- ✅ 完善的错误处理和日志记录
- ✅ 数据库迁移脚本完整
- ✅ CI/CD流程自动化

### 10.2 可运营标准

- ✅ 用户认证系统完善
- ✅ 任务管理系统完善
- ✅ 成本统计系统完善
- ✅ 监控仪表盘可用

### 10.3 可收费标准

- ✅ 会员套餐配置完善
- ✅ 订单管理系统完善
- ✅ 成本控制策略完善
- ✅ 额度管理系统完善

### 10.4 可扩展标准

- ✅ 模块化架构设计
- ✅ API版本控制
- ✅ 数据库索引优化
- ✅ 缓存策略完善

### 10.5 可监控标准

- ✅ 全链路追踪
- ✅ 结构化日志
- ✅ 核心指标监控
- ✅ 错误分类统计

### 10.6 可灰度发布标准

- ✅ 用户分层系统
- ✅ 功能开关系统
- ✅ Kill Switch
- ✅ 灰度比例控制

---

**文档版本**: v1.0  
**生成时间**: 2025-01-15  
**系统状态**: Production Ready