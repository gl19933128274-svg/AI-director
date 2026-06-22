# 可灵 API Key 更新操作手册

---

## 📋 文档概述

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-15 |
| 适用环境 | 开发 / 测试 / 生产 |
| 预计耗时 | 15-30 分钟 |

---

## 🎯 更新目标

1. ✅ 获取有效的可灵 API Key 和 Secret Key
2. ✅ 更新环境变量配置
3. ✅ 验证 API 可用性
4. ✅ 确保视频生成功能正常

---

## 🔍 问题背景

当前系统使用的可灵 API Key 无效，返回错误：
- **错误代码**: 1003（Authorization is not active）
- **错误代码**: 1000（Authorization signature is invalid）

---

## 📝 操作步骤

### 步骤 1: 获取有效的可灵 API Key

#### 1.1 登录可灵开发者平台

1. 打开浏览器访问：[可灵开发者平台](https://klingai.kuaishou.com/dev)
2. 使用账号密码登录（如果没有账号，请先注册）

#### 1.2 进入 API 管理页面

1. 登录后，点击顶部导航栏的「API 管理」
2. 进入「密钥管理」页面

#### 1.3 创建新的 API Key

| 步骤 | 操作 | 截图参考 |
|------|------|----------|
| 1 | 点击「创建密钥」按钮 | - |
| 2 | 填写密钥名称（如：AI-Director-Prod） | - |
| 3 | 选择密钥权限（至少勾选「视频生成」） | - |
| 4 | 点击「确认创建」 | - |
| 5 | **复制 Access Key 和 Secret Key**（⚠️ 仅显示一次） | - |

#### 1.4 验证密钥状态

确保新创建的密钥状态为「已激活」：
- ✅ 状态显示为绿色「已激活」
- ✅ 权限包含「视频生成」
- ✅ 记录创建时间和过期时间

---

### 步骤 2: 更新环境变量配置

#### 2.1 定位配置文件

配置文件路径：
```
frontend/.env.local
```

#### 2.2 修改配置内容

使用文本编辑器打开 `.env.local`，找到以下配置项：

```env
# 可灵 AI - 密钥（必填）
KLING_API_KEY=YOUR_NEW_ACCESS_KEY_HERE
KLING_SECRET_KEY=YOUR_NEW_SECRET_KEY_HERE
KLING_API_BASE=https://api-beijing.klingai.com
```

#### 2.3 更新密钥

将 `YOUR_NEW_ACCESS_KEY_HERE` 替换为您获取的新 Access Key，将 `YOUR_NEW_SECRET_KEY_HERE` 替换为新的 Secret Key。

**示例**:
```env
KLING_API_KEY=AetHynPYAdQQML9CTRdrFgD4efgdLrBR
KLING_SECRET_KEY=QCEgF9HmrnMb9bQpaDFGFn9mtfTFaA34
KLING_API_BASE=https://api-beijing.klingai.com
```

#### 2.4 验证配置文件

确保配置文件格式正确：
- 无语法错误
- Key 和 Value 之间无空格
- 无多余的引号

---

### 步骤 3: 重启开发服务器

#### 3.1 停止当前服务器（如果运行中）

按 `Ctrl + C` 停止开发服务器

#### 3.2 启动开发服务器

```bash
cd frontend
npm run dev
```

#### 3.3 验证服务器启动

确保服务器启动成功：
```
ready - started server on http://localhost:3001
```

---

### 步骤 4: 验证 API 可用性

#### 4.1 执行强制验证脚本

```bash
cd d:\黄高乐\新建文件夹\111
node scripts/force-verification.js
```

#### 4.2 验证标准

| 测试项 | 通过标准 |
|--------|----------|
| 可灵 API | ✅ 成功率 ≥ 80% |
| 混元 API | ✅ 成功率 = 100% |
| Fallback 机制 | ✅ 成功率 ≥ 80% |
| 端到端测试 | ✅ 成功率 = 100% |

#### 4.3 手动验证

打开浏览器访问：http://localhost:3001

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 首页加载 | 访问首页 | ✅ 正常显示 |
| 分镜生成 | 输入产品描述 | ✅ 成功生成分镜 |
| 视频生成 | 点击视频生成按钮 | ✅ 成功生成视频任务 |
| 任务状态 | 查看任务列表 | ✅ 显示任务状态 |

---

### 步骤 5: 生产环境部署

#### 5.1 更新生产环境配置

根据部署平台更新环境变量：

| 平台 | 更新方式 |
|------|----------|
| Vercel | Dashboard → Environment Variables |
| AWS | Secrets Manager / EC2 User Data |
| Docker | docker-compose.yml / Kubernetes Secrets |
| 传统服务器 | `.env.local` + 重启服务 |

#### 5.2 重启生产服务

```bash
npm run build
npm run start
```

#### 5.3 生产环境验证

```bash
# 健康检查
curl -s http://your-domain.com/api/storyboard/generate | jq .

# 视频生成测试
curl -s -X POST http://your-domain.com/api/kling/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","duration":5}' | jq .
```

---

## 🛡️ 回滚方案

### 紧急回滚步骤

#### 方案 A: 快速回滚

```bash
# 恢复备份的配置
cp frontend/.env.local.backup.* frontend/.env.local

# 重启服务
npm run build
npm run start
```

#### 方案 B: 功能降级

```bash
# 临时禁用真实 AI，使用 Mock
# 更新 .env.local
USE_REAL_AI=false
```

### 回滚触发条件

| 条件 | 操作 |
|------|------|
| API 调用失败率 > 5% | 立即回滚 |
| 响应时间 > 5秒 | 立即回滚 |
| 用户投诉 | 评估后回滚 |

---

## 📊 验证检查清单

### ✅ 预更新检查

- [ ] 已备份当前配置文件
- [ ] 已获取有效的 API Key 和 Secret Key
- [ ] 已确认密钥状态为「已激活」
- [ ] 已通知相关团队

### ✅ 后更新检查

- [ ] 开发环境测试通过
- [ ] 测试环境验证通过
- [ ] 生产环境部署完成
- [ ] 监控指标正常
- [ ] 用户无投诉

---

## 📞 常见问题

### Q1: 获取不到 API Key？

**解决方案**:
1. 确认账号已通过实名认证
2. 确认账号有 API 调用权限
3. 联系可灵技术支持

### Q2: Key 已激活但仍报错？

**解决方案**:
1. 检查 Key 是否正确复制（无多余空格）
2. 确认使用的是正确的域名（国内/国际）
3. 等待 5-10 分钟后重试（密钥生效可能有延迟）

### Q3: 请求超时？

**解决方案**:
1. 检查网络连接
2. 确认防火墙设置
3. 尝试更换 API 域名

---

## 📋 联系信息

| 角色 | 联系方式 |
|------|----------|
| 可灵技术支持 | [帮助中心](https://klingai.kuaishou.com/help) |
| 开发负责人 | XXX |
| DevOps | XXX |

---

## 📝 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-06-15 | 初始版本 |

---

*文档结束*