# 钉钉Webhook告警接入配置指南

## 一、前置准备

### 1.1 环境要求
- Node.js >= 14.x
- Docker & Docker Compose（可选，用于监控组件）
- 钉钉企业/团队账号

### 1.2 文件结构

```
frontend/
└── monitoring/
    ├── alertmanager.yml      # Alertmanager 告警配置
    ├── alerts.yml            # 告警规则定义
    ├── docker-compose.yml    # Docker 编排配置
    ├── prometheus.yml        # Prometheus 配置
    ├── dingding-alert.js     # 钉钉告警转发服务
    └── .env                  # 环境变量配置
```

---

## 二、创建钉钉机器人

### 步骤1：进入钉钉群设置

1. 打开钉钉客户端，进入需要接收告警的群聊
2. 点击群聊右上角「...」 -> 「群设置」

### 步骤2：添加自定义机器人

1. 在群设置中找到「群机器人」 -> 「添加机器人」
2. 选择「自定义」 -> 「添加」

### 步骤3：配置机器人信息

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 机器人名称 | 机器人在群中的显示名称 | 服务告警机器人 |
| 安全设置 | 建议选择「自定义关键词」 | `CRITICAL`, `WARNING` |
| 自定义关键词 | 消息必须包含的关键词 | `CRITICAL`, `WARNING` |

### 步骤4：获取 Webhook URL

配置完成后，复制生成的 Webhook URL：

```
https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxxxxxx
```

**提取 Access Token**：URL 中 `access_token=` 后面的部分，例如：
```
DINGDING_ROBOT_TOKEN=xxxxxxxxxxxx
```

---

## 三、配置告警系统

### 3.1 设置环境变量

编辑 `monitoring/.env` 文件：

```env
# 钉钉机器人 Access Token
DINGDING_ROBOT_TOKEN=your-dingding-robot-token-here

# 告警配置
ALERT_SEVERITY=critical,warning
ALERT_RESOLVE_TIMEOUT=5m
ALERT_REPEAT_INTERVAL=1h

# 端口配置
PROMETHEUS_PORT=9090
GRAFANA_PORT=3004
ALERTMANAGER_PORT=9093
DINGDING_ALERT_PORT=8080
```

### 3.2 告警规则说明

当前系统已配置以下 CRITICAL 级别告警：

| 告警名称 | 触发条件 | 说明 |
|----------|----------|------|
| `StoryboardProductAnalysisFailed` | 产品特征分析失败率 > 10% | 无法正确识别产品类型 |
| `StoryboardAIParseFormatError` | AI 响应格式错误率 > 10% | 无法解析 AI 返回内容 |
| `StoryboardAIParseFailed` | AI 响应解析失败率 > 5% | 解析逻辑异常 |
| `StoryboardAIParseEmptyResponse` | AI 响应为空率 > 5% | AI 服务未返回内容 |
| `StoryboardServiceHighErrorRate` | 服务错误率 > 10% | 整体服务异常 |
| `StoryboardServiceLowSuccessRate` | 服务成功率 < 95% | API 接口成功率下降 |
| `StoryboardAPIHighErrorRate` | API 错误率 > 5% | API 接口异常 |

---

## 四、启动服务

### 4.1 方式一：使用 Node.js 直接运行（推荐）

**启动钉钉告警转发服务**：

```bash
cd monitoring
DINGDING_ROBOT_TOKEN=your-token-here node dingding-alert.js
```

**启动监控组件（可选）**：

```bash
cd monitoring
docker-compose up -d
```

### 4.2 方式二：使用 Docker Compose（完整方案）

**更新 docker-compose.yml 添加告警服务**：

```yaml
services:
  # ... 其他服务 ...
  
  dingding-alert:
    image: node:18-alpine
    container_name: dingding-alert
    ports:
      - "${DINGDING_ALERT_PORT:-8080}:8080"
    volumes:
      - ./dingding-alert.js:/app/dingding-alert.js
    environment:
      - DINGDING_ROBOT_TOKEN=${DINGDING_ROBOT_TOKEN}
      - PORT=8080
    working_dir: /app
    command: node dingding-alert.js
    restart: unless-stopped
    networks:
      - monitoring
```

**启动所有服务**：

```bash
cd monitoring
docker-compose up -d
```

---

## 五、测试验证

### 5.1 测试告警服务

```bash
# 测试健康检查
curl http://localhost:8080

# 测试告警发送（模拟 Alertmanager 格式）
curl -X POST http://localhost:8080/alert \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [{
      "labels": {
        "alertname": "TestAlert",
        "severity": "critical",
        "service": "test-service",
        "component": "test"
      },
      "annotations": {
        "summary": "测试告警",
        "description": "这是一条测试告警消息",
        "impact": "测试影响",
        "action": "测试操作"
      },
      "startsAt": "2024-01-01T12:00:00Z",
      "value": "100"
    }]
  }'
```

### 5.2 检查服务状态

```bash
# 查看告警服务日志
docker logs -f dingding-alert

# 查看 Alertmanager 状态
curl http://localhost:9093/api/v2/status

# 查看 Prometheus 告警状态
curl http://localhost:9090/api/v1/alerts
```

---

## 六、告警消息格式

### CRITICAL 级别告警（@所有人）

```
🚨 【CRITICAL】StoryboardServiceHighErrorRate

### 基本信息
- 级别: CRITICAL
- 服务: storyboard
- 组件: all

### 详细描述
分镜服务整体错误率超过 10%，当前值: 0.15

### 影响与建议
- 影响: 影响用户体验
- 操作: 立即检查服务日志，定位问题根源

---
⏰ 触发时间: 2024-01-01 12:00:00
📊 当前值: 0.15
🔗 [查看 Grafana](http://localhost:3004)
```

### WARNING 级别告警（不@人）

```
⚠️ 【WARNING】StoryboardServiceHighLatency

### 基本信息
- 级别: WARNING
- 服务: storyboard
- 组件: all

### 详细描述
分镜服务平均耗时超过 10 秒，当前值: 12.5 秒

### 建议操作
检查各组件性能，优化慢查询

---
⏰ 触发时间: 2024-01-01 12:00:00
📊 当前值: 12.5
```

---

## 七、生产环境部署建议

### 7.1 安全配置

1. **使用环境变量管理敏感信息**
   - 不要将 Token 硬编码到代码中
   - 使用 Docker Secrets 或云服务密钥管理

2. **配置 IP 白名单**
   - 在钉钉机器人设置中配置允许的 IP 地址
   - 限制只有监控服务器能调用 Webhook

### 7.2 高可用配置

```bash
# 使用 PM2 管理告警服务
npm install -g pm2
pm2 start dingding-alert.js --name dingding-alert --env DINGDING_ROBOT_TOKEN=your-token

# 设置开机自启
pm2 startup
pm2 save
```

### 7.3 监控告警服务本身

添加对告警转发服务的监控：

| 监控项 | 阈值 | 告警级别 |
|--------|------|----------|
| 服务不可用 | 连续 3 次检测失败 | CRITICAL |
| 消息发送失败率 | > 5% | WARNING |
| 平均响应时间 | > 2s | WARNING |

---

## 八、常见问题

### Q1：钉钉消息发送失败

**可能原因**：
- Token 配置错误
- 安全设置中未添加自定义关键词
- 网络不通

**解决方案**：
```bash
# 检查 Token 是否正确
curl http://localhost:8080

# 检查网络连通性
curl -v https://oapi.dingtalk.com/robot/send?access_token=your-token
```

### Q2：Alertmanager 无法连接到告警服务

**可能原因**：
- 端口未开放
- Docker 网络配置问题
- 服务未启动

**解决方案**：
```bash
# 使用 host.docker.internal 访问宿主机
# 或检查 Docker 网络配置
docker network inspect monitoring
```

### Q3：告警重复发送

**解决方案**：
- 调整 `repeat_interval` 参数（默认 1 小时）
- 配置 `inhibit_rules` 抑制重复告警

---

## 九、相关链接

- [钉钉机器人官方文档](https://open.dingtalk.com/document/robots/custom-robot-access)
- [Prometheus Alertmanager 配置](https://prometheus.io/docs/alerting/latest/configuration/)
- [Grafana 告警配置](https://grafana.com/docs/grafana/latest/alerting/)
