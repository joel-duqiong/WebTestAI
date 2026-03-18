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
            // OpenTestAI Agents（显示人名）
            mia: { name: 'Mia', specialty: 'UI/UX 与表单', icon: '👁️' },
            sophia: { name: 'Sophia', specialty: '无障碍访问', icon: '♿' },
            tariq: { name: 'Tariq', specialty: '安全与 OWASP', icon: '🔒' },
            leila: { name: 'Leila', specialty: '内容质量', icon: '📝' },
            viktor: { name: 'Viktor', specialty: '性能优化', icon: '⚡' },
            zanele: { name: 'Zanele', specialty: '移动端', icon: '📱' },
            pete: { name: 'Pete', specialty: 'AI 聊天机器人', icon: '🤖' }
            // 基础测试 Agents（不显示，只用 OpenTestAI Agents）
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
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #f0f6fc; --muted: #8b949e; --success: #3fb950; --error: #f85149; --accent: #58a6ff; --warning: #d29922; }
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
        .test-item.warning { background: rgba(210,153,34,0.1); border-left: 3px solid var(--warning); }
        .issue-card { transition: transform 0.2s, box-shadow 0.2s; }
        .issue-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
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
                <div class="label">加载失败</div>
                <div class="value failed">${results.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">发现问题</div>
                <div class="value">${results.summary.totalIssues || 0}</div>
            </div>
        </div>
        
        ${results.issueStats ? `
        <div class="summary-grid" style="margin-top: 16px;">
            <div class="summary-card" style="border-left: 3px solid var(--error);">
                <div class="label">严重 (P8-10)</div>
                <div class="value" style="color: var(--error)">${results.issueStats.byPriority.critical || 0}</div>
            </div>
            <div class="summary-card" style="border-left: 3px solid var(--warning);">
                <div class="label">中等 (P4-7)</div>
                <div class="value" style="color: var(--warning)">${results.issueStats.byPriority.medium || 0}</div>
            </div>
            <div class="summary-card" style="border-left: 3px solid var(--success);">
                <div class="label">轻微 (P1-3)</div>
                <div class="value" style="color: var(--success)">${results.issueStats.byPriority.low || 0}</div>
            </div>
            ${results.issueStats.byType && results.issueStats.byType.length > 0 ? `
            <div class="summary-card">
                <div class="label">问题类型</div>
                <div class="value" style="font-size: 14px">${results.issueStats.byType.map(t => `${t.type}(${t.count})`).join(', ')}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 24px; padding: 12px 16px; background: rgba(210,153,34,0.1); border: 1px solid rgba(210,153,34,0.3); border-radius: 8px; font-size: 13px;">
            <strong>💡 说明：</strong>
            <span style="color: var(--muted); margin-left: 8px;">
                "加载失败" = HTTP 错误（404/500/超时） | 
                "测试未通过" = 部分测试项失败（但页面可正常访问） |
                "⚠️" = 有警告项（如缺少链接，不影响功能）
            </span>
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
                        <td>${p.title && typeof p.title === 'string' ? p.title.substring(0, 30) + (p.title.length > 30 ? '...' : '') : '无标题'}</td>
                        <td>${p.loadTime}ms</td>
                        <td>${p.tests ? `${p.testsPassed}/${p.testsTotal}` : '-'}${p.hasWarnings ? ' ⚠️' : ''}</td>
                        <td><span class="status ${p.status === 200 ? 'success' : 'failed'}">${p.status}</span></td>
                        <td><button class="details-btn" onclick="toggleDetails(this, 'details-${i}')">📸 查看</button></td>
                    </tr>
                    <tr id="details-${i}" class="details-row" style="display: none;">
                        <td colspan="7" style="padding: 20px; background: var(--bg);">
                            <div class="details-content">
                                <h4 style="margin-bottom: 16px;">📸 页面截图 - ${p.title || '无标题'}</h4>
                                ${p.screenshot ? `
                                <div class="screenshot-container">
                                    <img src="data:image/png;base64,${Buffer.isBuffer(p.screenshot) ? p.screenshot.toString('base64') : p.screenshot}" alt="${p.title}">
                                    <div class="screenshot-caption">${p.url} | ${p.loadTime}ms | ${p.testsPassed}/${p.testsTotal} 测试通过</div>
                                </div>
                                ` : '<p style="color: var(--muted);">无截图可用</p>'}
                                
                                <h4 style="margin: 24px 0 12px;">📋 测试用例详情</h4>
                                <div class="test-list">
                                    ${p.tests ? p.tests.map(t => `
                                    <div class="test-item ${t.passed ? (t.warning ? 'warning' : 'passed') : 'failed'}">
                                        <strong>${t.name}</strong>: ${t.check}
                                        <span style="float: right">${t.passed ? (t.warning ? '⚠️' : '✅') : '❌'} ${t.actual}</span>
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
            ${results.issues.map((issue, i) => {
                const priorityColor = issue.bug_priority >= 8 ? 'var(--error)' : issue.bug_priority >= 4 ? 'var(--warning)' : 'var(--success)';
                const priorityLabel = issue.bug_priority >= 8 ? 'P8' : issue.bug_priority >= 4 ? 'P4' : 'P1';
                return `
                <div class="issue-card" style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <h3 style="font-size: 16px; margin: 0;">${issue.bug_title}</h3>
                        <div style="display: flex; gap: 8px;">
                            <span style="background: ${priorityColor}20; color: ${priorityColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${priorityLabel}</span>
                            <span style="background: var(--accent)20; color: var(--accent); padding: 4px 12px; border-radius: 20px; font-size: 12px;">C${issue.bug_confidence}</span>
                            <span style="background: rgba(139,92,246,0.2); color: #8b5cf6; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${issue.bug_type.join(' / ')}</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">为什么是问题</h4>
                        <p style="color: var(--text); line-height: 1.6;">${issue.bug_reasoning_why_a_bug || '需要进一步分析'}</p>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">修复建议</h4>
                        <p style="color: var(--text); line-height: 1.6;"><strong style="color: var(--success);">✓</strong> ${issue.suggested_fix || '需要进一步分析'}</p>
                    </div>
                    
                    ${issue.reproduction_steps ? `
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">复现步骤</h4>
                        <div style="background: var(--bg); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${issue.reproduction_steps}</div>
                    </div>
                    ` : ''}
                    
                    <div>
                        <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">给开发/AI 的修复提示词</h4>
                        <div style="background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: var(--accent);">
                            ${issue.ai_prompt || issue.suggested_fix || '需要进一步分析'}
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
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
