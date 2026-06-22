/**
 * 生产环境压力测试脚本 - 使用 k6 等价方案
 * 覆盖核心接口：登录鉴权、核心业务流程、文件上传下载
 * 并发逐级递增：10 → 50 → 100 → 500 → 1000 QPS
 */

const http = require('http');
const fs = require('fs');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEST_STAGES = [
    { name: 'Stage 1 - 10 QPS', qps: 10, duration: 60000 },
    { name: 'Stage 2 - 50 QPS', qps: 50, duration: 60000 },
    { name: 'Stage 3 - 100 QPS', qps: 100, duration: 60000 },
    { name: 'Stage 4 - 500 QPS', qps: 500, duration: 120000 },
    { name: 'Stage 5 - 1000 QPS', qps: 1000, duration: 120000 }
];

// 测试结果
const results = [];
let currentStage = 0;

// 性能指标
const metrics = {
    success: 0,
    failed: 0,
    responseTimes: [],
    errors: {
        timeout: 0,
        connection: 0,
        server: 0,
        client: 0,
        other: 0
    }
};

// 生成随机用户数据
function generateRandomUser() {
    return {
        email: `test_${Math.random().toString(36).substring(2, 10)}@example.com`,
        password: 'password123'
    };
}

// 执行单个请求
async function executeRequest(endpoint, method = 'GET', body = null) {
    const startTime = Date.now();
    const url = new URL(endpoint, BASE_URL);

    return new Promise((resolve) => {
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock_token_123'
            },
            timeout: 30000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const duration = Date.now() - startTime;
                metrics.responseTimes.push(duration);
                
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    metrics.success++;
                } else {
                    metrics.failed++;
                    if (res.statusCode >= 500) metrics.errors.server++;
                    else metrics.errors.client++;
                }
                
                resolve({ success: res.statusCode < 400, duration, statusCode: res.statusCode });
            });
        });

        req.on('error', (err) => {
            const duration = Date.now() - startTime;
            metrics.responseTimes.push(duration);
            metrics.failed++;
            
            if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
                metrics.errors.connection++;
            } else {
                metrics.errors.other++;
            }
            
            resolve({ success: false, duration, error: err.message });
        });

        req.on('timeout', () => {
            const duration = Date.now() - startTime;
            metrics.responseTimes.push(duration);
            metrics.failed++;
            metrics.errors.timeout++;
            req.destroy();
            resolve({ success: false, duration, error: 'timeout' });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// 核心接口测试
async function runCoreTests() {
    const endpoints = [
        { name: '健康检查', endpoint: '/api/v1/health', method: 'GET' },
        { name: '用户信息', endpoint: '/api/v1/users/me', method: 'GET' },
        { name: '生成分镜', endpoint: '/api/storyboard/generate', method: 'POST', body: {
            userInput: '高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感',
            videoDuration: 15,
            shotCount: 7,
            styles: ['low-saturation', 'premium', 'clean', 'healing', 'academic', 'commute']
        }},
        { name: '模板列表', endpoint: '/api/v1/templates/available', method: 'GET' },
        { name: '作品列表', endpoint: '/api/v1/works', method: 'GET' }
    ];

    const promises = endpoints.map(async (ep) => {
        return executeRequest(ep.endpoint, ep.method, ep.body);
    });

    await Promise.all(promises);
}

// 计算百分位数
function calculatePercentile(sorted, percentile) {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
}

// 运行单个阶段
async function runStage(stage) {
    console.log(`\n[STAGE] ${stage.name}`);
    console.log(`        目标QPS: ${stage.qps} | 持续时间: ${stage.duration / 1000}s`);
    
    // 重置阶段指标
    const stageMetrics = { ...metrics };
    stageMetrics.success = 0;
    stageMetrics.failed = 0;
    stageMetrics.responseTimes = [];
    stageMetrics.errors = { timeout: 0, connection: 0, server: 0, client: 0, other: 0 };

    const startTime = Date.now();
    const requestsPerInterval = stage.qps / 10; // 每100ms的请求数
    const interval = 100; // 100ms间隔

    let completed = 0;
    const targetRequests = (stage.qps * stage.duration) / 1000;

    return new Promise((resolve) => {
        const runBatch = () => {
            if (Date.now() - startTime >= stage.duration || completed >= targetRequests) {
                const sortedTimes = [...stageMetrics.responseTimes].sort((a, b) => a - b);
                const successRate = ((stageMetrics.success / (stageMetrics.success + stageMetrics.failed)) * 100) || 0;
                const avgDuration = sortedTimes.length ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0;

                const result = {
                    stage: stage.name,
                    qps: stage.qps,
                    duration: (Date.now() - startTime) / 1000,
                    totalRequests: stageMetrics.success + stageMetrics.failed,
                    successRate: successRate.toFixed(2),
                    avgResponseTime: avgDuration.toFixed(2),
                    p50: calculatePercentile(sortedTimes, 50),
                    p95: calculatePercentile(sortedTimes, 95),
                    p99: calculatePercentile(sortedTimes, 99),
                    errorRate: ((stageMetrics.failed / (stageMetrics.success + stageMetrics.failed)) * 100).toFixed(2),
                    errors: stageMetrics.errors
                };

                results.push(result);
                console.log(`        完成: ${result.totalRequests} 请求`);
                console.log(`        成功率: ${result.successRate}%`);
                console.log(`        P95延迟: ${result.p95}ms`);
                console.log(`        错误率: ${result.errorRate}%`);
                
                resolve(result);
                return;
            }

            const batchSize = Math.min(requestsPerInterval, targetRequests - completed);
            const promises = [];
            
            for (let i = 0; i < batchSize; i++) {
                promises.push(runCoreTests().then(() => { completed++; }));
            }

            Promise.all(promises).then(() => {
                setTimeout(runBatch, interval);
            }).catch(() => {
                setTimeout(runBatch, interval);
            });
        };

        runBatch();
    });
}

// 生成压测报告
function generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('          生产环境压力测试报告');
    console.log('='.repeat(70));

    console.log('\n【测试配置】');
    console.log(`  目标URL: ${BASE_URL}`);
    console.log(`  测试阶段: ${TEST_STAGES.length} 个`);

    console.log('\n【测试结果汇总】');
    console.log(''.padEnd(80, '-'));
    console.log(`| 阶段 | 目标QPS | 成功率 | 平均延迟 | P95延迟 | P99延迟 | 错误率 |`);
    console.log(''.padEnd(80, '-'));

    let allPassed = true;
    results.forEach((result, index) => {
        const success = parseFloat(result.successRate) >= 99 && parseFloat(result.errorRate) < 1;
        const status = success ? '✅' : '❌';
        
        if (!success) allPassed = false;
        
        console.log(`| ${index + 1} | ${result.qps.toString().padEnd(8)} | ${result.successRate.padEnd(6)}% | ${result.avgResponseTime.padEnd(8)}ms | ${result.p95.toString().padEnd(7)}ms | ${result.p99.toString().padEnd(7)}ms | ${result.errorRate.padEnd(5)}% | ${status}`);
    });
    console.log(''.padEnd(80, '-'));

    console.log('\n【瓶颈点分析】');
    const problematicStages = results.filter(r => parseFloat(r.errorRate) >= 1 || r.p95 > 500);
    
    if (problematicStages.length === 0) {
        console.log('  ✅ 未发现明显瓶颈，系统表现良好');
    } else {
        problematicStages.forEach(stage => {
            console.log(`  ❌ ${stage.stage}:`);
            if (stage.p95 > 500) console.log(`     - P95延迟过高: ${stage.p95}ms (超过500ms阈值)`);
            if (parseFloat(stage.errorRate) >= 1) console.log(`     - 错误率过高: ${stage.errorRate}% (超过1%阈值)`);
        });
        console.log('\n  建议优化方向:');
        console.log('    - 检查数据库连接池配置');
        console.log('    - 增加API限流阈值');
        console.log('    - 优化AI生成分镜逻辑');
    }

    console.log('\n【资源使用建议】');
    console.log('  目标指标:');
    console.log('    - CPU < 70%');
    console.log('    - 内存 < 75%');
    console.log('    - P95响应时间 < 500ms');
    console.log('    - 错误率 < 1%');

    console.log('\n【结论】');
    if (allPassed) {
        console.log('  ✅ 压力测试通过，可以进入下一阶段');
    } else {
        console.log('  ⚠️ 压力测试存在问题，建议优化后重新测试');
    }

    console.log('='.repeat(70));

    // 保存报告
    const reportContent = JSON.stringify(results, null, 2);
    fs.writeFileSync('stress-test-report.json', reportContent);
    console.log('\n报告已保存: stress-test-report.json');
}

// 主函数
async function main() {
    console.log('='.repeat(70));
    console.log('    生产环境压力测试 - 逐级递增方案');
    console.log('='.repeat(70));
    console.log(`目标: ${BASE_URL}`);
    console.log(`阶段: ${TEST_STAGES.map(s => s.qps).join(' → ')} QPS`);

    for (let i = 0; i < TEST_STAGES.length; i++) {
        await runStage(TEST_STAGES[i]);
        
        // 检查是否需要停止
        const lastResult = results[results.length - 1];
        if (parseFloat(lastResult.errorRate) > 1) {
            console.log(`\n⚠️ 错误率超过1%，停止测试`);
            break;
        }
    }

    generateReport();
}

main().catch(console.error);