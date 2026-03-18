/**
 * HTML 报告生成器 - v3.1 (完整版)
 * 改进：显示 Agent 角色全名 + 测试开始/结束时间
 */

const fs = require('fs');
const path = require('path');

class HTMLReporter {
    constructor() {
        this.outputDir = './reports';
        // 33 个 OpenTestAI Agent 角色映射
        this.agentDescriptions = {
            // 页面类型 Agent
            'homepage': { name: '首页测试员', specialty: '首页体验优化', icon: '🏠' },
            'about-pages': { name: '关于页面测试员', specialty: '关于/团队页面', icon: '📖' },
            'contact-pages': { name: '联系页面测试员', specialty: '联系/支持页面', icon: '📞' },
            'pricing-pages': { name: '定价页面测试员', specialty: '价格/订阅页面', icon: '💰' },
            'landing-pages': { name: '落地页测试员', specialty: '营销/活动页面', icon: '🎯' },
            'product-catalog': { name: '产品目录测试员', specialty: '产品列表/分类', icon: '📦' },
            'product-details': { name: '产品详情测试员', specialty: '产品详情页', icon: '🏷️' },
            'shopping-cart': { name: '购物车测试员', specialty: '购物车功能', icon: '🛒' },
            'checkout': { name: '结账流程测试员', specialty: '支付/结算', icon: '💳' },
            'signup': { name: '注册流程测试员', specialty: '登录/注册', icon: '👤' },
            'search-box': { name: '搜索框测试员', specialty: '搜索功能', icon: '🔎' },
            'search-results': { name: '搜索结果测试员', specialty: '搜索结果页', icon: '📋' },
            'news': { name: '新闻页面测试员', specialty: '新闻/博客', icon: '📰' },
            'video': { name: '视频测试员', specialty: '视频播放', icon: '🎬' },
            'social-feed': { name: '社交动态测试员', specialty: '信息流', icon: '📱' },
            'social-profiles': { name: '社交资料测试员', specialty: '用户资料', icon: '👥' },
            'ai-chatbots': { name: 'AI 聊天机器人测试员', specialty: '聊天组件', icon: '🤖' },
            'javascript-booking-flows': { name: '预订流程测试员', specialty: '预约/预订', icon: '📅' },
            'error-messages-careers-pages': { name: '错误/招聘页面测试员', specialty: '错误页/招聘', icon: '⚠️' },
            'genai-code': { name: '生成式 AI 代码测试员', specialty: 'AI 代码生成', icon: '💻' },
            
            // 通用 Agent（原 OpenTestAI 角色）
            'ui-ux-forms': { name: 'Mia · UI/UX 表单', specialty: '界面与表单体验', icon: '👁️' },
            'accessibility': { name: 'Sophia · 无障碍', specialty: 'WCAG 合规', icon: '♿' },
            'security-owasp': { name: 'Tariq · 安全', specialty: 'OWASP Top 10', icon: '🔒' },
            'content': { name: 'Leila · 内容', specialty: '内容质量', icon: '📝' },
            'performance-core-web-vitals': { name: 'Viktor · 性能', specialty: 'Core Web Vitals', icon: '⚡' },
            'mobile': { name: 'Zanele · 移动端', specialty: '响应式/触摸', icon: '📱' },
            'console-logs': { name: '控制台日志测试员', specialty: 'JS 错误检测', icon: '🖥️' },
            'privacy-cookie-consent': { name: '隐私/Cookie 测试员', specialty: 'Cookie 合规', icon: '🍪' },
            'gdpr-compliance': { name: 'GDPR 合规测试员', specialty: '欧盟数据保护', icon: '🇪🇺' },
            'wcag-compliance': { name: 'WCAG 合规测试员', specialty: '无障碍标准', icon: '♿' },
            'i18n-localization': { name: '国际化测试员', specialty: '多语言支持', icon: '🌐' },
            'networking-connectivity': { name: '网络连接测试员', specialty: 'API/网络', icon: '🔗' },
            'system-errors': { name: '系统错误测试员', specialty: '错误处理', icon: '⚠️' }
        };
    }

    /**
     * 获取 Agent 显示信息
     */
    getAgentInfo(agentId) {
        return this.agentDescriptions[agentId] || {
            name: agentId,
            specialty: '未知',
            icon: '🔹'
        };
    }

    /**
     * 生成 HTML 报告
     */
    async generate(results, outputDir) {
        if (!outputDir) outputDir = this.outputDir;
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const reportPath = path.join(outputDir, `report-${Date.now()}.html`);
        
        // 计算测试时间
        const testStartTime = results.testStartTime || results.timestamp;
        const testEndTime = results.testEndTime || new Date().toISOString();
        const duration = this.calculateDuration(testStartTime, testEndTime);

        // 收集所有参与的 Agent 及其统计
        const agentStats = this.collectAgentStats(results);

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>混合测试报告 v3.1 - ${results.baseUrl}</title>
    <style>
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #f0f6fc; --muted: #8b949e; --success: #3fb950; --error: #f85149; --accent: #58a6ff; --warning: #d29922; --info: #38bdf8; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 20px; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; }
        
        /* Header */
        .header { background: linear-gradient(135deg, var(--card), var(--bg)); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
        .header .version { background: var(--accent); color: var(--bg); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .header .url { color: var(--accent); font-family: 'Consolas', monospace; font-size: 14px; word-break: break-all; }
        .header .meta { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .header .meta-item { background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border); }
        .header .meta-label { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
        .header .meta-value { font-size: 14px; font-weight: 600; }
        
        /* Agents Bar */
        .agents-bar { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .agent-badge { background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); border-radius: 20px; padding: 6px 14px; font-size: 13px; color: var(--accent); display: flex; align-items: center; gap: 6px; }
        .agent-badge .icon { font-size: 14px; }
        
        /* Summary */
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
        .summary-card .label { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: 700; }
        .summary-card .value.success { color: var(--success); }
        .summary-card .value.failed { color: var(--error); }
        .summary-card .value.info { color: var(--info); }
        .summary-card .sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
        
        /* Priority Stats */
        .priority-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .priority-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; border-left: 4px solid; }
        .priority-card.critical { border-left-color: var(--error); }
        .priority-card.medium { border-left-color: var(--warning); }
        .priority-card.low { border-left-color: var(--success); }
        .priority-card .label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
        .priority-card .value { font-size: 28px; font-weight: 700; }
        .priority-card.critical .value { color: var(--error); }
        .priority-card.medium .value { color: var(--warning); }
        .priority-card.low .value { color: var(--success); }
        
        /* Section */
        .section { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 24px; margin-bottom: 24px; }
        .section h2 { margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 10px; }
        
        /* Agent Grid */
        .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .agent-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; transition: transform 0.2s, border-color 0.2s; }
        .agent-card:hover { transform: translateY(-2px); border-color: var(--accent); }
        .agent-card .header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .agent-card .icon { font-size: 24px; }
        .agent-card .name { font-weight: 600; font-size: 14px; }
        .agent-card .specialty { font-size: 12px; color: var(--muted); }
        .agent-card .stats { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); }
        .agent-card .stats strong { color: var(--text); }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { font-size: 14px; }
        tr:hover { background: var(--bg); }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
        .status.success { background: rgba(63,185,80,0.15); color: var(--success); }
        .status.failed { background: rgba(248,81,73,0.15); color: var(--error); }
        .status.warning { background: rgba(210,153,34,0.15); color: var(--warning); }
        
        /* Details */
        .details-btn { background: var(--accent); color: var(--text); border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: opacity 0.2s; }
        .details-btn:hover { opacity: 0.8; }
        .details-row { background: var(--bg); }
        .details-content { padding: 16px; }
        .screenshot-container { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 100%; }
        .screenshot-container img { width: 100%; height: auto; display: block; }
        .screenshot-caption { background: var(--card); padding: 12px 16px; font-size: 13px; color: var(--muted); border-top: 1px solid var(--border); }
        
        /* Test List */
        .test-list { margin: 16px 0; }
        .test-item { padding: 10px 14px; border-radius: 6px; margin: 6px 0; font-size: 13px; display: flex; justify-content: space-between; align-items: center; border: 1px solid; }
        .test-item.passed { background: rgba(63,185,80,0.08); border-color: rgba(63,185,80,0.3); }
        .test-item.failed { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.3); }
        .test-item .name { font-weight: 500; }
        .test-item .check { color: var(--muted); font-size: 12px; }
        .test-item .result { font-weight: 600; }
        .test-item.passed .result { color: var(--success); }
        .test-item.failed .result { color: var(--error); }
        
        /* Footer */
        .footer { text-align: center; padding: 24px; color: var(--muted); font-size: 13px; }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header h1 { font-size: 20px; }
            .summary-card .value { font-size: 24px; }
            table { font-size: 12px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>
                🧪 混合测试报告 v3.1
                <span class="version">Dynamic Agents</span>
            </h1>
            <div class="url">${this.escapeHtml(results.baseUrl)}</div>
            
            <div class="meta">
                <div class="meta-item">
                    <div class="meta-label">🕐 测试开始</div>
                    <div class="meta-value">${this.formatDateTime(testStartTime)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">🕐 测试结束</div>
                    <div class="meta-value">${this.formatDateTime(testEndTime)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">⏱️ 测试耗时</div>
                    <div class="meta-value">${duration}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">🤖 参与 Agent</div>
                    <div class="meta-value">${Object.keys(agentStats).length} 个角色</div>
                </div>
            </div>
            
            <div class="agents-bar">
                ${results.agents.map(id => {
                    const info = this.getAgentInfo(id);
                    return `<span class="agent-badge"><span class="icon">${info.icon}</span>${this.escapeHtml(info.name)}</span>`;
                }).join('')}
            </div>
        </div>

        <!-- Summary -->
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">📄 爬取页面</div>
                <div class="value">${results.summary.crawledPages}</div>
                <div class="sub">总计</div>
            </div>
            <div class="summary-card">
                <div class="label">✅ 成功</div>
                <div class="value success">${results.summary.successPages}</div>
                <div class="sub">HTTP 200</div>
            </div>
            <div class="summary-card">
                <div class="label">❌ 加载失败</div>
                <div class="value failed">${results.summary.failedPages}</div>
                <div class="sub">4xx/5xx/超时</div>
            </div>
            <div class="summary-card">
                <div class="label">📋 测试用例</div>
                <div class="value info">${this.calculateTotalTests(results)}</div>
                <div class="sub">总计</div>
            </div>
            <div class="summary-card">
                <div class="label"> 发现问题</div>
                <div class="value ${results.summary.totalIssues > 0 ? 'failed' : 'success'}">${results.summary.totalIssues}</div>
                <div class="sub">LLM 分析</div>
            </div>
        </div>

        <!-- Priority Stats -->
        ${this.renderPriorityStats(results.issueStats, results.pages)}

        <!-- Agent Roles -->
        <div class="section">
            <h2>🤖 参与测试的 Agent 角色</h2>
            <div class="agent-grid">
                ${Object.entries(agentStats).map(([id, stats]) => {
                    const info = this.getAgentInfo(id);
                    return `
                        <div class="agent-card">
                            <div class="header">
                                <span class="icon">${info.icon}</span>
                                <div>
                                    <div class="name">${this.escapeHtml(info.name)}</div>
                                    <div class="specialty">${this.escapeHtml(info.specialty)}</div>
                                </div>
                            </div>
                            <div class="stats">
                                覆盖 <strong>${stats.pages}</strong> 页 · 
                                测试 <strong>${stats.tests}</strong> 个
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Pages Table -->
        <div class="section">
            <h2>📑 页面测试结果</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>页面</th>
                        <th>标题</th>
                        <th>加载时间</th>
                        <th>测试</th>
                        <th>状态</th>
                        <th>详情</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.pages.map((page, index) => `
                        <tr>
                            <td style="color: var(--muted);">${index + 1}</td>
                            <td style="max-width: 350px; overflow: hidden; text-overflow: ellipsis;">
                                <a href="${this.escapeHtml(page.url)}" target="_blank" style="color: var(--accent); text-decoration: none;">
                                    ${this.escapeHtml(page.url.length > 50 ? page.url.substring(0, 50) + '...' : page.url)}
                                </a>
                            </td>
                            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(page.title || '')}">
                                ${this.escapeHtml((page.title || '').length > 40 ? (page.title || '').substring(0, 40) + '...' : (page.title || '-'))}
                            </td>
                            <td>${page.loadTime || '-'} ms</td>
                            <td>
                                <span style="color: ${page.testsPassed === page.testsTotal ? 'var(--success)' : 'var(--warning)'}">
                                    ${page.testsPassed !== undefined ? `${page.testsPassed}/${page.testsTotal}` : '-'}
                                </span>
                            </td>
                            <td>
                                <span class="status ${page.status === 200 ? 'success' : 'failed'}">
                                    ${page.status || '-'}
                                </span>
                            </td>
                            <td>
                                <button class="details-btn" onclick="document.getElementById('details-${index}').style.display = document.getElementById('details-${index}').style.display === 'none' ? 'table-row' : 'none'; this.textContent = this.textContent === '查看' ? '收起' : '查看'">
                                    ${page.tests && page.tests.length > 0 ? (index === 0 ? '收起' : '查看') : '-'}
                                </button>
                            </td>
                        </tr>
                        ${page.tests && page.tests.length > 0 ? `
                            <tr id="details-${index}" class="details-row" style="display: ${index === 0 ? 'table-row' : 'none'};">
                                <td colspan="7">
                                    <div class="details-content">
                                        <h3 style="margin: 0 0 16px 0; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 8px;">
                                            <span>📋</span> 测试用例详情
                                        </h3>
                                        <div style="margin-bottom: 16px; color: var(--muted); font-size: 13px;">
                                            <strong>匹配 Agent:</strong> ${(page.matchedAgents || []).map(id => this.getAgentInfo(id).name).join(', ')}
                                        </div>
                                        <div class="test-list">
                                            ${page.tests.map(test => `
                                                <div class="test-item ${test.passed ? 'passed' : 'failed'}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; margin: 6px 0; background: ${test.passed ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)'}; border: 1px solid ${test.passed ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}; border-radius: 6px;">
                                                    <div style="flex: 1;">
                                                        <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">${this.escapeHtml(test.name)}</div>
                                                        <div style="color: var(--muted); font-size: 12px;">: ${this.escapeHtml(test.check)}</div>
                                                    </div>
                                                    <div style="font-weight: 600; font-size: 13px; color: ${test.passed ? 'var(--success)' : 'var(--error)'}; white-space: nowrap; margin-left: 16px;">
                                                        ${test.passed ? '✅' : '❌'} ${this.escapeHtml(test.actual)}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        ${page.screenshot && typeof page.screenshot === 'string' && page.screenshot.length > 1000 ? `
                                            <div class="screenshot-container">
                                                <img src="data:image/png;base64,${page.screenshot.replace(/[\r\n\s]/g, '')}" alt="Screenshot" style="max-width: 100%; height: auto; display: block;">
                                                <div class="screenshot-caption">📸 页面截图 - ${this.escapeHtml(page.title || '无标题')}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Issues (if any) -->
        ${this.renderIssuesSection(results)}

        <!-- Footer -->
        <div class="footer">
            生成于 ${this.formatDateTime(new Date().toISOString())} · WebTestAI v3.1 · 基于 OpenTestAI 33 个测试角色
        </div>
    </div>

    <script>
        // 自动展开第一个失败的页面详情
        document.querySelectorAll('.details-row').forEach((row, i) => {
            if (row.previousElementSibling.querySelector('.status.failed')) {
                row.style.display = 'table-row';
            }
        });
    </script>
</body>
</html>`;

        // 使用 Buffer 确保 UTF-8 编码正确（含 emoji）
        fs.writeFileSync(reportPath, Buffer.from(html, 'utf8'));
        console.log(`📄 HTML 报告已生成：${reportPath}`);
        
        // 尝试自动打开
        try {
            const { exec } = require('child_process');
            if (process.platform === 'win32') {
                exec(`start "" "${reportPath}"`);
            } else if (process.platform === 'darwin') {
                exec(`open "${reportPath}"`);
            }
            console.log('🌐 已自动打开 HTML 报告');
        } catch (e) {
            // 忽略打开失败
        }

        return reportPath;
    }

    /**
     * 计算测试耗时
     */
    calculateDuration(start, end) {
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const diff = endDate - startDate;
            
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            if (minutes > 0) {
                return `${minutes}分${seconds}秒`;
            }
            return `${seconds}秒`;
        } catch (e) {
            return '-';
        }
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return isoString;
        }
    }

    /**
     * 收集 Agent 统计
     */
    collectAgentStats(results) {
        const stats = {};
        
        for (const page of results.pages) {
            if (!page.matchedAgents) continue;
            
            for (const agentId of page.matchedAgents) {
                if (!stats[agentId]) {
                    stats[agentId] = { pages: 0, tests: 0 };
                }
                stats[agentId].pages++;
                stats[agentId].tests += (page.testsTotal || 0) / (page.matchedAgents.length || 1);
            }
        }
        
        // 四舍五入测试数
        for (const id in stats) {
            stats[id].tests = Math.round(stats[id].tests);
        }
        
        return stats;
    }

    /**
     * 计算总测试用例数
     */
    calculateTotalTests(results) {
        return results.pages.reduce((sum, p) => sum + (p.testsTotal || 0), 0);
    }

    /**
     * 渲染优先级统计
     * 从 LLM 分析和失败的测试用例中统计问题
     */
    renderPriorityStats(stats, pages = []) {
        let critical = stats?.critical || 0;
        let medium = stats?.medium || 0;
        let low = stats?.low || 0;
        
        // 统计失败的测试用例（没有 LLM 分析时）
        if (pages && pages.length > 0) {
            let failedTests = 0;
            for (const page of pages) {
                if (page.tests) {
                    const failed = page.tests.filter(t => !t.passed).length;
                    failedTests += failed;
                }
            }
            // 将失败的测试视为"中等"优先级问题
            if (failedTests > 0 && critical === 0 && medium === 0 && low === 0) {
                medium = failedTests;
            }
        }
        
        return `
            <div class="priority-grid">
                <div class="priority-card critical">
                    <div class="label">🔴 严重 (P8-10)</div>
                    <div class="value">${critical}</div>
                </div>
                <div class="priority-card medium">
                    <div class="label">🟡 中等 (P4-7)</div>
                    <div class="value">${medium}</div>
                </div>
                <div class="priority-card low">
                    <div class="label">🟢 轻微 (P1-3)</div>
                    <div class="value">${low}</div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染"发现的问题"区域
     * 包括 LLM 分析的问题和失败的测试用例
     */
    renderIssuesSection(results) {
        const hasLLMIssues = results.issues && results.issues.length > 0;
        
        const failedTests = [];
        for (const page of results.pages || []) {
            if (page.tests) {
                for (const test of page.tests) {
                    if (!test.passed) {
                        failedTests.push({ page: page.url, test: test });
                    }
                }
            }
        }
        
        const hasFailedTests = failedTests.length > 0;
        if (!hasLLMIssues && !hasFailedTests) return '';
        
        // 合并所有问题为卡片数组
        const allIssueCards = [];
        
        // LLM 分析的问题
        if (hasLLMIssues) {
            for (const issue of results.issues) {
                allIssueCards.push({
                    type: 'llm',
                    bug_title: issue.bug_title || '未命名问题',
                    bug_type: issue.bug_type || [],
                    bug_priority: issue.bug_priority || 5,
                    bug_confidence: issue.bug_confidence || 7,
                    bug_reasoning_why_a_bug: issue.bug_reasoning_why_a_bug || '需要进一步分析',
                    suggested_fix: issue.suggested_fix || '需要进一步分析',
                    reproduction_steps: issue.reproduction_steps || null,
                    ai_prompt: issue.ai_prompt || issue.suggested_fix || '需要进一步分析'
                });
            }
        }
        
        // 失败的测试用例转为卡片
        if (hasFailedTests) {
            for (const item of failedTests) {
                allIssueCards.push({
                    type: 'test',
                    bug_title: `测试未通过 - ${item.test.name}`,
                    bug_type: ['Functional', item.test.check || '测试失败'],
                    bug_priority: item.test.critical ? 8 : 5,
                    bug_confidence: 10,
                    bug_reasoning_why_a_bug: `测试用例"${item.test.name}"未通过。检查项：${item.test.check || '-'}，实际结果：${item.test.actual || '-'}`,
                    suggested_fix: `请检查"${item.test.name}"相关功能，确保${item.test.check || '测试条件'}满足要求`,
                    reproduction_steps: `1. 访问 ${item.page}\n2. 执行测试：${item.test.name}\n3. 检查：${item.test.check || '-'}`,
                    ai_prompt: `修复测试失败：${item.test.name} - ${item.test.check}。实际结果：${item.test.actual}。请检查相关代码逻辑。`
                });
            }
        }
        
        return `
            <div class="section">
                <h2>⚠️ 发现的问题 (${allIssueCards.length}个)</h2>
                <div style="margin-bottom: 24px;">
                    ${allIssueCards.map((issue, i) => {
                        const priorityColor = issue.bug_priority >= 8 ? 'var(--error)' : issue.bug_priority >= 4 ? 'var(--warning)' : 'var(--success)';
                        const priorityLabel = 'P' + issue.bug_priority;
                        return `
                        <div class="issue-card" style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                                <h3 style="font-size: 16px; margin: 0;">${this.escapeHtml(issue.bug_title)}</h3>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    <span style="background: ${priorityColor}20; color: ${priorityColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${priorityLabel}</span>
                                    <span style="background: var(--accent)20; color: var(--accent); padding: 4px 12px; border-radius: 20px; font-size: 12px;">C${issue.bug_confidence}</span>
                                    <span style="background: rgba(139,92,246,0.2); color: #8b5cf6; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${(issue.bug_type || []).join(' / ')}</span>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">为什么是问题</h4>
                                <p style="color: var(--text); line-height: 1.6;">${this.escapeHtml(issue.bug_reasoning_why_a_bug)}</p>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">修复建议</h4>
                                <p style="color: var(--text); line-height: 1.6;"><strong style="color: var(--success);">✓</strong> ${this.escapeHtml(issue.suggested_fix)}</p>
                            </div>
                            
                            ${issue.reproduction_steps ? `
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">复现步骤</h4>
                                <div style="background: var(--bg); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${this.escapeHtml(issue.reproduction_steps)}</div>
                            </div>
                            ` : ''}
                            
                            <div>
                                <h4 style="color: var(--muted); font-size: 13px; margin-bottom: 8px;">给开发/AI 的修复提示词</h4>
                                <div style="background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: var(--accent);">
                                    ${this.escapeHtml(issue.ai_prompt)}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

module.exports = HTMLReporter;
