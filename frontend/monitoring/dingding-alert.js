/**
 * 钉钉告警转发服务
 * 接收 Alertmanager 告警并转发到钉钉机器人
 */

const http = require('http');
const https = require('https');

// 配置
const DINGDING_ROBOT_TOKEN = process.env.DINGDING_ROBOT_TOKEN || 'your-token';
const PORT = process.env.PORT || 8080;

function sendDingdingMessage(title, text, isCritical = false) {
    const url = `https://oapi.dingtalk.com/robot/send?access_token=${DINGDING_ROBOT_TOKEN}`;
    
    const message = {
        msgtype: 'markdown',
        markdown: {
            title: title,
            text: text
        },
        at: {
            isAtAll: isCritical
        }
    };

    const data = JSON.stringify(message);
    const options = {
        hostname: 'oapi.dingtalk.com',
        port: 443,
        path: `/robot/send?access_token=${DINGDING_ROBOT_TOKEN}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.errcode === 0) {
                        resolve(result);
                    } else {
                        reject(new Error(`钉钉返回错误: ${result.errmsg}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

function formatAlertMessage(alerts) {
    const isCritical = alerts.some(a => a.labels.severity === 'critical');
    const alert = alerts[0];
    const labels = alert.labels;
    const annotations = alert.annotations;
    
    let title, text;
    
    if (isCritical) {
        title = `🚨 【CRITICAL】${labels.alertname}`;
        text = `## 🚨 **${labels.alertname}**\n\n` +
               `### 基本信息\n` +
               `- **级别**: <font color=\"#ff0000\">CRITICAL</font>\n` +
               `- **服务**: ${labels.service || 'N/A'}\n` +
               `- **组件**: ${labels.component || 'N/A'}\n\n` +
               `### 详细描述\n` +
               `${annotations.description || 'N/A'}\n\n` +
               `### 影响与建议\n` +
               `- **影响**: ${annotations.impact || 'N/A'}\n` +
               `- **操作**: ${annotations.action || 'N/A'}\n\n` +
               `---\n` +
               `⏰ 触发时间: ${new Date(alert.startsAt).toLocaleString('zh-CN')}\n` +
               `📊 当前值: ${alert.value || 'N/A'}\n` +
               `🔗 [查看 Grafana](http://localhost:3004)`;
    } else {
        title = `⚠️ 【WARNING】${labels.alertname}`;
        text = `## ⚠️ **${labels.alertname}**\n\n` +
               `### 基本信息\n` +
               `- **级别**: <font color=\"#ff9900\">WARNING</font>\n` +
               `- **服务**: ${labels.service || 'N/A'}\n` +
               `- **组件**: ${labels.component || 'N/A'}\n\n` +
               `### 详细描述\n` +
               `${annotations.description || 'N/A'}\n\n` +
               `### 建议操作\n` +
               `${annotations.action || 'N/A'}\n\n` +
               `---\n` +
               `⏰ 触发时间: ${new Date(alert.startsAt).toLocaleString('zh-CN')}\n` +
               `📊 当前值: ${alert.value || 'N/A'}`;
    }

    return { title, text, isCritical };
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/alert') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
            try {
                const alertData = JSON.parse(body);
                console.log(`[${new Date().toISOString()}] 收到告警: ${alertData.alerts.length} 条`);
                
                if (alertData.alerts && alertData.alerts.length > 0) {
                    const { title, text, isCritical } = formatAlertMessage(alertData.alerts);
                    await sendDingdingMessage(title, text, isCritical);
                    console.log(`[${new Date().toISOString()}] 告警已发送到钉钉`);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: '告警已处理' }));
            } catch (error) {
                console.error(`[${new Date().toISOString()}] 处理告警失败:`, error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('钉钉告警服务运行中\n\n配置检查:\n- DINGDING_ROBOT_TOKEN: ' + (DINGDING_ROBOT_TOKEN ? '已配置' : '未配置'));
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`钉钉告警服务已启动，监听端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}`);
    console.log(`告警端点: http://localhost:${PORT}/alert`);
});
