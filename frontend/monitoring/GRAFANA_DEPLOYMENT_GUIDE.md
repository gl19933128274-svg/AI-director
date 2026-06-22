# Grafana Dashboard 部署方案

## 一、部署概述

本方案使用 Docker Compose 部署完整的监控系统，包括：
- **Prometheus** - 指标采集和存储
- **Grafana** - 可视化监控面板
- **Alertmanager** - 告警管理
- **Node Exporter** - 系统指标采集

---

## 二、快速部署

### 2.1 前置要求

- Docker Desktop 或 Docker Engine
- Docker Compose v2.0+
- 至少 2GB 可用内存

### 2.2 一键启动

```bash
cd monitoring

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f grafana
```

### 2.3 访问地址

| 服务 | 地址 | 默认账号 |
|------|------|----------|
| Grafana | http://localhost:3004 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Alertmanager | http://localhost:9093 | - |

---

## 三、监控面板说明

### 3.1 Dashboard 面板列表

| 面板名称 | 说明 | 刷新间隔 |
|----------|------|----------|
| API 成功率 | 实时成功率仪表盘 | 5s |
| 平均响应时间 | API 平均延迟 | 5s |
| 错误率 | 错误请求百分比 | 5s |
| CPU 使用率 | 进程 CPU 占用 | 5s |
| API 响应时间分布 | P50/P95/P99 时序图 | 5s |
| 请求吞吐量 | QPS 时序图 | 5s |
| 内存使用情况 | 内存/堆内存趋势 | 5s |
| CPU 使用率趋势 | CPU 使用历史 | 5s |
| 当前告警 | 活跃告警列表 | 5s |

### 3.2 告警阈值配置

| 指标 | 正常 | 警告 | 严重 |
|------|------|------|------|
| 成功率 | > 95% | 90-95% | < 90% |
| 响应时间 | < 1s | 1-5s | > 5s |
| 错误率 | < 5% | 5-10% | > 10% |
| CPU 使用率 | < 70% | 70-90% | > 90% |

---

## 四、配置文件说明

### 4.1 目录结构

```
monitoring/
├── docker-compose.yml          # Docker 编排配置
├── prometheus.yml              # Prometheus 配置
├── alerts.yml                  # 告警规则
├── alertmanager.yml            # 告警路由配置
├── .env                        # 环境变量
├── grafana/
│   ├── dashboards/
│   │   └── storyboard-dashboard.json  # Dashboard 配置
│   └── provisioning/
│       ├── datasources/
│       │   └── datasources.yml        # 数据源配置
│       └── dashboards/
│           └── dashboard-providers.yml # Dashboard 提供者配置
├── dingding-alert.js           # 钉钉告警服务
└── DINGDING_ALERT_GUIDE.md     # 告警配置指南
```

### 4.2 环境变量配置

编辑 `.env` 文件：

```env
# 钉钉机器人配置
DINGDING_ROBOT_TOKEN=your-token-here

# Grafana 配置
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_PORT=3004

# Prometheus 配置
PROMETHEUS_PORT=9090
ALERTMANAGER_PORT=9093
```

---

## 五、常用操作

### 5.1 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker exec -it grafana /bin/bash
```

### 5.2 数据持久化

数据存储在 Docker volumes 中：

```bash
# 查看 volumes
docker volume ls

# 备份 Grafana 数据
docker run --rm -v monitoring_grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data

# 恢复 Grafana 数据
docker run --rm -v monitoring_grafana_data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /
```

### 5.3 更新 Dashboard

```bash
# 方式一：通过 Grafana UI 导入
# 1. 访问 http://localhost:3004
# 2. Dashboards -> Import -> Upload JSON file

# 方式二：更新配置文件后重启
docker-compose restart grafana
```

---

## 六、自定义配置

### 6.1 添加新的监控指标

编辑 `prometheus.yml`：

```yaml
scrape_configs:
  - job_name: 'your-service'
    static_configs:
      - targets: ['localhost:8080']
```

### 6.2 添加新的告警规则

编辑 `alerts.yml`：

```yaml
- alert: YourCustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "告警描述"
    description: "详细说明"
```

### 6.3 自定义 Dashboard

1. 访问 Grafana UI
2. 创建新的 Dashboard
3. 添加 Panel 并配置查询
4. 导出 JSON 并保存到 `grafana/dashboards/`

---

## 七、生产环境建议

### 7.1 安全配置

```yaml
# docker-compose.yml
grafana:
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    - GF_SECURITY_SECRET_KEY=${GRAFANA_SECRET_KEY}
    - GF_SECURITY_COOKIE_SECURE=true
    - GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION=false
```

### 7.2 高可用配置

```yaml
# 使用外部 Prometheus
grafana:
  environment:
    - GF_DATABASE_TYPE=postgres
    - GF_DATABASE_HOST=postgres:5432
    - GF_DATABASE_NAME=grafana
    - GF_DATABASE_USER=grafana
    - GF_DATABASE_PASSWORD=${GRAFANA_DB_PASSWORD}
```

### 7.3 资源限制

```yaml
grafana:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

---

## 八、故障排查

### 8.1 Grafana 无法启动

```bash
# 检查日志
docker-compose logs grafana

# 常见问题
# 1. 权限问题
sudo chown -R 472:472 grafana_data

# 2. 端口冲突
netstat -tlnp | grep 3004
```

### 8.2 Prometheus 无法采集数据

```bash
# 检查目标状态
curl http://localhost:9090/api/v1/targets

# 检查网络连通性
docker exec -it prometheus ping storyboard-service
```

### 8.3 Dashboard 不显示数据

1. 检查 Prometheus 是否有数据
2. 检查数据源配置
3. 检查查询语句是否正确
4. 检查时间范围设置

---

## 九、监控最佳实践

### 9.1 告警分级

| 级别 | 响应时间 | 通知方式 |
|------|----------|----------|
| CRITICAL | 立即 | 钉钉 @所有人 + 电话 |
| WARNING | 1小时内 | 钉钉通知 |
| INFO | 工作时间 | 邮件 |

### 9.2 Dashboard 设计原则

1. **关键指标优先** - 成功率、延迟、错误率
2. **层次分明** - 概览 → 详情 → 排查
3. **颜色一致** - 绿色正常，黄色警告，红色严重
4. **合理刷新** - 避免过于频繁刷新

### 9.3 性能优化

```yaml
# Prometheus 数据保留
prometheus:
  command:
    - --storage.tsdb.retention.time=15d
    - --storage.tsdb.retention.size=10GB
```

---

## 十、相关链接

- [Grafana 官方文档](https://grafana.com/docs/grafana/latest/)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Alertmanager 配置](https://prometheus.io/docs/alerting/latest/configuration/)
- [Node Exporter 指标](https://github.com/prometheus/node_exporter)
