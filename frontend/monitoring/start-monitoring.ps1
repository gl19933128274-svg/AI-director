<#
.SYNOPSIS
    分镜服务监控启动脚本（Windows PowerShell）

.DESCRIPTION
    启动 Prometheus、Grafana、Node Exporter 和 Alertmanager 服务

.NOTES
    需要先安装 Docker Desktop 并启动
#>

Write-Host "======================================"
Write-Host "   启动分镜服务监控系统"
Write-Host "======================================"

# 检查 Docker 是否已安装
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker 未安装，请先安装 Docker Desktop"
    exit 1
}

# 检查 Docker 是否正在运行
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker 未启动，请先启动 Docker Desktop"
    exit 1
}

Write-Host ""
Write-Host "📦 启动监控服务..."

# 创建监控目录
New-Item -ItemType Directory -Force -Path ./data/prometheus | Out-Null
New-Item -ItemType Directory -Force -Path ./data/grafana | Out-Null
New-Item -ItemType Directory -Force -Path ./logs | Out-Null

# 启动 Prometheus
Write-Host "🚀 启动 Prometheus..."
docker run -d `
    --name prometheus `
    --network host `
    -v "$(Get-Location)/prometheus.yml:/etc/prometheus/prometheus.yml" `
    -v "$(Get-Location)/alerts.yml:/etc/prometheus/alerts.yml" `
    -v "$(Get-Location)/data/prometheus:/prometheus" `
    -p 9090:9090 `
    prom/prometheus:latest `
    --config.file=/etc/prometheus/prometheus.yml `
    --storage.tsdb.path=/prometheus `
    --web.console.libraries=/etc/prometheus/console_libraries `
    --web.console.templates=/etc/prometheus/consoles `
    --web.enable-lifecycle

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prometheus 启动成功"
} else {
    Write-Host "❌ Prometheus 启动失败"
    exit 1
}

# 启动 Grafana
Write-Host "🚀 启动 Grafana..."
docker run -d `
    --name grafana `
    --network host `
    -v "$(Get-Location)/data/grafana:/var/lib/grafana" `
    -p 3000:3000 `
    -e GF_SECURITY_ADMIN_PASSWORD=admin `
    -e GF_INSTALL_PLUGINS=grafana-prometheus-datasource `
    grafana/grafana:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Grafana 启动成功"
} else {
    Write-Host "❌ Grafana 启动失败"
    exit 1
}

# 启动 Node Exporter
Write-Host "🚀 启动 Node Exporter..."
docker run -d `
    --name node_exporter `
    --network host `
    --net="host" `
    --pid="host" `
    -v "/:/host:ro,rslave" `
    quay.io/prometheus/node-exporter:latest `
    --path.rootfs=/host

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node Exporter 启动成功"
} else {
    Write-Host "❌ Node Exporter 启动失败"
    exit 1
}

# 启动 Alertmanager
Write-Host "🚀 启动 Alertmanager..."
docker run -d `
    --name alertmanager `
    --network host `
    -p 9093:9093 `
    prom/alertmanager:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Alertmanager 启动成功"
} else {
    Write-Host "❌ Alertmanager 启动失败"
    exit 1
}

Write-Host ""
Write-Host "======================================"
Write-Host "   监控服务启动完成"
Write-Host "======================================"
Write-Host ""
Write-Host "📊 访问地址："
Write-Host "  - Prometheus: http://localhost:9090"
Write-Host "  - Grafana: http://localhost:3000 (用户名: admin, 密码: admin)"
Write-Host "  - Alertmanager: http://localhost:9093"
Write-Host ""
Write-Host "📝 配置步骤："
Write-Host "  1. 打开 Grafana: http://localhost:3000"
Write-Host "  2. 登录（用户名: admin, 密码: admin）"
Write-Host "  3. 添加数据源: Configuration > Data Sources > Add data source"
Write-Host "  4. 选择 Prometheus，URL: http://localhost:9090"
Write-Host "  5. 导入仪表板: Create > Import"
Write-Host "  6. 使用仪表板配置文件或 ID"
Write-Host ""
Write-Host "🔔 告警规则已加载，将在触发条件满足时发送告警"
Write-Host ""