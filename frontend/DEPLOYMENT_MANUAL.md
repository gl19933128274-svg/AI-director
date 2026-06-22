# AI导演系统 V2.0 部署指南

## 1. 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 20.x | 运行时 |
| PostgreSQL | >= 16.x | 主数据库 |
| Redis | >= 7.x | 缓存/队列 |
| Docker | >= 24.x | 容器化部署 |

## 2. 配置说明

### 2.1 环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Redis配置
REDIS_URL="redis://localhost:6379"

# JWT密钥
JWT_SECRET="your-secret-key-here"

# 端口配置
PORT=3000

# 日志级别
LOG_LEVEL=info
```

### 2.2 数据库初始化

```bash
# 创建数据库
createdb -U username database_name

# 运行数据库迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

## 3. Docker 部署

### 3.1 Docker Compose

使用 `docker-compose.yml` 一键启动：

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 停止服务
docker-compose down
```

### 3.2 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 应用 | 3000 | 主应用服务 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Grafana | 3004 | 监控面板 |
| Prometheus | 9090 | 指标收集 |

## 4. 本地开发

### 4.1 启动开发服务器

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 4.2 测试

```bash
# 运行所有测试
npm test

# 运行指定测试
npm test -- --testPathPattern=user

# 生成测试覆盖率报告
npm run test:coverage
```

## 5. 部署脚本

### 5.1 启动监控服务

```bash
cd monitoring
docker-compose up -d
```

### 5.2 验证服务

```bash
# 检查应用状态
curl http://localhost:3000/api/v1/health

# 检查数据库连接
npx prisma studio
```

## 6. 运维指南

### 6.1 日志管理

```bash
# 查看应用日志
docker-compose logs app

# 查看数据库日志
docker-compose logs db

# 实时日志
docker-compose logs -f app
```

### 6.2 备份恢复

```bash
# 备份数据库
pg_dump -U username database_name > backup.sql

# 恢复数据库
psql -U username database_name < backup.sql
```

### 6.3 性能监控

- **Grafana**: http://localhost:3004
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## 7. API 文档

### 7.1 用户模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/users/register` | POST | 用户注册 |
| `/api/v1/users/login` | POST | 用户登录 |
| `/api/v1/users/me` | GET | 获取当前用户 |
| `/api/v1/users/me` | PUT | 更新用户信息 |

### 7.2 请求示例

```bash
# 用户注册
curl -X POST http://localhost:3000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","nickname":"用户"}'

# 用户登录
curl -X POST http://localhost:3000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 获取用户信息
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

---

**文档版本**: v2.0  
**创建时间**: 2026-06-13  
**状态**: 待部署验证