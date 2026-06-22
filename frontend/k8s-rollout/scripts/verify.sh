#!/bin/bash
# AI导演系统监控指标验证脚本
# 用于灰度发布期间验证各项指标

set -e

# ==================== 配置参数 ====================
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring:9090}"
NAMESPACE="production"
SUCCESS_THRESHOLD="${SUCCESS_THRESHOLD:-95}"
ERROR_THRESHOLD="${ERROR_THRESHOLD:-1}"
LATENCY_THRESHOLD="${LATENCY_THRESHOLD:-0.5}"

# ==================== 工具函数 ====================

# 查询Prometheus
query_prometheus() {
    local query=$1
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result[0].value[1]')
    
    if [ -z "$result" ] || [ "$result" = "null" ]; then
        echo "0"
        return
    fi
    
    echo "$result"
}

# 获取成功率
get_success_rate() {
    local track=$1
    local query="sum(rate(http_requests_total{track=\"$track\",status=~\"2..\"}[5m])) / sum(rate(http_requests_total{track=\"$track\"}[5m])) * 100"
    query_prometheus "$query" | awk '{printf "%.1f", $1}'
}

# 获取错误率
get_error_rate() {
    local track=$1
    local query="sum(rate(http_requests_total{track=\"$track\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{track=\"$track\"}[5m])) * 100"
    query_prometheus "$query" | awk '{printf "%.2f", $1}'
}

# 获取延迟 P95
get_latency_p95() {
    local track=$1
    local query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{track=\"$track\"}[5m])) by (le))"
    query_prometheus "$query" | awk '{printf "%.2f", $1}'
}

# 获取请求数
get_request_count() {
    local track=$1
    local query="sum(rate(http_requests_total{track=\"$track\"}[5m]))"
    query_prometheus "$query" | awk '{printf "%.0f", $1}'
}

# 获取Pod数量
get_pod_count() {
    local track=$1
    local ready=$(kubectl get deployment "ai-director-$track" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local total=$(kubectl get deployment "ai-director-$track" -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
    echo "$ready/$total"
}

# 验证指标
validate_metrics() {
    echo "=========================================="
    echo "  监控指标验证"
    echo "=========================================="
    echo ""
    
    local canary_success=$(get_success_rate "canary")
    local stable_success=$(get_success_rate "stable")
    local canary_error=$(get_error_rate "canary")
    local canary_latency=$(get_latency_p95 "canary")
    local canary_requests=$(get_request_count "canary")
    local stable_requests=$(get_request_count "stable")
    
    echo "指标对比:"
    echo "┌──────────────────────────────────────────────┐"
    echo "│ 指标              │ 灰度版本       │ 稳定版本    │"
    echo "├───────────────────┼────────────────┼─────────────┤"
    echo "│ 成功率            │ ${canary_success}%          │ ${stable_success}%       │"
    echo "│ 错误率(5xx)       │ ${canary_error}%          │ -           │"
    echo "│ P95延迟(秒)       │ ${canary_latency}         │ -           │"
    echo "│ 请求数(每秒)      │ ${canary_requests}        │ ${stable_requests}       │"
    echo "│ Pod状态           │ $(get_pod_count "canary")   │ $(get_pod_count "stable") │"
    echo "└───────────────────┴────────────────┴─────────────┘"
    echo ""
    
    # 验证成功率
    local success_ok=0
    if (( $(echo "$canary_success >= $SUCCESS_THRESHOLD" | bc -l) )); then
        echo "✓ 成功率达标 (${canary_success}% >= ${SUCCESS_THRESHOLD}%)"
        success_ok=1
    else
        echo "✗ 成功率未达标 (${canary_success}% < ${SUCCESS_THRESHOLD}%)"
    fi
    
    # 验证错误率
    local error_ok=0
    if (( $(echo "$canary_error < $ERROR_THRESHOLD" | bc -l) )); then
        echo "✓ 错误率达标 (${canary_error}% < ${ERROR_THRESHOLD}%)"
        error_ok=1
    else
        echo "✗ 错误率未达标 (${canary_error}% >= ${ERROR_THRESHOLD}%)"
    fi
    
    # 验证延迟
    local latency_ok=0
    if (( $(echo "$canary_latency < $LATENCY_THRESHOLD" | bc -l) )); then
        echo "✓ 延迟达标 (${canary_latency}s < ${LATENCY_THRESHOLD}s)"
        latency_ok=1
    else
        echo "✗ 延迟未达标 (${canary_latency}s >= ${LATENCY_THRESHOLD}s)"
    fi
    
    echo ""
    
    # 返回结果
    if [ $success_ok -eq 1 ] && [ $error_ok -eq 1 ] && [ $latency_ok -eq 1 ]; then
        echo "✓ 所有指标验证通过"
        return 0
    else
        echo "✗ 部分指标未达标"
        return 1
    fi
}

# 持续监控
monitor() {
    echo "=========================================="
    echo "  持续监控模式 (按 Ctrl+C 退出)"
    echo "=========================================="
    echo ""
    
    while true; do
        clear
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        validate_metrics
        
        echo ""
        echo "刷新间隔: 10秒"
        sleep 10
    done
}

# 显示帮助
show_help() {
    echo "AI导演系统监控指标验证脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --validate       执行一次指标验证"
    echo "  --monitor        持续监控模式"
    echo "  --threshold N    设置成功率阈值 (默认: $SUCCESS_THRESHOLD)"
    echo "  --help           显示帮助信息"
    echo ""
    echo "环境变量:"
    echo "  PROMETHEUS_URL   Prometheus地址 (默认: http://prometheus.monitoring:9090)"
    echo "  SUCCESS_THRESHOLD 成功率阈值 (默认: $SUCCESS_THRESHOLD)"
    echo "  ERROR_THRESHOLD  错误率阈值 (默认: $ERROR_THRESHOLD)"
    echo "  LATENCY_THRESHOLD 延迟阈值(秒) (默认: $LATENCY_THRESHOLD)"
    echo ""
}

# ==================== 主程序 ====================

case "$1" in
    --validate)
        validate_metrics
        ;;
    --monitor)
        monitor
        ;;
    --threshold)
        if [ -n "$2" ]; then
            SUCCESS_THRESHOLD="$2"
            validate_metrics
        else
            echo "请指定阈值"
            exit 1
        fi
        ;;
    --help)
        show_help
        ;;
    *)
        validate_metrics
        ;;
esac
