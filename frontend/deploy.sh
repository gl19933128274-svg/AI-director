#!/bin/bash
# ============================================================
# Storyboard 分镜生成系统 - 生产环境一键部署脚本
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置参数
APP_NAME="storyboard-service"
APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOG_DIR="$APP_DIR/logs"
MONITORING_DIR="$APP_DIR/monitoring"

# ============================================================
# 函数定义
# ============================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

# ============================================================
# 阶段1: 环境检查
# ============================================================
echo "======================================"
echo " 阶段1: 环境检查"
echo "======================================"

log_info "检查 Node.js..."
check_command node
NODE_VERSION=$(node --version)
log_info "Node.js 版本: $NODE_VERSION"

log_info "检查 npm..."
check_command npm
NPM_VERSION=$(npm --version)
log_info "npm 版本: $NPM_VERSION"

log_info "检查 Docker..."
check_command docker
DOCKER_VERSION=$(docker --version | awk '{print $3}')
log_info "Docker 版本: $DOCKER_VERSION"

log_info "检查 Docker Compose..."
check_command docker-compose
COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}')
log_info "Docker Compose 版本: $COMPOSE_VERSION"

# ============================================================
# 阶段2: 生产环境初始化
# ============================================================
echo ""
echo "======================================"
echo " 阶段2: 生产环境初始化"
echo "======================================"

log_info "创建目录结构..."
mkdir -p "$LOG_DIR"
mkdir -p "$MONITORING_DIR/data/prometheus"
mkdir -p "$MONITORING_DIR/data/grafana"

log_info "设置目录权限..."
chmod -R 755 "$LOG_DIR"

log_info "检查环境变量配置..."
if [ ! -f "$APP_DIR/.env.local" ]; then
    log_warn ".env.local 文件不存在，请创建配置文件"
    exit 1
fi
log_info "环境变量配置文件存在 ✓"

# ============================================================
# 阶段3: 安装依赖
# ============================================================
echo ""
echo "======================================"
echo " 阶段3: 安装依赖"
echo "======================================"

log_info "安装项目依赖..."
cd "$APP_DIR"
npm install --production
log_info "依赖安装完成 ✓"

log_info "构建生产版本..."
npm run build
log_info "构建完成 ✓"

# ============================================================
# 阶段4: 启动监控服务
# ============================================================
echo ""
echo "======================================"
echo " 阶段4: 启动监控服务"
echo "======================================"

log_info "启动 Prometheus、Grafana、AlertManager..."
cd "$MONITORING_DIR"
docker-compose up -d

# 等待服务启动
log_info "等待监控服务启动..."
sleep 10

# 检查服务状态
log_info "检查 Prometheus 状态..."
if curl -s http://localhost:9090/graph > /dev/null; then
    log_info "Prometheus 启动成功 ✓"
else
    log_error "Prometheus 启动失败"
    exit 1
fi

log_info "检查 Grafana 状态..."
if curl -s http://localhost:3004/login > /dev/null; then
    log_info "Grafana 启动成功 ✓"
else
    log_error "Grafana 启动失败"
    exit 1
fi

log_info "检查 AlertManager 状态..."
if curl -s http://localhost:9093 > /dev/null; then
    log_info "AlertManager 启动成功 ✓"
else
    log_error "AlertManager 启动失败"
    exit 1
fi

# ============================================================
# 阶段5: 配置 Grafana
# ============================================================
echo ""
echo "======================================"
echo " 阶段5: 配置 Grafana"
echo "======================================"

log_info "配置 Prometheus 数据源..."
curl -s -X POST http://admin:admin@localhost:3004/api/datasources \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Prometheus",
        "type": "prometheus",
        "url": "http://localhost:9090",
        "access": "proxy",
        "isDefault": true
    }' > /dev/null && log_info "数据源配置成功 ✓" || log_warn "数据源可能已存在"

# ============================================================
# 阶段6: 启动 Storyboard API 服务
# ============================================================
echo ""
echo "======================================"
echo " 阶段6: 启动 Storyboard API 服务"
echo "======================================"

log_info "检查 PM2 是否安装..."
if ! command -v pm2 &> /dev/null; then
    log_info "安装 PM2..."
    npm install -g pm2
fi

log_info "停止旧服务（如果存在）..."
pm2 delete "$APP_NAME" 2>/dev/null || true

log_info "启动 Storyboard API 服务..."
cd "$APP_DIR"
pm2 start npm --name "$APP_NAME" -- run start

# 等待服务启动
log_info "等待服务启动..."
sleep 15

# 检查服务状态
log_info "检查 API 服务状态..."
if curl -s http://localhost:3000/api/storyboard/generate > /dev/null; then
    log_info "Storyboard API 启动成功 ✓"
else
    log_error "Storyboard API 启动失败"
    exit 1
fi

# ============================================================
# 阶段7: 验证服务
# ============================================================
echo ""
echo "======================================"
echo " 阶段7: 服务验证"
echo "======================================"

log_info "测试分镜生成 API..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/storyboard/generate \
    -H "Content-Type: application/json" \
    -d '{"userInput":"测试产品","videoDuration":15,"shotCount":5}')

if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    log_info "API 测试成功 ✓"
else
    log_error "API 测试失败: $TEST_RESPONSE"
    exit 1
fi

# ============================================================
# 完成
# ============================================================
echo ""
echo "======================================"
echo " 🎉 部署完成！"
echo "======================================"
echo ""
echo "📊 服务地址:"
echo "  - Storyboard API: http://localhost:3000/api/storyboard/generate"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3004 (用户名: admin, 密码: admin)"
echo "  - AlertManager: http://localhost:9093"
echo ""
echo "📝 后续操作:"
echo "  1. 登录 Grafana 配置 Dashboard"
echo "  2. 配置告警通知渠道（钉钉/邮件）"
echo "  3. 导入预设的监控面板"
echo "  4. 执行压力测试验证"
echo ""
echo "🔧 服务管理:"
echo "  - 查看日志: pm2 logs $APP_NAME"
echo "  - 重启服务: pm2 restart $APP_NAME"
echo "  - 停止服务: pm2 stop $APP_NAME"
echo "  - 查看状态: pm2 status"
echo ""
