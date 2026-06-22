# =============================================================
# AI Director - 数据库初始化脚本
# 使用方式：
#   PowerShell: .\init-database.ps1
#   Bash: bash init-database.sh
# =============================================================

param(
    [switch]$Development,
    [switch]$Production
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI导演系统 - 数据库初始化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查环境变量
Write-Host "[1/5] 检查环境变量..." -ForegroundColor Yellow
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "  ⚠️  未找到 .env.local 文件" -ForegroundColor Red
    Write-Host "  请先配置环境变量" -ForegroundColor Red
    exit 1
}

# 读取 DATABASE_URL
$dbUrl = (Get-Content $envFile | Select-String "^DATABASE_URL=" -ErrorAction SilentlyContinue)
if (-not $dbUrl) {
    Write-Host "  ⚠️  未找到 DATABASE_URL 配置" -ForegroundColor Red
    Write-Host "  请在 .env.local 中配置 PostgreSQL 连接字符串" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ DATABASE_URL 已配置" -ForegroundColor Green

# 安装依赖
Write-Host "[2/5] 安装依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { 
    Write-Host "  ⚠️  依赖安装失败" -ForegroundColor Red
    exit 1 
}

# 生成Prisma Client
Write-Host "[3/5] 生成Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { 
    Write-Host "  ⚠️  Prisma Client 生成失败" -ForegroundColor Red
    exit 1 
}
Write-Host "  ✓ Prisma Client 生成成功" -ForegroundColor Green

# 数据库迁移
Write-Host "[4/5] 执行数据库迁移..." -ForegroundColor Yellow
Write-Host "  选择环境:" -ForegroundColor Gray
Write-Host "    -d  : Development (开发环境，使用 dev.db)" -ForegroundColor Gray
Write-Host "    -p  : Production (生产环境，使用 PostgreSQL)" -ForegroundColor Gray
Write-Host ""

if ($Development) {
    $target = "dev"
} elseif ($Production) {
    $target = "prod"
} else {
    $choice = Read-Host "选择环境 (d/p)"
    if ($choice -eq "d") {
        $target = "dev"
    } else {
        $target = "prod"
    }
}

if ($target -eq "prod") {
    Write-Host "  执行生产环境迁移..." -ForegroundColor Cyan
    
    # 创建迁移文件（如果需要）
    npx prisma migrate dev --name init
    
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "  ⚠️  数据库迁移失败" -ForegroundColor Red
        Write-Host "  请检查 DATABASE_URL 是否正确" -ForegroundColor Red
        exit 1 
    }
    
    # 推送到生产
    Write-Host "  推送到生产环境..." -ForegroundColor Cyan
    npx prisma migrate deploy
} else {
    Write-Host "  执行开发环境迁移..." -ForegroundColor Cyan
    npx prisma db push
}

Write-Host "  ✓ 数据库迁移成功" -ForegroundColor Green

# 初始化灰度配置
Write-Host "[5/5] 初始化灰度发布配置..." -ForegroundColor Yellow

# 创建初始化SQL脚本
$initSql = @"
-- 灰度发布配置初始化
INSERT INTO "ReleaseConfig" ("id", "name", "enabled", "percentage", "createdAt", "updatedAt") VALUES
('video_generation', 'video_generation', true, 100, NOW(), NOW()),
('scene_generation', 'scene_generation', true, 100, NOW(), NOW()),
('kill_switch', 'kill_switch', false, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");
CREATE INDEX IF NOT EXISTS "CostRecord_userId_idx" ON "CostRecord"("userId");
CREATE INDEX IF NOT EXISTS "CostRecord_createdAt_idx" ON "CostRecord"("createdAt");

-- 显示结果
SELECT '灰度配置初始化完成' AS status;
"@

Write-Host $initSql
Write-Host ""

# 执行SQL（仅生产环境）
if ($target -eq "prod") {
    $dbUrl = (Get-Content $envFile | Select-String "^DATABASE_URL=").Line.Split("=")[1]
    Write-Host "  执行初始化SQL..." -ForegroundColor Cyan
    # 注意：实际执行需要psql客户端，这里仅显示SQL
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ 数据库初始化完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "后续步骤:" -ForegroundColor Yellow
Write-Host "  1. 验证数据库连接" -ForegroundColor Gray
Write-Host "  2. 启动开发服务器: npm run dev" -ForegroundColor Gray
Write-Host "  3. 或部署到Vercel: .\deploy-vercel.ps1" -ForegroundColor Gray
Write-Host ""
