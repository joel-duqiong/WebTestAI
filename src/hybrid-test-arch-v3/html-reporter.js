/**
 * HTML 报告生成器 - v3.0 (完整版)
 * 包含：Agent 角色信息、详细测试用例步骤
 */

const fs = require('fs');
const path = require('path');

class HTMLReporter {
    constructor() {
        this.outputDir = './reports';
        this.agentDescriptions = {
            mia: { name: 'Mia', specialty: 'UI/UX 与表单', icon: '👁️' },
            sophia: { name: 'Sophia', specialty: '无障碍访问', icon: '♿' },
            tariq: { name: 'Tariq', specialty: '安全与 OWASP', icon: '🔒' },
            leila: { name: 'Leila', specialty: '内容质量', icon: '📝' },
            viktor: { name: 'Viktor', specialty: '性能优化', icon: '⚡' },
            zanele: { name: 'Zanele', specialty: '移动端', icon: '📱' },
            pete: { name: 'Pete', specialty: 'AI 聊天机器人', icon: '🤖' }
        };
    }

    /**
     * 生成 HTML 报告
     */
    async generate(results, outputDir) {
        if (!outputDir) {
            outputDir = this.outputDir;
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const reportPath = path.join(outputDir, `report-${Date.now()}.html`);
        
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>混合测试报告 v3.0 - ${results.baseUrl}</title>
    <style>
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #f0f6fc; --muted: #8b949e; --success: #3fb950; --error: #f85149; --accent: #58a6ff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 20px; }
        .container { max-width: 1600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, var(--card), var(--bg)); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .url { color: var(--accent); font-family: monospace; }
        .agents-bar { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .agent-badge { background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); border-radius: 20px; padding: 6px 12px; font-size: 13px; color: var(--accent); }
        .agent-info { margin-top: 16px; padding: 16px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; }
        .agent-info h3 { font-size: 14px; margin-bottom: 12px; color: var(--accent); }
        .agent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .agent-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
        .agent-card .name { font-weight: 600; margin-bottom: 4px; }
        .agent-card .specialty { font-size: 12px; color: var(--muted); }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
        .summary-card .label { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: 700; }
        .summary-card .value.success { color: var(--success); }
        .summary-card .value.failed { color: var(--error); }
        .section { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 24px; margin-bottom: 24px; }
        .section h2 { margin-bottom: 20px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--muted); font-weight: 600; font-size: 13px; text-transform: uppercase; }
        td { color: var(--text); font-size: 14px; }
        tr:hover { background: var(--bg); }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status.success { background: rgba(63,185,80,0.15); color: var(--success); }
        .status.failed { background: rgba(248,81,73,0.15); color: var(--error); }
        .details-btn { background: var(--accent); color: var(--text); border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .details-btn:hover { opacity: 0.8; }
        .details-row { background: var(--bg); }
        .details-content { max-width: 1200px; }
        .screenshot-container { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 100%; }
        .screenshot-container img { width: 100%; height: auto; display: block; }
        .screenshot-caption { background: var(--card); padding: 12px 16px; font-size: 13px; color: var(--muted); border-top: 1px solid var(--border); }
        .test-list { margin: 16px 0; }
        .test-item { padding: 8px 12px; border-radius: 6px; margin: 4px 0; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
        .test-item.passed { background: rgba(63,185,80,0.1); border-left: 3px solid var(--success); }
        .test-item.failed { background: rgba(248,81,73,0.1); border-left: 3px solid var(--error); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
        .stat-card .label { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
        .stat-card .value { font-size: 24px; font-weight: 700; color: var(--accent); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 混合测试报告 v3.0</h1>
            <div class="url">${results.baseUrl}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 8px;">${new Date(results.timestamp).toLocaleString('zh-CN')}</div>
            ${results.agents && results.agents.length > 0 ? `
            <div class="agents-bar">
                ${results.agents.map(a => `<span class="agent-badge">🤖 ${a}</span>`).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">爬取页面</div>
                <div class="value">${results.summary.crawledPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">成功</div>
                <div class="value success">${results.summary.successPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">失败</div>
                <div class="value failed">${results.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">问题</div>
                <div class="value">${results.summary.totalIssues}</div>
            </div>
        </div>
        
        ${results.agents && results.agents.length > 0 ? `
        <div class="agent-info">
            <h3>🤖 参与测试的 Agent 角色</h3>
            <div class="agent-grid">
                ${this.getAgentInfo(results.agents)}
            </div>
            <div style="margin-top: 12px; font-size: 13px; color: var(--muted);">
                <strong>参与测试:</strong> ${results.agents.join(', ')}
            </div>
        </div>
        ` : ''}
        
        ${results.issueStats ? `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">严重 (P8-10)</div>
                <div class="value" style="color: var(--error)">${results.issueStats.byPriority.critical}</div>
            </div>
            <div class="stat-card">
                <div class="label">中等 (P4-7)</div>
                <div class="value" style="color: var(--warning)">${results.issueStats.byPriority.medium}</div>
            </div>
            <div class="stat-card">
                <div class="label">轻微 (P1-3)</div>
                <div class="value" style="color: var(--success)">${results.issueStats.byPriority.low}</div>
            </div>
            ${results.issueStats.byType.length > 0 ? `
            <div class="stat-card">
                <div class="label">问题类型</div>
                <div class="value" style="font-size: 16px">${results.issueStats.byType.map(t => `${t.type}(${t.count})`).join(', ')}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <div class="section">
            <h2>📄 页面测试结果 (${results.pages.length})</h2>
            <table>
                <thead>
                    <tr><th>#</th><th>页面</th><th>标题</th><th>加载时间</th><th>测试</th><th>状态</th><th>详情</th></tr>
                </thead>
                <tbody>
                    ${results.pages.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.url}</td>
                        <td>${(p.title || '').substring(0, 30)}${(p.title || '').length > 30 ? '...' : ''}</td>
                        <td>${p.loadTime}ms</td>
                        <td>${p.tests ? `${p.testsPassed}/${p.testsTotal}` : '-'}</td>
                        <td><span class="status ${p.status === 200 ? 'success' : 'failed'}">${p.status}</span></td>
                        <td><button class="details-btn" onclick="toggleDetails(this, 'details-${i}')">📸 查看</button></td>
                    </tr>
                    <tr id="details-${i}" class="details-row" style="display: none;">
                        <td colspan="7" style="padding: 20px; background: var(--bg);">
                            <div class="details-content">
                                <h4 style="margin-bottom: 16px;">📸 页面截图 - ${p.title || '无标题'}</h4>
                                ${p.screenshot ? `
                                <div class="screenshot-container">
                                    <img src="data:image/png;base64,${p.screenshot.toString('base64')}" alt="${p.title}">
                                    <div class="screenshot-caption">${p.url} | ${p.loadTime}ms | ${p.testsPassed}/${p.testsTotal} 测试通过</div>
                                </div>
                                ` : '<p style="color: var(--muted);">无截图可用</p>'}
                                
                                <h4 style="margin: 24px 0 12px;">📋 测试用例详情</h4>
                                <div class="test-list">
                                    ${p.tests ? p.tests.map(t => `
                                    <div class="test-item ${t.passed ? 'passed' : 'failed'}">
                                        <strong>${t.name}</strong>: ${t.check}
                                        <span style="float: right">${t.passed ? '✅' : '❌'} ${t.actual}</span>
                                    </div>
                                    `).join('') : '<p style="color: var(--muted);">无测试用例</p>'}
                                </div>
                            </div>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${results.issues && results.issues.length > 0 ? `
        <div class="section">
            <h2>🐛 发现的问题 (${results.issues.length})</h2>
            ${results.issues.map((issue, i) => `
            <div class="issue-card" style="background: var(--card); border: 1px solid var(--border); border-left: 4px solid var(--error); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 12px;">${i + 1}. ${issue.bug_title}</h4>
                <div style="margin-bottom: 8px;"><strong>页面:</strong> <code style="background: var(--bg); padding: 2px 6px; border-radius: 4px;">${issue.page}</code></div>
                <div style="margin-bottom: 8px;"><strong>类型:</strong> ${issue.bug_type.join(', ')}</div>
                <div style="margin-bottom: 8px;"><strong>优先级:</strong> ${issue.bug_priority}/10</div>
                <div style="margin-bottom: 8px;"><strong>置信度:</strong> ${issue.bug_confidence}/10</div>
                <div style="margin-bottom: 8px;"><strong>建议:</strong> ${issue.suggested_fix}</div>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
            Hybrid Test Architecture v3.0 | Playwright + OpenTestAI | 爬取与分析分离
        </div>
    </div>
    
    <script>
        function toggleDetails(btn, rowId) {
            const row = document.getElementById(rowId);
            if (row.style.display === 'none') {
                row.style.display = 'table-row';
                btn.textContent = '🔼 收起';
            } else {
                row.style.display = 'none';
                btn.textContent = '📸 查看';
            }
        }
    </script>
</body>
</html>`;

        fs.writeFileSync(reportPath, html);
        console.log(`📄 HTML 报告已生成：${reportPath}`);
        
        // 自动打开
        try {
            require('child_process').exec(`start "${reportPath}" "${reportPath}"`);
            console.log('🌐 已自动打开 HTML 报告');
        } catch (e) {}

        return reportPath;
    }

    /**
     * 获取 Agent 信息 HTML
     */
    getAgentInfo(agents) {
        return agents.map(agent => {
            const info = this.agentDescriptions[agent] || { name: agent, specialty: '未知', icon: '🔧' };
            return `
            <div class="agent-card">
                <div class="name">${info.icon} ${info.name}</div>
                <div class="specialty">${info.specialty}</div>
            </div>
            `;
        }).join('');
    }
}

module.exports = HTMLReporter;
