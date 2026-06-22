#!/bin/bash
# AI导演系统灰度发布自动化脚本
# 支持：10% → 20% → 50% → 100% 渐进式发布
# 每个阶段自动验证监控指标

set -e

# ==================== 配置参数 ====================
NAMESPACE="production"
INGRESS_NAME="ai-director-canary"
STABLE_DEPLOYMENT="ai-director-stable"
CANARY_DEPLOYMENT="ai-director-canary"
PROMETHEUS_URL="http://prometheus.monitoring:9090"
SUCCESS_THRESHOLD="95"
MAX_WAIT_MINUTES="30"
CHECK_INTERVAL_SECONDS="30"

# 灰度发布阶段配置
PHASES=(
    "10:Phase1-10%流量"
    "20:Phase2-20%流量"
    "50:Phase3-50%流量"
    "100:Phase4-全量发布"
)

# ==================== 工具函数 ====================

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "错误: 需要安装 $1"
        exit 1
    fi
}

# 设置灰度流量比例
set_canary_weight() {
    local weight=$1
    echo "设置灰度流量比例: ${weight}%"
    kubectl annotate ingress "$INGRESS_NAME" \
        nginx.ingress.kubernetes.io/canary-weight="$weight" \
        --overwrite -n "$NAMESPACE"
    
    # 更新阶段标识
    kubectl annotate ingress "$INGRESS_NAME" \
        canary-phase="phase-${weight}%" \
        --overwrite -n "$NAMESPACE"
}

# 获取当前灰度流量比例
get_canary_weight() {
    kubectl get ingress "$INGRESS_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/canary-weight}'
}

# 验证服务健康状态
verify_health() {
    echo "验证服务健康状态..."
    
    # 检查稳定版本
    local stable_ready=$(kubectl get deployment "$STABLE_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    local stable_total=$(kubectl get deployment "$STABLE_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
    
    echo "稳定版本: ${stable_ready}/${stable_total} Pod 就绪"
    
    if [ "$stable_ready" != "$stable_total" ]; then
        echo "错误: 稳定版本 Pod 未完全就绪"
        return 1
    fi
    
    # 检查灰度版本（如果存在）
    if kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" &> /dev/null; then
        local canary_ready=$(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        local canary_total=$(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
        
        echo "灰度版本: ${canary_ready}/${canary_total} Pod 就绪"
        
        if [ "$canary_ready" != "$canary_total" ]; then
            echo "错误: 灰度版本 Pod 未完全就绪"
            return 1
        fi
    fi
    
    echo "✓ 服务健康检查通过"
    return 0
}

# 从 Prometheus 获取成功率
get_success_rate() {
    local track=$1
    local query="sum(rate(http_requests_total{track=\"$track\",status=~\"2..\"}[5m])) / sum(rate(http_requests_total{track=\"$track\"}[5m])) * 100"
    
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result[0].value[1]')
    
    if [ -z "$result" ] || [ "$result" = "null" ]; then
        echo "0"
        return
    fi
    
    echo "$result" | awk '{printf "%.1f", $1}'
}

# 从 Prometheus 获取错误率
get_error_rate() {
    local track=$1
    local query="sum(rate(http_requests_total{track=\"$track\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{track=\"$track\"}[5m])) * 100"
    
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result[0].value[1]')
    
    if [ -z "$result" ] || [ "$result" = "null" ]; then
        echo "0"
        return
    fi
    
    echo "$result" | awk '{printf "%.2f", $1}'
}

# 验证成功率
verify_success_rate() {
    local weight=$1
    local max_wait=$((MAX_WAIT_MINUTES * 60))
    local elapsed=0
    
    echo "等待监控指标稳定..."
    
    while [ $elapsed -lt $max_wait ]; do
        local canary_rate=$(get_success_rate "canary")
        local stable_rate=$(get_success_rate "stable")
        local canary_error=$(get_error_rate "canary")
        
        echo "$(date '+%H:%M:%S') - 灰度成功率: ${canary_rate}%, 稳定成功率: ${stable_rate}%, 灰度错误率: ${canary_error}%"
        
        # 检查成功率是否达标
        if (( $(echo "$canary_rate >= $SUCCESS_THRESHOLD" | bc -l) )); then
            echo "✓ 成功率达标 (${canary_rate}% >= ${SUCCESS_THRESHOLD}%)"
            
            # 检查错误率是否低于阈值
            if (( $(echo "$canary_error < 1" | bc -l) )); then
                echo "✓ 错误率达标 (${canary_error}% < 1%)"
                return 0
            else
                echo "警告: 错误率较高 (${canary_error}%)"
            fi
        fi
        
        sleep $CHECK_INTERVAL_SECONDS
        elapsed=$((elapsed + CHECK_INTERVAL_SECONDS))
        
        # 检查用户是否要求暂停
        if [ -f "/tmp/canary-pause" ]; then
            echo "检测到暂停信号，等待用户确认..."
            while [ -f "/tmp/canary-pause" ]; do
                sleep 5
            done
            echo "继续发布流程..."
        fi
    done
    
    echo "错误: 超时 - 成功率未达标"
    return 1
}

# 确认继续
confirm_continue() {
    local phase=$1
    local weight=$2
    
    echo ""
    echo "=========================================="
    echo "  当前阶段: ${phase}"
    echo "  流量比例: ${weight}%"
    echo "=========================================="
    echo ""
    
    read -p "是否继续到下一阶段? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "用户取消，暂停发布流程"
        touch "/tmp/canary-pause"
        exit 0
    fi
}

# 发布完成
complete_rollout() {
    echo ""
    echo "=========================================="
    echo "  灰度发布完成!"
    echo "=========================================="
    echo ""
    echo "当前状态:"
    echo "  - 灰度流量: $(get_canary_weight)%"
    echo "  - 灰度版本: $(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')"
    echo ""
    
    # 清理暂停标记
    rm -f "/tmp/canary-pause"
}

# 显示帮助
show_help() {
    echo "AI导演系统灰度发布脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --start          开始灰度发布流程"
    echo "  --pause          暂停发布流程"
    echo "  --resume         恢复发布流程"
    echo "  --rollback       回滚到稳定版本"
    echo "  --status         查看当前发布状态"
    echo "  --set-weight N   设置灰度流量比例为 N%"
    echo "  --help           显示帮助信息"
    echo ""
    echo "环境变量:"
    echo "  NAMESPACE        命名空间 (默认: production)"
    echo "  SUCCESS_THRESHOLD 成功率阈值 (默认: 95)"
    echo ""
}

# 查看状态
show_status() {
    echo "=========================================="
    echo "  灰度发布状态"
    echo "=========================================="
    echo ""
    
    # 当前流量比例
    local weight=$(get_canary_weight)
    echo "当前灰度流量: ${weight}%"
    
    # Ingress 信息
    echo ""
    echo "Ingress 配置:"
    kubectl get ingress "$INGRESS_NAME" -n "$NAMESPACE" -o yaml | grep -E "(canary-weight|canary-phase)"
    
    # Pod 状态
    echo ""
    echo "Pod 状态:"
    kubectl get pods -n "$NAMESPACE" -l app=ai-director
    
    # 成功率
    echo ""
    echo "监控指标:"
    echo "  灰度成功率: $(get_success_rate "canary")%"
    echo "  稳定成功率: $(get_success_rate "stable")%"
    echo "  灰度错误率: $(get_error_rate "canary")%"
    
    # 暂停状态
    if [ -f "/tmp/canary-pause" ]; then
        echo ""
        echo "⚠️  发布流程已暂停"
    fi
}

# 主发布流程
run_rollout() {
    echo "=========================================="
    echo "  AI导演系统灰度发布流程"
    echo "=========================================="
    echo ""
    
    # 检查前置条件
    check_command kubectl
    check_command curl
    check_command jq
    check_command bc
    
    # 验证服务健康
    if ! verify_health; then
        echo "错误: 服务未就绪"
        exit 1
    fi
    
    # 遍历每个阶段
    for phase in "${PHASES[@]}"; do
        IFS=":" read -r weight phase_name <<< "$phase"
        
        echo ""
        echo "------------------------------"
        echo "  ${phase_name}"
        echo "------------------------------"
        
        # 设置流量比例
        set_canary_weight "$weight"
        
        # 等待配置生效
        echo "等待配置生效..."
        sleep 10
        
        # 验证指标
        if ! verify_success_rate "$weight"; then
            echo "错误: 监控指标未达标，回滚中..."
            ./scripts/rollback.sh
            exit 1
        fi
        
        # 如果不是最后一个阶段，询问是否继续
        if [ "$weight" != "100" ]; then
            confirm_continue "$phase_name" "$weight"
        fi
    done
    
    # 完成发布
    complete_rollout
}

# ==================== 主程序 ====================

case "$1" in
    --start)
        run_rollout
        ;;
    --pause)
        touch "/tmp/canary-pause"
        echo "已暂停发布流程"
        ;;
    --resume)
        rm -f "/tmp/canary-pause"
        echo "已恢复发布流程"
        ;;
    --rollback)
        ./scripts/rollback.sh
        ;;
    --status)
        show_status
        ;;
    --set-weight)
        if [ -z "$2" ]; then
            echo "请指定流量比例"
            exit 1
        fi
        set_canary_weight "$2"
        echo "已设置灰度流量为 ${2}%"
        ;;
    --help)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
