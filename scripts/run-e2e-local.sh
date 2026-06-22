#!/bin/bash
set -e

# 本地模拟 CI 环境测试脚本
# 用于验证迁移脚本和服务器启动逻辑与 CI 环境一致

echo "========================================"
echo "  本地模拟 CI 端到端测试"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

function log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 清理旧数据库
log_info "Step 1: 清理旧数据库"
if [ -f "frontend/prisma/dev.db" ]; then
  log_info "  删除旧数据库文件..."
  rm frontend/prisma/dev.db
  log_success "  旧数据库已删除"
else
  log_info "  没有旧数据库文件"
fi

# 2. 安装依赖
log_info ""
log_info "Step 2: 安装依赖"
cd frontend
log_info "  运行 npm ci..."
npm ci
log_success "  依赖安装完成"

# 3. 运行迁移
log_info ""
log_info "Step 3: 运行 Prisma 迁移"
log_info "  运行 npx prisma migrate deploy..."
npx prisma migrate deploy
log_success "  迁移完成"

# 4. 构建应用
log_info ""
log_info "Step 4: 构建应用"
log_info "  运行 npm run build..."
npm run build
log_success "  构建完成"

# 5. 启动开发服务器
log_info ""
log_info "Step 5: 启动开发服务器"
log_info "  设置环境变量..."
export DATABASE_URL="file:./dev.db"
export JWT_SECRET="local-test-secret-12345"
export NEXT_PUBLIC_API_BASE="http://localhost:3000"

log_info "  启动服务器..."
npm run dev > /tmp/nextjs-local.log 2>&1 &
echo $! > /tmp/nextjs-local.pid
log_info "  服务器已启动，PID: $(cat /tmp/nextjs-local.pid)"

# 6. 等待服务器启动
log_info ""
log_info "Step 6: 等待服务器启动"
MAX_ATTEMPTS=30
for i in $(seq 1 $MAX_ATTEMPTS); do
  log_info "  尝试 $i/$MAX_ATTEMPTS..."
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health)
  log_info "  HTTP 响应码: $response"
  
  if [ "$response" -eq 200 ]; then
    log_success "  服务器启动成功"
    break
  fi
  
  if [ $i -eq $MAX_ATTEMPTS ]; then
    log_error "  服务器启动超时"
    log_info "  服务器日志:"
    cat /tmp/nextjs-local.log
    exit 1
  fi
  
  sleep 2
done

# 7. 运行端到端测试
log_info ""
log_info "Step 7: 运行端到端测试"
export API_BASE="http://localhost:3000"
node tests/v2-full-chain-test.js
EXIT_CODE=$?

# 8. 清理
log_info ""
log_info "Step 8: 清理"
log_info "  停止开发服务器..."
kill $(cat /tmp/nextjs-local.pid) 2>/dev/null || true
sleep 2
log_success "  服务器已停止"

# 9. 输出结果
log_info ""
echo "========================================"
if [ $EXIT_CODE -eq 0 ]; then
  log_success "测试完成，所有测试通过！"
else
  log_error "测试失败，退出码: $EXIT_CODE"
  log_info "服务器日志:"
  cat /tmp/nextjs-local.log
fi
echo "========================================"

exit $EXIT_CODE