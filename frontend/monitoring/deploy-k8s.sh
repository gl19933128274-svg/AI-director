#!/bin/bash
# AI导演系统可观测性平台 - Kubernetes 部署脚本
# 使用方法: ./deploy-k8s.sh

set -e

NAMESPACE="monitoring"
HELM_CHART_PATH="./k8s"

echo "=========================================="
echo "  AI导演系统 - K8s 监控部署脚本"
echo "=========================================="

# 检查 kubectl
if ! command -v kubectl &> /dev/null; then
    echo "错误: kubectl 未安装"
    exit 1
fi

# 检查 helm
if ! command -v helm &> /dev/null; then
    echo "错误: helm 未安装"
    exit 1
fi

# 创建命名空间
echo ""
echo "1. 创建命名空间..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 添加 Helm 仓库
echo ""
echo "2. 添加 Helm 仓库..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# 部署 Prometheus
echo ""
echo "3. 部署 Prometheus..."
helm upgrade --install prometheus prometheus-community/prometheus \
    --namespace $NAMESPACE \
    --values $HELM_CHART_PATH/prometheus-values.yaml \
    --set server.configMapMountPath="/etc/prometheus/" \
    --wait --timeout 5m

# 部署 Grafana
echo ""
echo "4. 部署 Grafana..."
helm upgrade --install grafana grafana/grafana \
    --namespace $NAMESPACE \
    --values $HELM_CHART_PATH/grafana-values.yaml \
    --wait --timeout 5m

# 获取 Grafana 密码
echo ""
echo "5. 获取 Grafana 登录信息..."
kubectl get secret --namespace $NAMESPACE grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# 显示部署状态
echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "查看 Pod 状态:"
kubectl get pods -n $NAMESPACE
echo ""
echo "查看 Service:"
kubectl get svc -n $NAMESPACE
echo ""
echo "Ingress 配置:"
kubectl get ingress -n $NAMESPACE
echo ""
echo "访问地址 (取决于 Ingress 配置):"
echo "  - Prometheus:  http://prometheus-server.$NAMESPACE"
echo "  - Grafana:     http://grafana.$NAMESPACE"
echo ""
echo "Grafana 登录: admin / (查看上面的密码)"
echo ""
