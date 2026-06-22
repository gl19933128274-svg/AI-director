/**
 * 详细压力测试脚本 - 收集错误分类
 */

const http = require('http');

// 测试配置
const API_URL = 'http://localhost:3000/api/storyboard/generate';
const TOTAL_REQUESTS = 200;
const CONCURRENCY = 20;

let completedRequests = 0;
let startTime;

// 错误分类统计
const errorStats = {
    timeout: 0,
    connectionError: 0,
    serverError: 0,
    parseError: 0,
    apiError: 0,
    other: 0
};

const errorLogs = [];

// 请求体
const requestBody = JSON.stringify({
    userInput: "高端书包，低饱和、高级感、干净、治愈、学院风、通勤质感",
    videoDuration: 15,
    shotCount: 7,
    styles: ["low-saturation", "premium", "clean", "healing", "academic", "commute"]
});

function classifyError(err, statusCode, responseBody) {
    // 超时错误
    if (err.message && err.message.includes('timeout')) {
        return 'timeout';
    }
    
    // 连接错误
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return 'connectionError';
    }
    
    // 服务器错误 (5xx)
    if (statusCode >= 500) {
        return 'serverError';
    }
    
    // 客户端错误 (4xx)
    if (statusCode >= 400) {
        return 'apiError';
    }
    
    // 解析错误
    if (responseBody) {
        try {
            JSON.parse(responseBody);
        } catch (e) {
            return 'parseError';
        }
    }
    
    return 'other';
}

function makeRequest() {
    const url = new URL(API_URL);
    
    const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 5000 // 5秒超时
    }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            const errorType = classifyError({message: ''}, res.statusCode, data);
            
            if (res.statusCode !== 200 || !data.includes('"success":true')) {
                errorStats[errorType]++;
                
                // 记录错误详情
                let errorDetail = {
                    type: errorType,
                    statusCode: res.statusCode,
                    time: new Date().toISOString()
                };
                
                try {
                    const jsonData = JSON.parse(data);
                    errorDetail.error = jsonData.error || 'Unknown';
                    errorDetail.success = jsonData.success;
                } catch (e) {
                    errorDetail.error = data.substring(0, 200);
                }
                
                errorLogs.push(errorDetail);
            }
            
            completedRequests++;
            checkCompletion();
        });
    });
    
    req.on('error', (err) => {
        const errorType = classifyError(err, null, null);
        errorStats[errorType]++;
        errorLogs.push({
            type: errorType,
            error: err.message,
            code: err.code,
            time: new Date().toISOString()
        });
        
        completedRequests++;
        checkCompletion();
    });
    
    req.on('timeout', () => {
        errorStats.timeout++;
        errorLogs.push({
            type: 'timeout',
            error: 'Request timeout after 5000ms',
            time: new Date().toISOString()
        });
        req.destroy();
        
        completedRequests++;
        checkCompletion();
    });
    
    req.write(requestBody);
    req.end();
}

function checkCompletion() {
    if (completedRequests % 20 === 0) {
        process.stdout.write(`\r进度: ${completedRequests}/${TOTAL_REQUESTS}`);
    }
    
    if (completedRequests >= TOTAL_REQUESTS) {
        const duration = Date.now() - startTime;
        printResults(duration);
    }
}

function printResults(duration) {
    const successfulRequests = TOTAL_REQUESTS - Object.values(errorStats).reduce((a, b) => a + b, 0);
    const successRate = ((successfulRequests / TOTAL_REQUESTS) * 100).toFixed(2);
    
    console.log('\n');
    console.log('========================================');
    console.log('         详细错误分析报告');
    console.log('========================================');
    console.log(`\n测试配置:`);
    console.log(`  - 并发数: ${CONCURRENCY}`);
    console.log(`  - 总请求数: ${TOTAL_REQUESTS}`);
    console.log(`  - 测试时长: ${(duration / 1000).toFixed(2)}s`);
    
    console.log(`\n成功率统计:`);
    console.log(`  - 成功请求: ${successfulRequests} (${successRate}%)`);
    console.log(`  - 失败请求: ${TOTAL_REQUESTS - successfulRequests} (${(100 - successRate).toFixed(2)}%)`);
    
    console.log(`\n错误分类统计:`);
    console.log(`  ┌─────────────────┬────────┬────────┐`);
    console.log(`  │ 错误类型         │ 数量   │ 比例   │`);
    console.log(`  ├─────────────────┼────────┼────────┤`);
    
    for (const [type, count] of Object.entries(errorStats)) {
        if (count > 0) {
            const percentage = ((count / TOTAL_REQUESTS) * 100).toFixed(2);
            console.log(`  │ ${type.padEnd(15)} │ ${String(count).padStart(4)}  │ ${percentage.padStart(6)}% │`);
        }
    }
    console.log(`  └─────────────────┴────────┴────────┘`);
    
    console.log(`\n最近10条错误详情:`);
    console.log('----------------------------------------');
    errorLogs.slice(-10).forEach((log, index) => {
        console.log(`${index + 1}. [${log.type.toUpperCase()}] ${log.error || 'N/A'}`);
        if (log.statusCode) console.log(`   Status: ${log.statusCode}`);
        if (log.code) console.log(`   Code: ${log.code}`);
        console.log(`   Time: ${log.time}`);
    });
    
    console.log('\n========================================');
    
    // 输出修复建议
    console.log('\n修复建议:');
    if (errorStats.timeout > 0) {
        console.log(`\n1. 【超时问题】(${errorStats.timeout}次)`);
        console.log('   - 增加请求超时时间');
        console.log('   - 实现重试机制');
        console.log('   - 添加异步队列处理');
    }
    if (errorStats.connectionError > 0) {
        console.log(`\n2. 【连接问题】(${errorStats.connectionError}次)`);
        console.log('   - 检查服务器资源');
        console.log('   - 增加连接池大小');
        console.log('   - 优化服务器配置');
    }
    if (errorStats.serverError > 0) {
        console.log(`\n3. 【服务器错误】(${errorStats.serverError}次)`);
        console.log('   - 优化API处理逻辑');
        console.log('   - 增加错误处理');
        console.log('   - 减少内存泄漏');
    }
    if (errorStats.apiError > 0) {
        console.log(`\n4. 【API错误】(${errorStats.apiError}次)`);
        console.log('   - 检查请求参数验证');
        console.log('   - 优化响应格式');
    }
}

console.log('========================================');
console.log('  开始详细错误分析测试');
console.log('========================================');
console.log(`目标: ${API_URL}`);
console.log(`并发: ${CONCURRENCY} | 总请求: ${TOTAL_REQUESTS}`);
console.log('----------------------------------------');

startTime = Date.now();

// 启动并发请求
for (let i = 0; i < CONCURRENCY; i++) {
    makeRequest();
}
