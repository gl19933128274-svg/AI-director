/**
 * Storyboard API 压力测试脚本
 * 
 * 使用方式: node stress-test.js [并发数] [总请求数]
 * 示例: node stress-test.js 10 1000
 */

const http = require('http');
const https = require('https');

// 默认配置
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_TOTAL_REQUESTS = 1000;
const API_URL = 'http://localhost:3000/api/storyboard/generate';
const TIMEOUT = 30000; // 30秒超时

// 命令行参数
const concurrency = parseInt(process.argv[2]) || DEFAULT_CONCURRENCY;
const totalRequests = parseInt(process.argv[3]) || DEFAULT_TOTAL_REQUESTS;

// 测试结果统计
let completedRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let totalResponseTime = 0;
let responseTimes = [];
let startTime;

// 请求体
const requestBody = JSON.stringify({
    userInput: "高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感",
    videoDuration: 15,
    shotCount: 7,
    styles: ["low-saturation", "premium", "clean", "healing", "academic", "commute"]
});

// 请求选项
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
    }
};

function makeRequest() {
    const requestStart = Date.now();
    
    const url = new URL(API_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
        ...options,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search
    }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            const responseTime = Date.now() - requestStart;
            totalResponseTime += responseTime;
            responseTimes.push(responseTime);
            
            if (res.statusCode === 200) {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        successfulRequests++;
                    } else {
                        failedRequests++;
                        console.error(`请求失败: ${result.error}`);
                    }
                } catch (e) {
                    failedRequests++;
                    console.error(`响应解析失败: ${e.message}`);
                }
            } else {
                failedRequests++;
                console.error(`HTTP 错误: ${res.statusCode}`);
            }
            
            completedRequests++;
            checkCompletion();
        });
    });
    
    req.on('error', (e) => {
        const responseTime = Date.now() - requestStart;
        totalResponseTime += responseTime;
        responseTimes.push(responseTime);
        failedRequests++;
        completedRequests++;
        console.error(`请求错误: ${e.message}`);
        checkCompletion();
    });
    
    req.on('timeout', () => {
        const responseTime = Date.now() - requestStart;
        totalResponseTime += responseTime;
        responseTimes.push(responseTime);
        failedRequests++;
        completedRequests++;
        console.error('请求超时');
        req.destroy();
        checkCompletion();
    });
    
    req.write(requestBody);
    req.end();
}

function checkCompletion() {
    // 输出进度
    if (completedRequests % 100 === 0 || completedRequests === totalRequests) {
        const progress = ((completedRequests / totalRequests) * 100).toFixed(1);
        process.stdout.write(`\r进度: ${completedRequests}/${totalRequests} (${progress}%)`);
    }
    
    // 检查是否完成
    if (completedRequests >= totalRequests) {
        const duration = Date.now() - startTime;
        console.log('\n');
        printResults(duration);
    }
}

function printResults(duration) {
    // 排序响应时间
    responseTimes.sort((a, b) => a - b);
    
    // 计算统计数据
    const avgResponseTime = (totalResponseTime / completedRequests).toFixed(2);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;
    const maxResponseTime = responseTimes[responseTimes.length - 1] || 0;
    const minResponseTime = responseTimes[0] || 0;
    
    const successRate = ((successfulRequests / completedRequests) * 100).toFixed(2);
    const errorRate = ((failedRequests / completedRequests) * 100).toFixed(2);
    const qps = (completedRequests / (duration / 1000)).toFixed(2);
    
    console.log('========================================');
    console.log('         压力测试报告');
    console.log('========================================');
    console.log(`测试配置:`);
    console.log(`  - 并发数: ${concurrency}`);
    console.log(`  - 总请求数: ${totalRequests}`);
    console.log(`  - 测试时长: ${(duration / 1000).toFixed(2)}s`);
    console.log('');
    console.log('性能指标:');
    console.log(`  - QPS: ${qps}`);
    console.log(`  - 平均响应时间: ${avgResponseTime}ms`);
    console.log(`  - P95 响应时间: ${p95ResponseTime}ms`);
    console.log(`  - P99 响应时间: ${p99ResponseTime}ms`);
    console.log(`  - 最大响应时间: ${maxResponseTime}ms`);
    console.log(`  - 最小响应时间: ${minResponseTime}ms`);
    console.log('');
    console.log('成功率:');
    console.log(`  - 成功请求: ${successfulRequests} (${successRate}%)`);
    console.log(`  - 失败请求: ${failedRequests} (${errorRate}%)`);
    console.log('');
    console.log('========================================');
    
    // 输出 CSV 格式结果（便于导入）
    console.log('');
    console.log('CSV 格式结果:');
    console.log('并发数,总请求数,测试时长(ms),QPS,平均响应时间(ms),P95(ms),P99(ms),成功率(%),错误率(%)');
    console.log(`${concurrency},${totalRequests},${duration},${qps},${avgResponseTime},${p95ResponseTime},${p99ResponseTime},${successRate},${errorRate}`);
}

function startTest() {
    console.log('========================================');
    console.log('  Storyboard API 压力测试开始');
    console.log('========================================');
    console.log(`目标: ${API_URL}`);
    console.log(`并发: ${concurrency} | 总请求: ${totalRequests}`);
    console.log('----------------------------------------');
    
    startTime = Date.now();
    
    // 启动并发请求
    for (let i = 0; i < Math.min(concurrency, totalRequests); i++) {
        makeRequest();
    }
    
    // 持续发送请求直到达到总请求数
    const interval = setInterval(() => {
        if (completedRequests + concurrency < totalRequests) {
            for (let i = 0; i < concurrency; i++) {
                if (completedRequests < totalRequests) {
                    makeRequest();
                }
            }
        } else if (completedRequests >= totalRequests) {
            clearInterval(interval);
        }
    }, 10);
}

// 开始测试
startTest();
