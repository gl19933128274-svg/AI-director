#!/bin/bash
# AI导演系统可观测性平台启动脚本
# 使用方法: ./start-monitoring.sh

set -e

echo "=========================================="
echo "  AI导演系统 - 可观测性平台启动脚本"
echo "=========================================="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 检查端口占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -ano | grep ":$port " | grep LISTENNING >/dev/null 2>&1; then
        echo "警告: 端口 $port ($service) 已被占用"
        return 1
    fi
    return 0
}

echo ""
echo "检查端口占用..."
check_port 9090 "Prometheus" || true
check_port 3030 "Grafana" || true
check_port 9100 "Node Exporter" || true
check_port 9093 "Alertmanager" || true
check_port 8080 "cAdvisor" || true

echo ""
echo "启动监控服务..."

# 使用 docker-compose 或 docker compose
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.yml up -d
else
    docker-compose -f docker-compose.yml up -d
fi

echo ""
echo "等待服务启动..."
sleep 5

echo ""
echo "=========================================="
echo "  服务启动成功!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - Prometheus:    http://localhost:9090"
echo "  - Grafana:       http://localhost:3030"
echo "  - Node Exporter: http://localhost:9100"
echo "  - Alertmanager:  http://localhost:9093"
echo "  - cAdvisor:      http://localhost:8080"
echo ""
echo "Grafana 登录信息:"
echo "  用户名: admin"
echo "  密码:   admin123"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo ""
