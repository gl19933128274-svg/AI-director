# AI导演系统 Kubernetes 灰度发布配置

> 支持渐进式灰度发布：10% → 20% → 50% → 100%，每个阶段自动验证监控指标

## 功能特性

- ✅ **渐进式流量分配**：10% → 20% → 50% → 100%
- ✅ **Header 路由**：`X-Canary: always/never` 强制路由
- ✅ **Cookie 持久化**：`canary=true/false` 保持用户会话一致性
- ✅ **自动指标验证**：每个阶段验证成功率 ≥ 95%
- ✅ **快速暂停/恢复**：支持手动暂停和恢复发布流程
- ✅ **一键回滚**：紧急回滚和完整回滚两种模式

## 目录结构

```
k8s-rollout/
├── deployment/
│   ├── ai-director-stable.yaml   # 稳定版本部署 (v1.0)
│   └── ai-director-canary.yaml   # 灰度版本部署 (v2.0)
├── service/
│   ├── ai-director-stable.yaml   # 稳定版本服务
│   └── ai-director-canary.yaml   # 灰度版本服务
├── ingress/
│   ├── ai-director-stable.yaml   # 稳定版本入口
│   └── ai-director-canary.yaml   # 灰度版本入口 (支持流量切分)
├── scripts/
│   ├── rollout.sh                # 灰度发布主脚本
│   ├── rollback.sh               # 回滚脚本
│   └── verify.sh                 # 指标验证脚本
└── README.md                     # 本文档
```

## 快速开始

### 1. 部署基础资源

```bash
# 部署稳定版本
kubectl apply -f deployment/ai-director-stable.yaml
kubectl apply -f service/ai-director-stable.yaml
kubectl apply -f ingress/ai-director-stable.yaml

# 部署灰度版本
kubectl apply -f deployment/ai-director-canary.yaml
kubectl apply -f service/ai-director-canary.yaml
kubectl apply -f ingress/ai-director-canary.yaml
```

### 2. 执行灰度发布

```bash
cd scripts
chmod +x rollout.sh rollback.sh verify.sh

# 开始灰度发布流程
./rollout.sh --start
```

### 3. 手动控制流量比例

```bash
# 设置灰度流量为 10%
./rollout.sh --set-weight 10

# 设置灰度流量为 50%
./rollout.sh --set-weight 50

# 设置灰度流量为 100%
./rollout.sh --set-weight 100
```

### 4. 查看发布状态

```bash
./rollout.sh --status
```

### 5. 暂停/恢复发布

```bash
# 暂停发布流程
./rollout.sh --pause

# 恢复发布流程
./rollout.sh --resume
```

### 6. 回滚

```bash
# 紧急回滚（仅切回流量）
./rollback.sh --emergency

# 完整回滚（切回流量 + 缩容灰度部署）
./rollback.sh --complete
```

## 灰度发布流程

```
Phase 1: 10% 流量
    ↓
验证成功率 ≥ 95%
    ↓
用户确认继续
    ↓
Phase 2: 20% 流量
    ↓
验证成功率 ≥ 95%
    ↓
用户确认继续
    ↓
Phase 3: 50% 流量
    ↓
验证成功率 ≥ 95%
    ↓
用户确认继续
    ↓
Phase 4: 100% 流量 (全量发布)
    ↓
发布完成
```

## 流量路由机制

### Header 路由

```bash
# 强制使用灰度版本
curl -H "X-Canary: always" https://api.aidirector.example.com/api/v1/users/me

# 强制使用稳定版本
curl -H "X-Canary: never" https://api.aidirector.example.com/api/v1/users/me
```

### Cookie 持久化

```bash
# 设置 Cookie 后，后续请求保持路由到同一版本
curl -b "canary=true" https://api.aidirector.example.com/api/v1/users/me
```

### 权重分配

```bash
# 通过 Ingress annotation 控制流量比例
kubectl annotate ingress ai-director-canary \
    nginx.ingress.kubernetes.io/canary-weight="10" \
    --overwrite -n production
```

## 监控指标验证

### 验证脚本

```bash
# 执行一次指标验证
./verify.sh --validate

# 持续监控模式
./verify.sh --monitor

# 设置自定义阈值验证
./verify.sh --threshold 99
```

### 监控指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| 成功率 | ≥ 95% | HTTP 2xx 响应占比 |
| 错误率 | < 1% | HTTP 5xx 响应占比 |
| P95延迟 | < 500ms | 请求延迟 |
| Pod就绪 | 100% | 部署健康状态 |

## 脚本命令汇总

### rollout.sh

| 命令 | 说明 |
|------|------|
| `--start` | 开始灰度发布流程 |
| `--pause` | 暂停发布流程 |
| `--resume` | 恢复发布流程 |
| `--rollback` | 执行回滚 |
| `--status` | 查看发布状态 |
| `--set-weight N` | 设置灰度流量比例 |
| `--help` | 显示帮助 |

### rollback.sh

| 命令 | 说明 |
|------|------|
| `--emergency` | 紧急回滚（仅切回流量） |
| `--complete` | 完整回滚（切回流量 + 缩容） |
| `--help` | 显示帮助 |

### verify.sh

| 命令 | 说明 |
|------|------|
| `--validate` | 执行一次指标验证 |
| `--monitor` | 持续监控模式 |
| `--threshold N` | 设置成功率阈值 |
| `--help` | 显示帮助 |

## 环境变量配置

```bash
# 命名空间
export NAMESPACE="production"

# Prometheus 地址
export PROMETHEUS_URL="http://prometheus.monitoring:9090"

# 成功率阈值
export SUCCESS_THRESHOLD="95"

# 最大等待时间（分钟）
export MAX_WAIT_MINUTES="30"
```

## 注意事项

1. **Prometheus 访问**：确保脚本能够访问 Prometheus 服务
2. **权限要求**：需要 Kubernetes admin 权限执行脚本
3. **网络策略**：确保 Ingress Controller 能够访问后端服务
4. **SSL 证书**：确保 TLS 证书已正确配置

## 故障排查

### 常见问题

| 问题 | 排查方法 |
|------|----------|
| 流量未切分 | 检查 Ingress annotation 配置 |
| 指标验证失败 | 检查 Prometheus 指标采集 |
| Pod 未就绪 | 检查容器镜像和健康检查 |
| 发布流程卡住 | 检查是否存在暂停标记 `/tmp/canary-pause` |

### 日志查看

```bash
# 查看灰度版本日志
kubectl logs -f deployment/ai-director-canary -n production

# 查看 Ingress Controller 日志
kubectl logs -f deployment/nginx-ingress-controller -n ingress-nginx
```
