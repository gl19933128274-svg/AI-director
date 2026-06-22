#!/bin/bash
# AI导演系统灰度发布回滚脚本
# 支持快速回滚到稳定版本

set -e

# ==================== 配置参数 ====================
NAMESPACE="production"
INGRESS_NAME="ai-director-canary"
CANARY_DEPLOYMENT="ai-director-canary"

# ==================== 工具函数 ====================

# 紧急回滚 - 立即将流量切回0%
emergency_rollback() {
    echo "=========================================="
    echo "  执行紧急回滚"
    echo "=========================================="
    echo ""
    
    echo "1. 将灰度流量切回 0%"
    kubectl annotate ingress "$INGRESS_NAME" \
        nginx.ingress.kubernetes.io/canary-weight="0" \
        --overwrite -n "$NAMESPACE"
    
    echo "2. 更新阶段标识为回滚状态"
    kubectl annotate ingress "$INGRESS_NAME" \
        canary-phase="rolled-back" \
        --overwrite -n "$NAMESPACE"
    
    # 清理暂停标记
    rm -f "/tmp/canary-pause"
    
    echo ""
    echo "✓ 回滚完成"
    echo ""
    echo "当前状态:"
    echo "  - 灰度流量: 0%"
    echo "  - 所有流量已切回稳定版本"
}

# 完整回滚 - 删除灰度部署
complete_rollback() {
    echo "=========================================="
    echo "  执行完整回滚"
    echo "=========================================="
    echo ""
    
    echo "1. 将灰度流量切回 0%"
    kubectl annotate ingress "$INGRESS_NAME" \
        nginx.ingress.kubernetes.io/canary-weight="0" \
        --overwrite -n "$NAMESPACE"
    
    echo "2. 更新阶段标识"
    kubectl annotate ingress "$INGRESS_NAME" \
        canary-phase="rolled-back" \
        --overwrite -n "$NAMESPACE"
    
    echo "3. 缩容灰度部署"
    kubectl scale deployment "$CANARY_DEPLOYMENT" --replicas=0 -n "$NAMESPACE"
    
    # 清理暂停标记
    rm -f "/tmp/canary-pause"
    
    echo ""
    echo "✓ 完整回滚完成"
    echo ""
    echo "当前状态:"
    echo "  - 灰度流量: 0%"
    echo "  - 灰度部署已缩容"
    echo "  - 所有流量已切回稳定版本"
}

# 显示帮助
show_help() {
    echo "AI导演系统灰度发布回滚脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --emergency      紧急回滚（仅切回流量）"
    echo "  --complete       完整回滚（切回流量+缩容灰度部署）"
    echo "  --help           显示帮助信息"
    echo ""
}

# ==================== 主程序 ====================

case "$1" in
    --emergency)
        emergency_rollback
        ;;
    --complete)
        complete_rollback
        ;;
    --help)
        show_help
        ;;
    *)
        # 默认执行紧急回滚
        emergency_rollback
        ;;
esac
