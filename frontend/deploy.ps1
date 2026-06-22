<#
.SYNOPSIS
    Storyboard 分镜生成系统 - 生产环境一键部署脚本 (Windows)
#>

param(
    [string]$AppDir = $PWD.Path
)

# 颜色定义
$Green = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow
$Red = [ConsoleColor]::Red
$Default = [ConsoleColor]::Gray

function Write-Info($message) {
    Write-Host "[" -NoNewline
    Write-Host "INFO" -NoNewline -ForegroundColor $Green
    Write-Host "] $message" -ForegroundColor $Default
}

function Write-Warn($message) {
    Write-Host "[" -NoNewline
    Write-Host "WARN" -NoNewline -ForegroundColor $Yellow
    Write-Host "] $message" -ForegroundColor $Default
}

function Write-Error($message) {
    Write-Host "[" -NoNewline
    Write-Host "ERROR" -NoNewline -ForegroundColor $Red
    Write-Host "] $message" -ForegroundColor $Default
}

function Test-Command($command) {
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# ============================================================
# 阶段1: 环境检查
# ============================================================
Write-Host "======================================"
Write-Host " 阶段1: 环境检查"
Write-Host "======================================"

Write-Info "检查 Node.js..."
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Info "Node.js 版本: $nodeVersion"
} else {
    Write-Error "Node.js 未安装，请先安装"
    exit 1
}

Write-Info "检查 npm..."
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Info "npm 版本: $npmVersion"
} else {
    Write-Error "npm 未安装，请先安装"
    exit 1
}

Write-Info "检查 Docker..."
if (Test-Command "docker") {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Docker 运行正常"
        } else {
            Write-Error "Docker 未启动，请先启动 Docker Desktop"
            exit 1
        }
    } catch {
        Write-Error "Docker 未安装，请先安装"
        exit 1
    }
} else {
    Write-Error "Docker 未安装，请先安装"
    exit 1
}

# ============================================================
# 阶段2: 生产环境初始化
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段2: 生产环境初始化"
Write-Host "======================================"

$logDir = Join-Path $AppDir "logs"
$monitoringDir = Join-Path $AppDir "monitoring"

Write-Info "创建目录结构..."
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $monitoringDir "data\prometheus") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $monitoringDir "data\grafana") | Out-Null

Write-Info "检查环境变量配置..."
$envFile = Join-Path $AppDir ".env.local"
if (Test-Path $envFile) {
    Write-Info "环境变量配置文件存在 ✓"
} else {
    Write-Warn ".env.local 文件不存在，请创建配置文件"
    exit 1
}

# ============================================================
# 阶段3: 安装依赖
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段3: 安装依赖"
Write-Host "======================================"

Write-Info "安装项目依赖..."
Set-Location $AppDir
npm install --production
if ($LASTEXITCODE -eq 0) {
    Write-Info "依赖安装完成 ✓"
} else {
    Write-Error "依赖安装失败"
    exit 1
}

Write-Info "构建生产版本..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Info "构建完成 ✓"
} else {
    Write-Error "构建失败"
    exit 1
}

# ============================================================
# 阶段4: 启动监控服务
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段4: 启动监控服务"
Write-Host "======================================"

Write-Info "启动 Prometheus、Grafana、AlertManager..."
Set-Location $monitoringDir
docker-compose up -d

Write-Info "等待监控服务启动..."
Start-Sleep -Seconds 10

Write-Info "检查 Prometheus 状态..."
try {
    $response = Invoke-WebRequest -Uri http://localhost:9090/graph -UseBasicParsing -TimeoutSec 5
    Write-Info "Prometheus 启动成功 ✓"
} catch {
    Write-Error "Prometheus 启动失败"
    exit 1
}

Write-Info "检查 Grafana 状态..."
try {
    $response = Invoke-WebRequest -Uri http://localhost:3004/login -UseBasicParsing -TimeoutSec 5
    Write-Info "Grafana 启动成功 ✓"
} catch {
    Write-Error "Grafana 启动失败"
    exit 1
}

Write-Info "检查 AlertManager 状态..."
try {
    $response = Invoke-WebRequest -Uri http://localhost:9093 -UseBasicParsing -TimeoutSec 5
    Write-Info "AlertManager 启动成功 ✓"
} catch {
    Write-Error "AlertManager 启动失败"
    exit 1
}

# ============================================================
# 阶段5: 配置 Grafana
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段5: 配置 Grafana"
Write-Host "======================================"

Write-Info "配置 Prometheus 数据源..."
try {
    $body = @{
        name = "Prometheus"
        type = "prometheus"
        url = "http://localhost:9090"
        access = "proxy"
        isDefault = $true
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri http://admin:admin@localhost:3004/api/datasources `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing | Out-Null
    Write-Info "数据源配置成功 ✓"
} catch {
    Write-Warn "数据源可能已存在"
}

# ============================================================
# 阶段6: 启动 Storyboard API 服务
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段6: 启动 Storyboard API 服务"
Write-Host "======================================"

Write-Info "检查 PM2 是否安装..."
if (-not (Test-Command "pm2")) {
    Write-Info "安装 PM2..."
    npm install -g pm2
}

Write-Info "停止旧服务（如果存在）..."
pm2 delete "storyboard-service" 2>&1 | Out-Null

Write-Info "启动 Storyboard API 服务..."
Set-Location $AppDir
pm2 start npm --name "storyboard-service" -- run start

Write-Info "等待服务启动..."
Start-Sleep -Seconds 15

Write-Info "检查 API 服务状态..."
try {
    $response = Invoke-WebRequest -Uri http://localhost:3000/api/storyboard/generate `
        -UseBasicParsing -TimeoutSec 5
    Write-Info "Storyboard API 启动成功 ✓"
} catch {
    Write-Error "Storyboard API 启动失败"
    exit 1
}

# ============================================================
# 阶段7: 验证服务
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 阶段7: 服务验证"
Write-Host "======================================"

Write-Info "测试分镜生成 API..."
try {
    $body = @{
        userInput = "测试产品"
        videoDuration = 15
        shotCount = 5
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri http://localhost:3000/api/storyboard/generate `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    $content = $response.Content | ConvertFrom-Json
    if ($content.success -eq $true) {
        Write-Info "API 测试成功 ✓"
    } else {
        Write-Error "API 测试失败: $($response.Content)"
        exit 1
    }
} catch {
    Write-Error "API 测试失败: $_"
    exit 1
}

# ============================================================
# 完成
# ============================================================
Write-Host ""
Write-Host "======================================"
Write-Host " 🎉 部署完成！"
Write-Host "======================================"
Write-Host ""
Write-Host "📊 服务地址:"
Write-Host "  - Storyboard API: http://localhost:3000/api/storyboard/generate"
Write-Host "  - Prometheus: http://localhost:9090"
Write-Host "  - Grafana: http://localhost:3004 (用户名: admin, 密码: admin)"
Write-Host "  - AlertManager: http://localhost:9093"
Write-Host ""
Write-Host "📝 后续操作:"
Write-Host "  1. 登录 Grafana 配置 Dashboard"
Write-Host "  2. 配置告警通知渠道（钉钉/邮件）"
Write-Host "  3. 导入预设的监控面板"
Write-Host "  4. 执行压力测试验证"
Write-Host ""
Write-Host "🔧 服务管理:"
Write-Host "  - 查看日志: pm2 logs storyboard-service"
Write-Host "  - 重启服务: pm2 restart storyboard-service"
Write-Host "  - 停止服务: pm2 stop storyboard-service"
Write-Host "  - 查看状态: pm2 status"
Write-Host ""

Set-Location $AppDir
