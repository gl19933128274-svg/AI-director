#!/bin/bash
# ==============================================================================
# 一键回滚方案 - 数据库 + 服务 + 流量
# 适用场景: 生产环境出现严重问题时快速回滚到上一个稳定版本
# ==============================================================================

set -e

# 配置参数
BACKUP_DIR="./backups"
BACKUP_FILE=""
SERVICE_NAME="ai-director"
STABLE_VERSION="v1.9.0"  # 上一个稳定版本
CURRENT_VERSION="v2.0.0"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 确认函数
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令 $1 未找到，请安装后重试"
        exit 1
    fi
}

# 步骤1: 流量回滚 - 将流量切回旧版本
step1_traffic_rollback() {
    log_info "=== 步骤1: 流量回滚 ==="
    
    log_info "检查当前流量分配..."
    kubectl get ingress ai-director-canary -o jsonpath='{.spec.rules[0].http.paths[0].backend.service.name}'
    
    log_info "将流量切回稳定版本..."
    kubectl apply -f k8s-rollout/ingress/ai-director-stable.yaml
    
    log_info "验证流量切换..."
    kubectl get ingress ai-director-canary
    
    log_info "步骤1完成: 流量已切回稳定版本"
}

# 步骤2: 服务回滚 - 回滚到上一个稳定版本
step2_service_rollback() {
    log_info "=== 步骤2: 服务回滚 ==="
    
    log_info "检查当前部署版本..."
    kubectl get deployment ai-director -o jsonpath='{.spec.template.spec.containers[0].image}'
    
    log_info "回滚到稳定版本 $STABLE_VERSION..."
    kubectl set image deployment/ai-director ai-director=registry.example.com/ai-director:$STABLE_VERSION
    
    log_info "等待部署完成..."
    kubectl rollout status deployment/ai-director --timeout=120s
    
    log_info "验证部署版本..."
    kubectl get deployment ai-director -o jsonpath='{.spec.template.spec.containers[0].image}'
    
    log_info "步骤2完成: 服务已回滚到版本 $STABLE_VERSION"
}

# 步骤3: 数据库回滚 - 从备份恢复
step3_database_rollback() {
    log_info "=== 步骤3: 数据库回滚 ==="
    
    # 查找最新备份
    BACKUP_FILE=$(ls -t $BACKUP_DIR/*.backup_* 2>/dev/null | head -n 1)
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "未找到备份文件"
        exit 1
    fi
    
    log_info "找到备份文件: $BACKUP_FILE"
    log_info "备份时间: $(stat -c %y "$BACKUP_FILE")"
    
    log_warn "⚠️  数据库回滚将覆盖当前数据！"
    confirm "确认回滚数据库吗？"
    
    log_info "停止数据库写入..."
    kubectl scale deployment/ai-director --replicas=0
    
    log_info "执行数据库恢复..."
    # SQLite 恢复示例
    cp "$BACKUP_FILE" /var/lib/sqlite/dev.db
    
    # PostgreSQL 恢复示例 (如果使用PostgreSQL)
    # PGPASSWORD=your_password pg_restore -h localhost -U dbuser -d airector -c "$BACKUP_FILE"
    
    log_info "重启数据库服务..."
    kubectl rollout restart statefulset/postgres
    
    log_info "等待数据库恢复..."
    sleep 30
    
    log_info "重启应用服务..."
    kubectl scale deployment/ai-director --replicas=3
    
    log_info "验证数据库连接..."
    kubectl exec -it $(kubectl get pods -l app=ai-director -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:3000/api/v1/health
    
    log_info "步骤3完成: 数据库已从备份恢复"
}

# 主函数
main() {
    echo "=============================================="
    echo "         一键回滚方案执行脚本"
    echo "         Database + Service + Traffic"
    echo "=============================================="
    echo ""
    
    # 检查依赖命令
    check_command kubectl
    check_command curl
    
    # 显示当前状态
    log_info "当前版本: $CURRENT_VERSION"
    log_info "目标版本: $STABLE_VERSION"
    log_info "备份目录: $BACKUP_DIR"
    echo ""
    
    # 确认执行
    log_warn "⚠️  此操作将回滚数据库、服务和流量到上一个稳定版本！"
    confirm "确认执行一键回滚吗？"
    echo ""
    
    # 执行回滚步骤
    step1_traffic_rollback
    echo ""
    step2_service_rollback
    echo ""
    step3_database_rollback
    echo ""
    
    # 验证回滚结果
    log_info "=== 回滚验证 ==="
    log_info "✅ 流量已切回稳定版本"
    log_info "✅ 服务已回滚到 $STABLE_VERSION"
    log_info "✅ 数据库已从备份恢复"
    echo ""
    log_info "=============================================="
    log_info "         一键回滚完成！"
    log_info "=============================================="
}

# 执行主函数
main "$@"