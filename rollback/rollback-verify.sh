#!/bin/bash
# ==============================================================================
# 回滚验证脚本
# 验证回滚是否成功完成
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 验证步骤1: 检查服务状态
verify_service() {
    log_info "=== 验证1: 服务状态 ==="
    
    local status=$(kubectl get deployment ai-director -o jsonpath='{.status.readyReplicas}')
    local desired=$(kubectl get deployment ai-director -o jsonpath='{.spec.replicas}')
    
    if [ "$status" -eq "$desired" ]; then
        log_info "✅ 服务副本正常: $status/$desired"
        return 0
    else
        log_error "❌ 服务副本异常: $status/$desired"
        return 1
    fi
}

# 验证步骤2: 检查版本
verify_version() {
    log_info "=== 验证2: 版本检查 ==="
    
    local current=$(kubectl get deployment ai-director -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d: -f2)
    local expected="v1.9.0"
    
    if [ "$current" == "$expected" ]; then
        log_info "✅ 版本正确: $current"
        return 0
    else
        log_error "❌ 版本错误: 期望 $expected, 实际 $current"
        return 1
    fi
}

# 验证步骤3: 检查健康状态
verify_health() {
    log_info "=== 验证3: 健康检查 ==="
    
    local pod=$(kubectl get pods -l app=ai-director -o jsonpath='{.items[0].metadata.name}')
    local response=$(kubectl exec -it "$pod" -- curl -s -w "%{http_code}" http://localhost:3000/api/v1/health)
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" -eq 200 ]; then
        log_info "✅ 健康检查通过"
        return 0
    else
        log_error "❌ 健康检查失败: HTTP $status_code"
        return 1
    fi
}

# 验证步骤4: 检查数据库连接
verify_database() {
    log_info "=== 验证4: 数据库连接 ==="
    
    local pod=$(kubectl get pods -l app=ai-director -o jsonpath='{.items[0].metadata.name}')
    local result=$(kubectl exec -it "$pod" -- curl -s http://localhost:3000/api/v1/health | grep -i "database")
    
    if [ -n "$result" ]; then
        log_info "✅ 数据库连接正常"
        return 0
    else
        log_error "❌ 数据库连接异常"
        return 1
    fi
}

# 验证步骤5: 检查流量配置
verify_traffic() {
    log_info "=== 验证5: 流量配置 ==="
    
    local backend=$(kubectl get ingress ai-director-canary -o jsonpath='{.spec.rules[0].http.paths[0].backend.service.name}')
    
    if [ "$backend" == "ai-director-stable" ]; then
        log_info "✅ 流量已切回稳定版本"
        return 0
    else
        log_error "❌ 流量配置错误: 当前指向 $backend"
        return 1
    fi
}

# 主函数
main() {
    echo "=============================================="
    echo "         回滚验证脚本"
    echo "=============================================="
    echo ""
    
    local all_passed=true
    
    # 执行所有验证
    verify_service || all_passed=false
    echo ""
    verify_version || all_passed=false
    echo ""
    verify_health || all_passed=false
    echo ""
    verify_database || all_passed=false
    echo ""
    verify_traffic || all_passed=false
    echo ""
    
    # 输出结果
    if $all_passed; then
        log_info "=============================================="
        log_info "✅ 所有验证通过！回滚成功完成"
        log_info "=============================================="
        exit 0
    else
        log_error "=============================================="
        log_error "❌ 验证失败！请检查错误信息"
        log_error "=============================================="
        exit 1
    fi
}

main "$@"