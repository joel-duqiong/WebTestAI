/**
 * Hybrid Test - OpenClaw 技能入口
 * 混合测试架构：Playwright + OpenTestAI 提示词
 */

const PageCrawler = require('../core/crawler');
const PageAnalyzer = require('../core/analyzer');
const fs = require('fs');
const path = require('path');

/**
 * 执行混合测试 v2.0
 */
async function execute(options = {}) {
    const {
        url,
        maxPages = 30,
        agents = ['mia', 'sophia', 'tariq', 'leila', 'viktor', 'zanele'],
        timeout = 15000,
        viewport = { width: 1280, height: 800 },
        useLLM = false, // 是否使用真实 LLM API
        llmProvider = 'openai', // openai, anthropic, bailian
        llmApiKey = process.env.LLM_API_KEY,
        exportPDF = true // 是否导出 PDF
    } = options;

    if (!url) {
        throw new Error('缺少必需参数：url');
    }

    console.log('🧪 启动混合测试 v2.0...');
    console.log(`📄 起始 URL: ${url}`);
    console.log(`📊 最大页面：${maxPages}`);
    console.log(`🤖 分析 Agent: ${agents.join(', ') || '无 (仅爬取)'}`);
    if (useLLM) {
        console.log(`🤖 LLM 提供商：${llmProvider}`);
    }
    console.log('');

    const crawler = new PageCrawler({ baseUrl: url, maxPages, timeout, viewport });
    const analyzer = new PageAnalyzer({ agents });

    try {
        // 启动浏览器
        console.log('🕷️  Step 1: 启动浏览器...');
        await crawler.launch();

        // 智能爬取
        console.log('🕷️  Step 2: 爬取页面...\n');
        const pages = await crawler.crawlSmart(url, (progress) => {
            console.log(`📄 [${progress.current}/${progress.total}] ${progress.url}`);
            if (progress.result.status === 200) {
                console.log(`      ✅ 加载：${progress.result.loadTime}ms, 链接：${progress.result.links.length}`);
            } else {
                console.log(`      ❌ 失败：${progress.result.error || progress.result.status}`);
            }
        });

        // 智能分析
        const analyzedPages = [];
        const allLLMIssues = [];
        
        if (agents && agents.length > 0) {
            console.log('\n🤖 Step 3: 智能分析...\n');
            
            // 如果使用真实 LLM
            if (useLLM && llmApiKey) {
                const llm = new LLMIntegration({
                    provider: llmProvider,
                    apiKey: llmApiKey
                });
                
                for (const page of pages) {
                    if (page.status === 200) {
                        console.log(`📄 分析：${page.url}`);
                        const tests = analyzer.generateTestCases(page);
                        
                        // 调用 LLM 分析
                        const llmResults = await llm.analyzeMultipleAgents(
                            page,
                            agents,
                            analyzer.prompts
                        );
                        allLLMIssues.push(...llmResults);
                        
                        analyzedPages.push({
                            ...page,
                            tests,
                            llmAnalysis: llmResults,
                            testsPassed: tests.filter(t => t.passed).length,
                            testsTotal: tests.length
                        });
                        console.log(`      测试：${tests.filter(t => t.passed).length}/${tests.length}, LLM 问题：${llmResults.length}`);
                    } else {
                        analyzedPages.push(page);
                    }
                }
            } else {
                // 使用提示词（不调用 LLM）
                for (const page of pages) {
                    if (page.status === 200) {
                        console.log(`📄 分析：${page.url}`);
                        const tests = analyzer.generateTestCases(page);
                        analyzedPages.push({
                            ...page,
                            tests,
                            testsPassed: tests.filter(t => t.passed).length,
                            testsTotal: tests.length
                        });
                        console.log(`      测试：${tests.filter(t => t.passed).length}/${tests.length}`);
                    } else {
                        analyzedPages.push(page);
                    }
                }
            }
        } else {
            analyzedPages.push(...pages);
        }
        
        // 去重和聚合
        console.log('\n🔧 Step 4: 结果去重和聚合...\n');
        const deduplicator = new ResultDeduplicator();
        const dedupedIssues = useLLM ? deduplicator.deduplicate(allLLMIssues) : [];
        const issueStats = deduplicator.generateStats(dedupedIssues);
        
        console.log(`   总问题数：${issueStats.total}`);
        console.log(`   严重 (P8-10): ${issueStats.byPriority.critical}`);
        console.log(`   中等 (P4-7): ${issueStats.byPriority.medium}`);
        console.log(`   轻微 (P1-3): ${issueStats.byPriority.low}`);

        // 聚合结果
        const successPages = analyzedPages.filter(p => p.status === 200);
        const failedPages = analyzedPages.filter(p => p.status !== 200);

        // 收集问题（LLM 结果 + 加载失败问题）
        const allIssues = [...dedupedIssues];
        for (const page of analyzedPages) {
            if (page.error) {
                allIssues.push({
                    page: page.url,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional'],
                    bug_priority: 7,
                    bug_confidence: 10,
                    reproduction_steps: `1. 访问 ${page.url}\n2. 等待页面加载`,
                    expected_result: '页面正常加载',
                    actual_result: page.error,
                    suggested_fix: '检查网络连接和服务器状态'
                });
            }
        }

        const results = {
            timestamp: new Date().toISOString(),
            baseUrl: url,
            summary: {
                crawledPages: analyzedPages.length,
                successPages: successPages.length,
                failedPages: failedPages.length,
                totalIssues: allIssues.length,
                llmIssues: dedupedIssues.length
            },
            pages: analyzedPages,
            issues: allIssues,
            agents: agents,
            issueStats: issueStats
        };

        console.log('\n✅ 测试完成！\n');
        console.log('📊 测试结果:');
        console.log(`   爬取页面：${results.summary.crawledPages}`);
        console.log(`   成功页面：${results.summary.successPages}`);
        console.log(`   失败页面：${results.summary.failedPages}`);
        console.log(`   发现问题：${results.summary.totalIssues}`);

        return results;

    } finally {
        await crawler.close();
    }
}

/**
 * 生成 HTML 报告
 */
async function generateReport(results, outputDir) {
    if (!outputDir) {
        outputDir = path.join(__dirname, '../output');
    }

    const fs = require('fs');
    const reportPath = path.join(outputDir, `report-${Date.now()}.html`);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>混合测试报告</title>
    <style>
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #f0f6fc; --muted: #8b949e; --success: #3fb950; --error: #f85149; --accent: #58a6ff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 20px; }
        .container { max-width: 1600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, var(--card), var(--bg)); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .agents-bar { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .agent-badge { background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); border-radius: 20px; padding: 6px 12px; font-size: 13px; color: var(--accent); }
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 混合测试报告</h1>
            <div class="url">${results.baseUrl}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 8px;">${new Date(results.timestamp).toLocaleString('zh-CN')}</div>
            <div class="agents-bar">
                ${results.agents.map(a => `<span class="agent-badge">🤖 ${a}</span>`).join('')}
            </div>
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
                                ${p.screenshotBuffer ? `
                                <div class="screenshot-container">
                                    <img src="data:image/png;base64,${p.screenshotBuffer.toString('base64')}" alt="${p.title}">
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
        
        <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
            Hybrid Test Architecture v1.0 | Playwright + OpenTestAI
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
    console.log(`\n📄 HTML 报告已生成：${reportPath}`);
    
    // 自动打开 HTML
    try {
        require('child_process').exec(`start "${reportPath}" "${reportPath}"`);
        console.log('🌐 已自动打开 HTML 报告');
    } catch (e) {}
    
    // 导出 PDF
    if (exportPDF) {
        try {
            const pdfExporter = new PDFExporter();
            const pdfPath = reportPath.replace('.html', '.pdf');
            const pdfResult = await pdfExporter.generatePDF(results, pdfPath);
            if (pdfResult) {
                console.log(`📄 PDF 报告已生成：${pdfResult}`);
            }
        } catch (e) {
            console.log('⚠️  PDF 导出失败，请安装 pdfkit: npm install pdfkit');
        }
    }
    
    console.log('');

    return { htmlPath: reportPath, pdfPath: exportPDF ? reportPath.replace('.html', '.pdf') : null };
}

/**
 * 清理临时文件
 */
async function cleanup() {
    // 清理临时截图等文件
    console.log('🧹 清理临时文件...');
}

module.exports = {
    execute,
    generateReport,
    cleanup
};
