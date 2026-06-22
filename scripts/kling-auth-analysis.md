# 可灵 API 鉴权失败详细分析报告

## 🔍 问题诊断

### 1. 当前鉴权实现分析

基于代码审查，发现以下潜在问题：

#### 问题 1: JWT Token 生成逻辑
```typescript
// 当前实现
const token = jwt.sign(
  {
    iss: ak,
    exp: now + 1800,
    nbf: now - 5,
  },
  sk,
  {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' },
  }
);
```

**潜在问题**:
- ✅ 算法正确 (HS256)
- ✅ 时间戳格式正确
- ✅ Payload 结构正确
- ⚠️ 缺少 `iat` (issued at) 字段
- ⚠️ 缺少详细的调试日志

#### 问题 2: 时间戳精度
```typescript
const now = Math.floor(Date.now() / 1000);
```

**潜在问题**:
- ✅ 使用秒级时间戳（正确）
- ✅ 时间偏差容忍度合理（5秒）
- ⚠️ 缺少服务器时间同步检查

#### 问题 3: API Key 配置
```typescript
const ak = process.env.KLING_API_KEY;
const sk = process.env.KLING_SECRET_KEY;
```

**当前配置**:
- `KLING_API_KEY`: `AeEbKL8eBbGgCNye9ENQmeFeTYJBtyCQ`
- `KLING_SECRET_KEY`: `BNRap9rbTpPGMGLdCaH4nnGythLhJPDD`

**潜在问题**:
- ⚠️ Key 长度检查缺失
- ⚠️ Key 格式验证缺失
- ⚠️ Key 是否过期或失效未知

#### 问题 4: HTTP 400 错误分析

**HTTP 400 错误可能原因**:
1. ❌ 鉴权失败 (最可能)
2. ❌ 请求格式错误
3. ❌ 参数验证失败
4. ❌ Token 格式不正确
5. ❌ 时间戳超出允许范围

---

## 🛠️ 修复方案

### 修复 1: 改进 JWT Token 生成

```typescript
// 修复后的 Token 生成
const payload = {
  iss: ak,           // Access Key
  exp: now + 1800,   // 30分钟后过期
  nbf: now - 5,      // 5秒前生效
  iat: now,          // 签发时间（新增）
  sub: 'kling-api'   // 主题（新增）
};

const token = jwt.sign(
  payload,
  sk,
  {
    algorithm: 'HS256',
    header: { 
      alg: 'HS256', 
      typ: 'JWT',
      kid: ak.substring(0, 8) // Key ID（新增）
    }
  }
);
```

### 修复 2: 增强凭证验证

```typescript
function readCredentials(): { ak: string; sk: string } | null {
  const ak = process.env.KLING_API_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  
  // 基础验证
  if (!ak || !sk) return null;
  
  // 格式验证
  if (ak.length < 10 || sk.length < 10) {
    console.error('[Kling] Credentials too short');
    return null;
  }
  
  // 字符验证（只允许字母数字）
  if (!/^[a-zA-Z0-9]+$/.test(ak) || !/^[a-zA-Z0-9]+$/.test(sk)) {
    console.error('[Kling] Credentials contain invalid characters');
    return null;
  }
  
  return { ak, sk };
}
```

### 修复 3: 添加调试日志

```typescript
const DEBUG_MODE = process.env.KLING_DEBUG === 'true';

function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[Kling Debug] ${message}`, data || '');
  }
}

// 在关键位置添加调试日志
debugLog('Generating token...', { 
  ak: ak.substring(0, 10) + '...',
  now,
  nowISO: new Date(now * 1000).toISOString()
});
```

### 修复 4: 改进错误处理

```typescript
export async function callKling<T = unknown>(input: SignedRequestInput): Promise<T> {
  try {
    const headers = buildKlingAuthHeaders(input);
    if (!headers) {
      throw new Error('Authentication failed: No credentials');
    }

    const response = await fetch(url, {
      method: input.method,
      headers,
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: AbortSignal.timeout(60000) // 60秒超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail;
      
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        errorDetail = errorText;
      }
      
      throw new Error(
        `Kling API error: ${response.status} ${response.statusText}\n` +
        `Detail: ${JSON.stringify(errorDetail)}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Kling API request timeout');
    }
    throw error;
  }
}
```

---

## 🧪 测试建议

### 测试 1: Token 生成测试
```bash
# 启用调试模式
KLING_DEBUG=true node -e "
const jwt = require('jsonwebtoken');
const ak = 'AeEbKL8eBbGgCNye9ENQmeFeTYJBtyCQ';
const sk = 'BNRap9rbTpPGMGLdCaH4nnGythLhJPDD';
const now = Math.floor(Date.now() / 1000);

const payload = {
  iss: ak,
  exp: now + 1800,
  nbf: now - 5,
  iat: now
};

const token = jwt.sign(payload, sk, { algorithm: 'HS256' });
console.log('Token:', token);

// 验证 Token
try {
  const decoded = jwt.verify(token, sk);
  console.log('Verified:', decoded);
} catch (error) {
  console.log('Verification failed:', error.message);
}
"
```

### 测试 2: API 调用测试
```bash
# 使用 curl 测试
curl -X POST 'https://api-beijing.klingai.com/v1/videos/text2video' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d '{
    "model_name": "kling-v1",
    "prompt": "Test video generation",
    "duration": 5,
    "aspect_ratio": "16:9"
  }'
```

---

## 📋 修复优先级

### 优先级 1: 立即修复
1. ✅ 添加 `iat` 字段到 JWT payload
2. ✅ 增强凭证格式验证
3. ✅ 添加调试日志

### 优先级 2: 短期修复
1. ✅ 改进错误处理
2. ✅ 添加请求超时控制
3. ✅ 优化 Token 缓存逻辑

### 优先级 3: 长期优化
1. ✅ 添加 Key 轮换机制
2. ✅ 实现请求重试逻辑
3. ✅ 添加性能监控

---

## 🎯 预期结果

修复后应该能够：
1. ✅ 成功生成有效的 JWT Token
2. ✅ 通过可灵 API 鉴权
3. ✅ 成功调用视频生成接口
4. ✅ 返回 HTTP 200 状态码
5. ✅ 获取有效的 task_id

---

## 📞 下一步行动

1. **立即**: 应用修复代码到 `klingServer.ts`
2. **测试**: 重新运行强制验证脚本
3. **监控**: 查看调试日志确认问题解决
4. **部署**: 验证通过后部署到生产环境

---

*报告生成时间: 2026-06-15*
*分析版本: v1.0*