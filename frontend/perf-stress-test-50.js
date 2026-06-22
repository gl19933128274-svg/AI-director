/**
 * 高并发性能测试 - 50并发 500请求
 */

const http = require('http');

const API_URL = 'http://localhost:3000/api/storyboard/generate';
const TOTAL_REQUESTS = 500;
const CONCURRENCY = 50;

let completedRequests = 0;
let startTime;

const metrics = {
    success: 0,
    failed: 0,
    responseTimes: [],
    cacheHits: 0,
    total: 0
};

const errorStats = {
    timeout: 0,
    connectionError: 0,
    serverError: 0,
    parseError: 0,
    apiError: 0,
    other: 0
};

// 使用多种请求体来测试不同产品类型
const requestBodies = [
    JSON.stringify({
        userInput: "高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感",
        videoDuration: 15,
        shotCount: 7,
        styles: ["low-saturation", "premium", "clean", "healing", "academic", "commute"]
    }),
    JSON.stringify({
        userInput: "时尚女装，模特展示，都市街头风",
        videoDuration: 20,
        shotCount: 5,
        styles: ["fashion", "dynamic", "commercial"]
    }),
    JSON.stringify({
        userInput: "数码产品手机，科技感，未来创新",
        videoDuration: 10,
        shotCount: 4,
        styles: ["tech", "minimalist", "premium"]
    })
];

function classifyError(err, statusCode, responseBody) {
    if (err.message && err.message.includes('timeout')) return 'timeout';
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return 'connectionError';
    if (statusCode >= 500) return 'serverError';
    if (statusCode >= 400) return 'apiError';
    if (responseBody) {
        try { JSON.parse(responseBody); } catch (e) { return 'parseError'; }
    }
    return 'other';
}

function makeRequest() {
    if (metrics.total >= TOTAL_REQUESTS) return;
    metrics.total++;

    const requestStart = Date.now();
    const url = new URL(API_URL);
    // 循环使用不同的请求体
    const requestBody = requestBodies[metrics.total % requestBodies.length];

    const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 30000
    }, (res) => {
        let data = '';

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
            const responseTime = Date.now() - requestStart;
            metrics.responseTimes.push(responseTime);

            if (res.statusCode === 200 && data.includes('"success":true')) {
                metrics.success++;
                if (responseTime < 100) {
                    metrics.cacheHits++;
                }
            } else {
                metrics.failed++;
                const errorType = classifyError({message: ''}, res.statusCode, data);
                errorStats[errorType]++;
            }

            completedRequests++;
            if (completedRequests % 50 === 0) {
                process.stdout.write(`\r进度: ${completedRequests}/${TOTAL_REQUESTS}`);
            }

            if (completedRequests >= TOTAL_REQUESTS) {
                printResults();
            } else {
                makeRequest();
            }
        });
    });

    req.on('error', (err) => {
        const responseTime = Date.now() - requestStart;
        metrics.responseTimes.push(responseTime);
        metrics.failed++;
        const errorType = classifyError(err, null, null);
        errorStats[errorType]++;

        completedRequests++;
        if (completedRequests % 50 === 0) {
            process.stdout.write(`\r进度: ${completedRequests}/${TOTAL_REQUESTS}`);
        }

        if (completedRequests >= TOTAL_REQUESTS) {
            printResults();
        } else {
            makeRequest();
        }
    });

    req.on('timeout', () => {
        const responseTime = Date.now() - requestStart;
        metrics.responseTimes.push(responseTime);
        metrics.failed++;
        errorStats.timeout++;
        req.destroy();

        completedRequests++;
        if (completedRequests >= TOTAL_REQUESTS) {
            printResults();
        } else {
            makeRequest();
        }
    });

    req.write(requestBody);
    req.end();
}

function calculatePercentile(sortedArr, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
}

function printResults() {
    const duration = Date.now() - startTime;
    const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
    const successRate = ((metrics.success / TOTAL_REQUESTS) * 100).toFixed(2);
    const cacheHitRate = metrics.success > 0 ? ((metrics.cacheHits / metrics.success) * 100).toFixed(2) : '0.00';

    console.log('\n');
    console.log('========================================');
    console.log('    高并发性能测试报告 (50并发/500请求)');
    console.log('========================================');

    console.log('\n【测试配置】');
    console.log(`  并发数: ${CONCURRENCY}`);
    console.log(`  总请求数: ${TOTAL_REQUESTS}`);
    console.log(`  测试时长: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  QPS: ${(TOTAL_REQUESTS / (duration / 1000)).toFixed(2)}`);

    console.log('\n【成功率统计】');
    console.log(`  成功请求: ${metrics.success} (${successRate}%)`);
    console.log(`  失败请求: ${metrics.failed} (${(100 - successRate).toFixed(2)}%)`);

    if (metrics.success > 0) {
        console.log('\n【响应时间分析】');
        console.log(`  平均响应时间: ${(sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length).toFixed(2)}ms`);
        console.log(`  最小响应时间: ${sortedTimes[0]}ms`);
        console.log(`  最大响应时间: ${sortedTimes[sortedTimes.length - 1]}ms`);
        console.log(`  P50 (中位数): ${calculatePercentile(sortedTimes, 50)}ms`);
        console.log(`  P95: ${calculatePercentile(sortedTimes, 95)}ms`);
        console.log(`  P99: ${calculatePercentile(sortedTimes, 99)}ms`);

        console.log('\n【缓存分析】');
        console.log(`  缓存命中次数: ${metrics.cacheHits}`);
        console.log(`  缓存命中率: ${cacheHitRate}%`);
    }

    const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
    if (totalErrors > 0) {
        console.log('\n【错误分类统计】');
        for (const [type, count] of Object.entries(errorStats)) {
            if (count > 0) {
                console.log(`  ${type}: ${count}次`);
            }
        }
    }

    console.log('\n========================================');
    console.log('  优化效果对比 (vs 优化前)');
    console.log('========================================');
    console.log(`  成功率:   89.4%  -> ${successRate}%`);
    console.log(`  平均响应: ~3500ms -> ${(sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length).toFixed(0)}ms`);
    console.log(`  P95响应:  ~5600ms -> ${calculatePercentile(sortedTimes, 95)}ms`);
    console.log(`  P99响应:  ~5800ms -> ${calculatePercentile(sortedTimes, 99)}ms`);
    console.log(`  缓存命中: 无      -> ${cacheHitRate}%`);
    console.log('========================================');
}

console.log('========================================');
console.log('  开始高并发性能测试 (50并发/500请求)');
console.log('========================================');
console.log(`目标: ${API_URL}`);
console.log(`并发: ${CONCURRENCY} | 总请求: ${TOTAL_REQUESTS}`);
console.log('----------------------------------------');

startTime = Date.now();

for (let i = 0; i < CONCURRENCY; i++) {
    makeRequest();
}
