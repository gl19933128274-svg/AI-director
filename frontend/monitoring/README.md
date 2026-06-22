# AI导演系统可观测性平台

> 用于灰度发布期间的系统监控，支持 Stable vs Canary 版本对比

## 功能特性

- **Prometheus 指标采集**：API成功率、请求延迟、错误率、资源使用率
- **Grafana Dashboard**：实时流量监控、灰度版本对比、系统健康状态
- **告警机制**：钉钉/邮件通知，支持灰度发布关键告警
- **版本区分**：支持按 `track=stable|canary` 标签区分版本

## 目录结构

```
monitoring/
├── prometheus/
│   ├── prometheus.yml              # Prometheus 主配置
│   ├── prometheus-configmap.yaml   # K8s ConfigMap
│   └── prometheus-values.yaml      # Helm values
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml     # 数据源配置
│   │   └── dashboards/
│   │       └── dashboards.yml      # Dashboard 配置
│   ├── dashboards/
│   │   ├── canary-comparison.json   # 灰度对比面板
│   │   └── system-health.json      # 系统健康面板
│   └── grafana-values.yaml         # Helm values
├── alertmanager/
│   └── alertmanager.yml            # 告警通知配置
├── k8s/
│   └── namespace.yaml              # K8s 命名空间和 RBAC
├── docker-compose.yml              # Docker Compose 快速启动
├── start-monitoring.sh             # Docker 启动脚本
├── deploy-k8s.sh                    # K8s 部署脚本
└── README.md                        # 本文档
```

## 快速启动 (Docker)

### 方式1: 一键启动

```bash
cd monitoring
docker-compose up -d
```

### 方式2: 使用脚本

```bash
cd monitoring
chmod +x start-monitoring.sh
./start-monitoring.sh
```

### 访问地址

| 服务 | 地址 | 默认凭据 |
|------|------|---------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3030 | admin / admin123 |
| Node Exporter | http://localhost:9100 | - |
| Alertmanager | http://localhost:9093 | - |
| cAdvisor | http://localhost:8080 | - |

## Kubernetes 部署

### 前置条件

- Kubernetes 1.19+
- Helm 3.x
- kubectl 配置完成

### 部署步骤

```bash
cd monitoring
chmod +x deploy-k8s.sh
./deploy-k8s.sh
```

## Prometheus 监控指标

### 核心指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `http_requests_total` | Counter | HTTP 请求总数 |
| `http_request_duration_seconds` | Histogram | 请求延迟分布 |
| `http_requests_total{status="5xx"}` | Counter | 5xx 错误数 |
| `video_generation_tasks_total` | Counter | 视频生成任务数 |
| `storyboard_generation_duration_seconds` | Histogram | 分镜生成延迟 |

### 资源指标

| 指标名 | 说明 |
|--------|------|
| `container_cpu_usage_seconds_total` | CPU 使用时间 |
| `container_memory_usage_bytes` | 内存使用量 |
| `node_memory_MemAvailable_bytes` | 可用内存 |

## Grafana Dashboard

### Dashboard 1: 灰度版本对比

- **成功率对比**：Stable vs Canary 成功率实时对比
- **延迟对比**：P95/P99 延迟对比
- **错误率对比**：5xx 错误率对比
- **流量分布**：按版本显示请求速率

### Dashboard 2: 系统健康监控

- **基础设施**：CPU/内存/磁盘使用率
- **AI 服务**：视频生成失败率、分镜生成延迟
- **数据库**：连接池使用率、查询延迟、缓存命中率

## 告警规则

### 关键告警

| 告警名称 | 触发条件 | 严重程度 |
|----------|----------|----------|
| `APISuccessRateLow` | 成功率 < 99% | Critical |
| `HTTP5xxErrorRateHigh` | 5xx 错误率 > 1% | Critical |
| `HTTPRequestLatencyCritical` | P99 延迟 > 1s | Critical |
| `CanarySuccessRateLowerThanStable` | 灰度成功率低于稳定版 5% | Warning |
| `StopCanaryExpansion` | 灰度指标触发停止扩容条件 | Critical |

## 版本标签

Prometheus 指标通过以下标签区分版本：

| 标签 | 值 | 说明 |
|------|-----|------|
| `track` | `stable` / `canary` | 跟踪版本 |
| `version` | `v1-stable` / `v2-canary` | 版本号 |
| `pod` | pod 名称 | Pod 标识 |

## 常见问题

### Q: 如何查看特定版本的指标？

```promql
# 查看 Canary 版本指标
http_requests_total{track="canary"}

# 对比两个版本的成功率
sum(rate(http_requests_total{status=~"2..", track="stable"}[5m])) 
  by (track) 
/ sum(rate(http_requests_total{track="stable"}[5m])) by (track)
```

### Q: 如何调整灰度流量比例？

```bash
# 修改 Ingress canary weight
kubectl annotate ingress ai-director-canary-ingress \
  nginx.ingress.kubernetes.io/canary-weight=20 --overwrite
```

### Q: 如何添加新的监控指标？

1. 在 API 服务中暴露 `/metrics` 端点
2. 在 `prometheus.yml` 中添加 scrape job
3. 在 Grafana 中创建新的 Panel

## 维护

### 更新 Prometheus 配置

```bash
# 热更新 (无需重启)
curl -X POST http://localhost:9090/-/reload
```

### 更新 Grafana Dashboard

Dashboard 文件位于 `grafana/dashboards/` 目录，修改后自动加载。

### 日志查看

```bash
# Prometheus 日志
docker-compose logs -f prometheus

# Grafana 日志
docker-compose logs -f grafana
```

## License

MIT
