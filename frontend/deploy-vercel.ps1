# =============================================================
# AI Director - 一键部署脚本
# 使用方式：
#   PowerShell: .\deploy-vercel.ps1
# =============================================================

param(
    [switch]$Development,
    [switch]$Production,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI导演系统 - Vercel部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Vercel CLI
Write-Host "[1/6] 检查Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "  安装Vercel CLI..." -ForegroundColor Gray
    npm install -g vercel
}

# 检查环境变量
Write-Host "[2/6] 检查环境变量..." -ForegroundColor Yellow
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "  ⚠️  未找到 .env.local 文件" -ForegroundColor Red
    Write-Host "  请复制 .env.local.example 为 .env.local 并配置" -ForegroundColor Red
    exit 1
}

# 检查必要的环境变量
$requiredVars = @("DATABASE_URL", "VOLC_API_KEY", "JWT_SECRET")
$missingVars = @()
foreach ($var in $requiredVars) {
    $value = (Get-Content $envFile | Select-String "^${var}=" -ErrorAction SilentlyContinue)
    if (-not $value) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "  ⚠️  缺少必要的环境变量:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host "  请在 .env.local 中配置这些变量" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ 环境变量检查通过" -ForegroundColor Green

# 安装依赖
Write-Host "[3/6] 安装依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

# 生成Prisma Client
Write-Host "[4/6] 生成Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit 1 }

# 选择部署环境
Write-Host "[5/6] 准备部署..." -ForegroundColor Yellow
if ($Development) {
    Write-Host "  部署环境: Development" -ForegroundColor Cyan
    $target = "dev"
} elseif ($Production) {
    Write-Host "  部署环境: Production" -ForegroundColor Cyan
    $target = "prod"
} else {
    Write-Host "  请选择部署环境:" -ForegroundColor Yellow
    Write-Host "    -d  : Development (开发环境)" -ForegroundColor Gray
    Write-Host "    -p  : Production (生产环境)" -ForegroundColor Gray
    Write-Host ""
    $choice = Read-Host "选择 (d/p)"
    if ($choice -eq "d") {
        $target = "dev"
    } else {
        $target = "prod"
    }
}

# 执行部署
Write-Host "[6/6] 执行部署..." -ForegroundColor Yellow
Write-Host ""

if ($target -eq "prod") {
    Write-Host "  部署到生产环境..." -ForegroundColor Cyan
    vercel --prod
} else {
    Write-Host "  部署到开发环境..." -ForegroundColor Cyan
    vercel
}

# 检查部署结果
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ 部署成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "后续步骤:" -ForegroundColor Yellow
    Write-Host "  1. 检查部署状态: vercel logs" -ForegroundColor Gray
    Write-Host "  2. 测试API: curl <url>/api/v1/health" -ForegroundColor Gray
    Write-Host "  3. 查看监控: curl <url>/api/v1/monitor/metrics" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ 部署失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "故障排查:" -ForegroundColor Yellow
    Write-Host "  1. 查看日志: vercel logs" -ForegroundColor Gray
    Write-Host "  2. 检查环境变量配置" -ForegroundColor Gray
    Write-Host "  3. 参考 DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
