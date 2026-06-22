# AI导演系统 V2.0 技术规格文档

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端应用 (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/v1/*    RESTful API                                      │
│  /api/v2/*    预留版本                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端服务 (Next.js API)                    │
├─────────────────────────────────────────────────────────────────┤
│  用户模块    | 作品模块    | 模板模块    | AI生成模块           │
│  支付模块    | 管理模块    | 监控模块    | 日志模块             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   PostgreSQL      │ │      Redis        │ │   对象存储        │
│   (主数据库)      │ │ (缓存/队列/Session)│ │ (视频/图片)       │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

### 1.2 模块划分

| 模块 | 功能 | 状态 |
|------|------|------|
| `user` | 用户认证、会员体系、权限管理 | 开发中 |
| `work` | 作品管理、发布、展示、收藏 | 待开发 |
| `template` | 模板管理、模板应用 | 待开发 |
| `ai` | AI分镜生成、视频生成 | 已有基础 |
| `payment` | 支付、订阅管理 | 待开发 |
| `admin` | 后台管理、内容审核 | 待开发 |
| `monitor` | 监控、日志、告警 | 已有基础 |

---

## 2. 数据库设计

### 2.1 用户表 (users)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PRIMARY KEY | 用户唯一标识 |
| email | VARCHAR(255) | UNIQUE NOT NULL | 邮箱（登录账号） |
| phone | VARCHAR(20) | UNIQUE | 手机号 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| nickname | VARCHAR(50) | NOT NULL | 昵称 |
| avatar | VARCHAR(500) | | 头像URL |
| role | VARCHAR(20) | NOT NULL DEFAULT 'user' | 用户角色 |
| member_level | VARCHAR(20) | NOT NULL DEFAULT 'free' | 会员等级 |
| credits | INTEGER | NOT NULL DEFAULT 0 | 积分 |
| email_verified | BOOLEAN | NOT NULL DEFAULT false | 邮箱已验证 |
| phone_verified | BOOLEAN | NOT NULL DEFAULT false | 手机号已验证 |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 更新时间 |

### 2.2 用户角色枚举

| 值 | 说明 |
|----|------|
| `user` | 普通用户 |
| `creator` | 创作者用户 |
| `admin` | 管理员 |

### 2.3 会员等级枚举

| 值 | 说明 |
|----|------|
| `free` | 免费版 |
| `pro` | Pro版 |
| `studio` | Studio版 |

### 2.4 作品表 (works)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PRIMARY KEY | 作品ID |
| user_id | UUID | FOREIGN KEY | 作者ID |
| title | VARCHAR(200) | NOT NULL | 作品标题 |
| description | TEXT | | 作品描述 |
| thumbnail | VARCHAR(500) | | 缩略图URL |
| video_url | VARCHAR(500) | | 视频URL |
| status | VARCHAR(20) | NOT NULL | 状态 |
| visibility | VARCHAR(20) | NOT NULL | 可见性 |
| tags | TEXT[] | | 标签数组 |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 更新时间 |

### 2.5 模板表 (templates)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PRIMARY KEY | 模板ID |
| name | VARCHAR(100) | NOT NULL | 模板名称 |
| description | TEXT | | 模板描述 |
| thumbnail | VARCHAR(500) | | 缩略图URL |
| config | JSONB | NOT NULL | 模板配置 |
| required_level | VARCHAR(20) | NOT NULL DEFAULT 'free' | 所需会员等级 |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 更新时间 |

---

## 3. API设计规范

### 3.1 版本管理

- **V1**: 当前版本 `/api/v1/*`
- **V2**: 预留版本 `/api/v2/*`

### 3.2 响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "meta": {
    "timestamp": 1234567890,
    "request_id": "uuid"
  }
}
```

### 3.3 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "message": "错误描述",
  "error": {
    "type": "ValidationError",
    "field": "email",
    "detail": "邮箱格式不正确"
  },
  "meta": {
    "timestamp": 1234567890,
    "request_id": "uuid"
  }
}
```

### 3.4 用户模块API

| 端点 | 方法 | 说明 | 需要认证 |
|------|------|------|----------|
| `/api/v1/users/register` | POST | 用户注册 | 否 |
| `/api/v1/users/login` | POST | 用户登录 | 否 |
| `/api/v1/users/logout` | POST | 用户登出 | 是 |
| `/api/v1/users/me` | GET | 获取当前用户 | 是 |
| `/api/v1/users/me` | PUT | 更新用户信息 | 是 |
| `/api/v1/users/me/password` | PUT | 修改密码 | 是 |
| `/api/v1/users/verify/email` | POST | 验证邮箱 | 是 |
| `/api/v1/users/verify/phone` | POST | 验证手机 | 是 |
| `/api/v1/users/membership` | GET | 获取会员信息 | 是 |
| `/api/v1/users/membership/upgrade` | POST | 升级会员 | 是 |

---

## 4. 安全性设计

### 4.1 认证机制

- **JWT Token**: 用于API认证
- **Refresh Token**: 用于Token刷新
- **Session管理**: Redis存储会话

### 4.2 密码安全

- **哈希算法**: bcrypt (cost=12)
- **密码策略**: 至少8位，包含字母和数字

### 4.3 权限控制

| 角色 | 用户API | 作品API | 模板API | 管理API |
|------|---------|---------|---------|---------|
| user | ✓ | ✓(自己) | ✓ | ✗ |
| creator | ✓ | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✓ |

---

## 5. 部署与运维

### 5.1 Docker配置

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app

  redis:
    image: redis:7
    volumes:
      - redis_data:/data
```

### 5.2 监控告警

- **Grafana**: 可视化监控
- **Prometheus**: 指标收集
- **Alertmanager**: 告警管理
- **钉钉Webhook**: CRITICAL级别实时通知

---

## 6. 开发流程

### 6.1 阶段划分

1. **用户系统完善** → 测试 → 文档
2. **作品集 + 社区系统** → 测试 → 文档
3. **模板系统** → 测试 → 文档
4. **AI分镜生成增强** → 测试 → 文档
5. **视频生成优化** → 测试 → 文档
6. **会员付费系统** → 测试 → 文档
7. **数据分析后台** → 测试 → 文档

### 6.2 代码规范

- TypeScript严格模式
- ESLint + Prettier
- 单元测试覆盖率 > 80%
- 提交规范: `feat: xxx` / `fix: xxx` / `docs: xxx`

---

**文档版本**: v1.0  
**创建时间**: 2026-06-13  
**状态**: 待评审