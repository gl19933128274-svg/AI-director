# =============================================================
# AI Director - GitHub 初始化脚本
# 使用方式：
#   PowerShell: .\setup-github.ps1
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [string]$RepoName = "ai-director",
    
    [string]$Description = "AI导演系统 - SaaS级AI视频生成平台"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI导演系统 - GitHub 初始化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Git
Write-Host "[1/6] 检查Git安装..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "  ⚠️  未安装Git" -ForegroundColor Red
    Write-Host "  请先安装Git: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Git 已安装" -ForegroundColor Green

# 配置Git用户信息（如果未配置）
Write-Host "[2/6] 配置Git用户信息..." -ForegroundColor Yellow
$gitName = git config --global user.name
if (-not $gitName) {
    Write-Host "  请输入你的GitHub用户名:"
    $gitName = Read-Host "  GitHub Username"
    git config --global user.name $gitName
}
Write-Host "  ✓ Git 用户名: $gitName" -ForegroundColor Green

$gitEmail = git config --global user.email
if (-not $gitEmail) {
    Write-Host "  请输入你的GitHub邮箱:"
    $gitEmail = Read-Host "  GitHub Email"
    git config --global user.email $gitEmail
}
Write-Host "  ✓ Git 邮箱已配置" -ForegroundColor Green

# 进入 frontend 目录
Write-Host "[3/6] 准备Git仓库..." -ForegroundColor Yellow
Set-Location -Path "d:\黄高乐\新建文件夹\111\frontend"

# 初始化仓库（如果尚未初始化）
if (-not (Test-Path ".git")) {
    Write-Host "  初始化Git仓库..." -ForegroundColor Cyan
    git init
    
    # 创建 main 分支
    git checkout -b main
} else {
    Write-Host "  Git仓库已存在" -ForegroundColor Gray
}

Write-Host "  ✓ Git仓库准备完成" -ForegroundColor Green

# 添加远程仓库
Write-Host "[4/6] 配置远程仓库..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"

# 移除已有的origin（如果存在）
git remote remove origin 2>$null | Out-Null

# 添加新的origin
git remote add origin $remoteUrl
Write-Host "  ✓ 远程仓库: $remoteUrl" -ForegroundColor Green

# 创建初始提交
Write-Host "[5/6] 创建初始提交..." -ForegroundColor Yellow
Write-Host "  添加所有文件..." -ForegroundColor Cyan

# 检查是否有更改
$hasChanges = git status --porcelain
if ($hasChanges) {
    git add .
    git commit -m "feat: AI导演系统 SaaS级产品化版本

Features:
- 9层系统架构重构
- 成本控制系统
- 灰度发布系统
- 日志与可观测性
- 核心业务链路标准化
- 监控指标API

Documentation:
- 快速开始指南 (QUICKSTART.md)
- 部署指南 (DEPLOYMENT_GUIDE.md)
- GitHub上传指南 (GITHUB_UPLOAD_GUIDE.md)
- 部署检查清单 (DEPLOYMENT_CHECKLIST.md)

CI/CD:
- GitHub Actions 工作流
- Vercel 自动部署配置"

    Write-Host "  ✓ 初始提交完成" -ForegroundColor Green
} else {
    Write-Host "  暂无更改需要提交" -ForegroundColor Gray
}

# 推送到GitHub
Write-Host "[6/6] 推送到GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  准备推送到: $remoteUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  提示: GitHub可能需要你输入用户名和密码/Token" -ForegroundColor Yellow
Write-Host "  - Username: $GitHubUsername" -ForegroundColor Gray
Write-Host "  - Password: GitHub Personal Access Token (不是登录密码)" -ForegroundColor Gray
Write-Host ""

$pushChoice = Read-Host "是否现在推送到GitHub? (y/n)"
if ($pushChoice -eq "y") {
    try {
        git branch -M main
        git push -u origin main
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✓ 推送成功！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "下一步:" -ForegroundColor Yellow
        Write-Host "  1. 访问 https://github.com/$GitHubUsername/$RepoName" -ForegroundColor Gray
        Write-Host "  2. 配置 GitHub Secrets" -ForegroundColor Gray
        Write-Host "  3. 查看 DEPLOYMENT_GUIDE.md 了解后续步骤" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  ⚠️  推送失败" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "常见问题:" -ForegroundColor Yellow
        Write-Host "  1. GitHub用户名或仓库名错误" -ForegroundColor Gray
        Write-Host "  2. 未创建GitHub仓库（需要先在GitHub网页创建）" -ForegroundColor Gray
        Write-Host "  3. GitHub Token权限不足" -ForegroundColor Gray
        Write-Host ""
        Write-Host "解决方案:" -ForegroundColor Yellow
        Write-Host "  1. 确保GitHub仓库已创建" -ForegroundColor Gray
        Write-Host "  2. 创建GitHub Personal Access Token" -ForegroundColor Gray
        Write-Host "  3. 使用Token代替密码推送" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  已跳过推送" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "后续步骤:" -ForegroundColor Yellow
    Write-Host "  1. 手动推送到GitHub:" -ForegroundColor Gray
    Write-Host "     git push -u origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. 创建GitHub仓库:" -ForegroundColor Gray
    Write-Host "     https://github.com/new" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. 查看部署指南:" -ForegroundColor Gray
    Write-Host "     Get-Content DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GitHub 初始化完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
