# AI Director - API 文档

## 概述

本项目提供了与腾讯混元 AI 和可灵 AI 的集成接口，支持通过环境变量切换真实 API 调用与 Mock 模式。

---

## 环境变量配置

### 配置文件位置

`.env.local` - 本地开发环境变量（**不要提交到 Git**）

### 核心配置项

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `HUNYUAN_API_KEY` | 腾讯混元 API 密钥 | 无 |
| `KLING_API_KEY` | 可灵 AI Access Key | 无 |
| `KLING_SECRET_KEY` | 可灵 AI Secret Key | 无 |
| `KLING_API_BASE` | 可灵 API 基础地址 | `https://api-beijing.klingai.com` |
| `USE_REAL_AI` | 是否启用真实 AI | `false`（Mock 模式） |

### Mock 模式切换

```bash
# 开发测试：使用 Mock 数据（推荐）
USE_REAL_AI=false

# 生产环境：调用真实 API
USE_REAL_AI=true
```

### 可灵 API 区域说明

| 区域 | API 地址 | 说明 |
|------|----------|------|
| 国内（北京） | `https://api-beijing.klingai.com` | 默认，需要国内 Key |
| 国际（新加坡） | `https://api-singapore.klingai.com` | 需要国际 Key |

> **注意**：国内/国际域名的 Key **不互通**，需要在可灵控制台分别申请。

---

## 接口文档

### 1. 混元 AI 聊天接口

#### POST /api/chat

代理调用腾讯云混元 ChatCompletions 接口。

**请求体：**
```json
{
  "messages": [
    { "role": "user", "content": "帮我生成分镜脚本" }
  ],
  "model": "hunyuan-pro",      // 可选，默认 hunyuan-pro
  "temperature": 0.7,          // 可选，默认 0.7
  "maxTokens": 1024            // 可选，默认 1024
}
```

**响应（成功）：**
```json
{
  "content": "{\"shots\": [{\"num\": 1, \"desc\": \"开场特写...\", ...}]}",
  "model": "mock-hunyuan-pro",
  "usage": null,
  "isMock": true
}
```

**响应（真实模式）：**
```json
{
  "content": "生成的文本内容...",
  "model": "hunyuan-pro",
  "usage": { "prompt_tokens": 10, "completion_tokens": 50 }
}
```

**错误响应：**
- `400` - 请求体格式错误
- `502` - 上游 API 调用失败
- `503` - 未配置 API Key（仅 USE_REAL_AI=true 时）

#### GET /api/chat

健康检查，不泄露任何密钥。

**响应：**
```json
{
  "ok": true,
  "apiKeyConfigured": true,
  "useRealAI": false,
  "defaultModel": "mock-hunyuan-pro"
}
```

---

### 2. 可灵视频生成接口

#### POST /api/kling/generate

提交视频生成任务。

**请求体：**
```json
{
  "prompt": "一个美丽的风景",       // 必填
  "negativePrompt": "模糊, 低质量", // 可选
  "duration": 5,                   // 可选，默认 5（秒）
  "aspectRatio": "16:9",           // 可选，默认 16:9
  "model": "kling-v1",             // 可选，默认 kling-v1
  "image": { "data": "base64..." }, // 可选，图生视频
  "seed": 12345                    // 可选，随机种子
}
```

**响应（Mock 模式）：**
```json
{
  "taskId": "mock-1781144535622-zf625pjju",
  "status": "pending",
  "isMock": true,
  "message": "Mock 模式：视频生成任务已提交（模拟）"
}
```

**响应（真实模式）：**
```json
{
  "taskId": "real-task-id-xxx",
  "status": "submitted"
}
```

**错误响应：**
- `400` - 参数错误（prompt 必填）
- `502` - 上游调用失败
- `503` - 未配置 Key（仅 USE_REAL_AI=true 时）

#### GET /api/kling/task/[id]

查询任务状态。

**路径参数：**
- `id` - 任务 ID

**响应（pending/running）：**
```json
{
  "taskId": "mock-xxx",
  "status": "running",
  "progress": 45,
  "isMock": true
}
```

**响应（completed）：**
```json
{
  "taskId": "mock-xxx",
  "status": "completed",
  "videoUrl": "https://example.com/mock-video.mp4",
  "isMock": true
}
```

**状态说明：**
| 状态 | 说明 |
|------|------|
| `pending` | 等待中 |
| `running` | 生成中（含 progress 0-100） |
| `completed` | 完成（含 videoUrl） |
| `failed` | 失败 |

#### GET /api/kling/health

健康检查，不泄露任何密钥。

**响应：**
```json
{
  "ok": true,
  "apiKeyConfigured": true,
  "apiBase": "https://api-beijing.klingai.com",
  "useRealAI": false,
  "mode": "mock"
}
```

#### POST /api/kling/debug/verify（调试专用）

验证 JWT 生成是否正确（仅开发环境可用）。

**请求体：**
```json
{
  "ak": "your-access-key",
  "sk": "your-secret-key",
  "baseUrl": "https://api-beijing.klingai.com"
}
```

**响应：**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "decoded": {
    "iss": "your-access-key",
    "exp": 1781146335,
    "nbf": 1781144530
  },
  "baseUrl": "https://api-beijing.klingai.com"
}
```

---

## Mock 模式行为

### 混元 AI Mock

根据用户输入关键词返回不同的模拟响应：

| 关键词 | 响应内容 |
|--------|----------|
| 分镜、镜头、脚本 | 返回 JSON 格式的分镜数据 |
| 视频、创作、生成 | 返回视频生成相关提示 |
| 其他 | 返回通用模拟响应 |

**分镜数据格式：**
```json
{
  "shots": [
    { "num": 1, "desc": "开场特写镜头", "duration": 3, "camera": "推镜头", "lighting": "柔和灯光" },
    { "num": 2, "desc": "中景展示", "duration": 4, "camera": "移镜头", "lighting": "自然光" },
    { "num": 3, "desc": "全景展示", "duration": 3, "camera": "拉镜头", "lighting": "专业灯光" }
  ]
}
```

### 可灵 AI Mock

**任务状态模拟时序：**

| 时间 | 状态 | 响应字段 |
|------|------|----------|
| 0-3秒 | `pending` | 仅 status |
| 3-8秒 | `running` | status + progress(10-89) |
| 8秒+ | `completed` | status + videoUrl |

---

## 测试方法

### 1. 测试混元 API

```powershell
# 测试 POST（Mock 模式）
Invoke-WebRequest -UseBasicParsing -Method POST http://localhost:3001/api/chat `
  -ContentType 'application/json' `
  -Body '{"messages":[{"role":"user","content":"帮我生成分镜脚本"}]}'

# 测试 GET（健康检查）
Invoke-WebRequest -UseBasicParsing -Method GET http://localhost:3001/api/chat
```

### 2. 测试可灵 API

```powershell
# 提交视频生成任务
$response = Invoke-WebRequest -UseBasicParsing -Method POST http://localhost:3001/api/kling/generate `
  -ContentType 'application/json' `
  -Body '{"prompt":"测试视频"}'
$taskId = ($response.Content | ConvertFrom-Json).taskId
Write-Host "任务ID: $taskId"

# 查询任务状态（多次调用观察状态变化）
Invoke-WebRequest -UseBasicParsing -Method GET "http://localhost:3001/api/kling/task/$taskId"

# 健康检查
Invoke-WebRequest -UseBasicParsing -Method GET http://localhost:3001/api/kling/health
```

### 3. 运行单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --testPathPattern=apiChat.test.ts
npm test -- --testPathPattern=apiKling.test.ts

# 生成覆盖率报告
npm test -- --coverage
```

### 4. 验证可灵 JWT 生成

```powershell
# 使用调试接口验证 JWT
$body = @{ 
  ak = "your-access-key"; 
  sk = "your-secret-key"; 
  baseUrl = "https://api-beijing.klingai.com" 
} | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method POST http://localhost:3001/api/kling/debug/verify `
  -ContentType 'application/json' `
  -Body $body
```

---

## 切换到真实 API

### 步骤

1. **获取有效密钥**
   - 混元 AI：https://console.cloud.tencent.com/hunyuan
   - 可灵 AI：https://klingai.kuaishou.com/dev

2. **更新 .env.local**
   ```bash
   # 配置真实密钥
   HUNYUAN_API_KEY=your-hunyuan-key
   KLING_API_KEY=your-access-key
   KLING_SECRET_KEY=your-secret-key
   
   # 启用真实 AI
   USE_REAL_AI=true
   ```

3. **重启开发服务器**
   ```bash
   npm run dev
   ```

---

## 核心模块说明

### 服务端模块

| 文件 | 功能 | 运行环境 |
|------|------|----------|
| `src/app/api/chat/route.ts` | 混元 AI 代理接口 | Node.js |
| `src/app/api/kling/generate/route.ts` | 可灵视频生成接口 | Node.js |
| `src/app/api/kling/task/[id]/route.ts` | 可灵任务状态查询 | Node.js |
| `src/utils/klingServer.ts` | 可灵 JWT 认证与 API 调用核心 | Node.js |

### 客户端模块

| 文件 | 功能 |
|------|------|
| `src/utils/chatClient.ts` | 前端调用 /api/chat 的工具函数 |
| `src/utils/klingClient.ts` | 前端调用可灵接口的工具函数 |

### 类型定义

| 文件 | 功能 |
|------|------|
| `src/types/index.ts` | 通用类型定义（ShotData、VideoParams 等） |
| `src/types/auth.ts` | 认证相关类型定义 |

---

## 日志追踪

### 服务端日志

服务器控制台会输出以下日志：

```
# 混元 API
[MOCK] 生成模拟响应: 帮我生成分镜脚本 ...
[MOCK] 返回模拟响应

# 可灵 API
[MOCK] 可灵视频生成 - 返回模拟任务
[MOCK] 查询任务状态 - taskId: mock-xxx, status: running
```

### 日志级别

| 日志前缀 | 说明 |
|----------|------|
| `[MOCK]` | Mock 模式下的操作日志 |
| `[ERROR]` | 错误信息 |
| `[WARN]` | 警告信息 |

---

## 错误处理

### 前端错误处理

```typescript
import { chatWithAI } from '@/utils/chatClient';

try {
  const result = await chatWithAI(messages);
  // 处理成功响应
} catch (error) {
  console.error('API 调用失败:', error.message);
  // 显示用户友好的错误提示
}
```

### 常见错误码

| 状态码 | 原因 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式 |
| 502 | 上游 API 失败 | 重试或联系服务提供商 |
| 503 | 未配置 API Key | 检查 .env.local 配置 |

---

## 安全注意事项

1. **密钥安全**
   - 所有 API Key 仅在服务端使用，绝不暴露到前端
   - `.env.local` 已添加到 `.gitignore`，不会被提交
   - 生产环境使用 Vercel/AWS Secrets 管理密钥

2. **可灵 API 状态**
   - 当前可灵 API 密钥签名问题待技术支持确认
   - 建议在收到可灵技术支持回复后再启用真实可灵 API

3. **Mock 模式用途**
   - 开发测试时使用，避免消耗 API 额度
   - 前端功能验证无需真实 AI 能力

---

## 版本历史

| 版本 | 更新时间 | 更新内容 |
|------|----------|----------|
| 1.0 | 2026-06-11 | 初始版本，支持混元和可灵 API |

---

**版本**: 1.0  
**更新时间**: 2026-06-11  
**状态**: 开发中（可灵 API 待技术支持确认）