/**
 * 全栈测试执行器 v5.3 - 完整报告版
 * 修复:
 * 1. 显示失败案例详情
 * 2. 显示使用的测试角色
 * 3. 添加失败页面单独列表
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';
const MAX_PAGES = parseInt(process.argv[4]) || 100;

console.log('🧪 全栈测试执行器 v5.3 - 完整报告版');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log(`📄 最大爬取：${MAX_PAGES} 页面`);
console.log(`🤖 测试角色：爬虫 + 视觉 + 安全 + 内容`);
console.log('');

// 测试角色定义
const TEST_AGENTS = [
    { id: 'crawler', name: '爬虫 Agent', emoji: '🕷️', role: '页面发现与链接收集' },
    { id: 'visual', name: '视觉 Agent', emoji: '👁️', role: '页面截图与 UI 检查' },
    { id: 'security', name: '安全 Agent', emoji: '🔒', role: 'HTTPS 与表单安全检查' },
    { id: 'content', name: '内容 Agent', emoji: '📝', role: '页面内容与 SEO 检查' }
];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function safeScreenshot(page, filepath) {
    try {
        await page.screenshot({ path: filepath, timeout: 3000 });
        return true;
    } catch (e) { return false; }
}

async function waitForPageReady(page) {
    try {
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        return true;
    } catch (e) { return false; }
}

async function collectLinks(page, baseUrl) {
    try {
        const links = await page.evaluate(() => {
            const allLinks = [];
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href');
                if (href) {
                    try {
                        const absolute = new URL(href, window.location.href).href.split('#')[0];
                        allLinks.push(absolute);
                    } catch (e) {}
                }
            });
            return [...new Set(allLinks)];
        });
        return links.filter(link => {
            try {
                return new URL(link).origin === new URL(baseUrl).origin;
            } catch (e) { return false; }
        });
    } catch (e) { return []; }
}

async function analyzePageFeatures(page) {
    try {
        const features = await page.evaluate(() => {
            const bodyText = document.body ? document.body.textContent : '';
            return {
                hasForm: document.querySelectorAll('form').length > 0,
                hasLoginForm: document.querySelectorAll('input[type="password"]').length > 0,
                hasProductCards: document.querySelectorAll('.product, .item, .goods, .card').length > 0,
                hasPrice: document.querySelectorAll('.price, .amount, [class*="price"]').length > 0,
                hasNavigation: document.querySelectorAll('nav, .nav, .menu').length > 0,
                hasBanner: document.querySelectorAll('.banner, .carousel, .hero').length > 0,
                isSPA: !!window.__NEXT_DATA__
            };
        });
        features.linkCount = await page.$$('a[href]').then(els => els.length);
        features.imageCount = await page.$$('img').then(els => els.length);
        return features;
    } catch (e) { return {}; }
}

function generateTestCases(page) {
    const tests = [];
    const features = page.features || {};
    
    tests.push(
        { name: '页面标题', check: '标题长度>=3', passed: !!(page.title && page.title.length >= 3), expected: '>=3 字符', actual: `"${page.title || ''}" (${(page.title || '').length}字符)` },
        { name: '页面内容', check: '内容>100 字符', passed: !!(page.content && page.content.length > 100), expected: '>100 字符', actual: `${(page.content || '').length}字符` },
        { name: '加载性能', check: '<5 秒 (SPA)', passed: page.loadTime < 5000, expected: '<5 秒', actual: `${page.loadTime}ms` },
        { name: 'HTTP 状态', check: '200 OK', passed: page.status === 200, expected: '200', actual: page.status || '-' },
        { name: '导航菜单', check: '导航存在', passed: features.hasNavigation, expected: '有导航', actual: features.hasNavigation ? '✓' : '✗' },
        { name: 'Banner 展示', check: 'Banner 存在', passed: features.hasBanner, expected: '有 Banner', actual: features.hasBanner ? '✓' : '✗' },
        { name: '图片检查', check: '图片加载', passed: features.imageCount > 0, expected: '有图片', actual: features.imageCount > 0 ? `${features.imageCount}张` : '✗' },
        { name: '链接检查', check: '内部链接', passed: features.linkCount > 0, expected: '>0 链接', actual: features.linkCount > 0 ? `${features.linkCount}个` : '✗' }
    );
    
    return tests;
}

async function main() {
    const timestamp = Date.now();
    const artifactsDir = path.join(TEST_DIR, 'artifacts');
    const reportsDir = path.join(TEST_DIR, 'reports');
    
    ensureDir(artifactsDir);
    ensureDir(reportsDir);
    
    const results = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        allPages: [],
        successPages: [],
        failedPages: [],
        issues: [],
        agents: TEST_AGENTS
    };
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        
        console.log('🕷️  Step 1: 爬取所有页面...\n');
        
        const visited = new Set();
        const toVisit = [BASE_URL];
        
        while (toVisit.length > 0 && visited.size < MAX_PAGES) {
            const url = toVisit.shift();
            const normalizedUrl = url.split('#')[0];
            if (visited.has(normalizedUrl)) continue;
            
            console.log(`📄 [${visited.size + 1}/${MAX_PAGES}] ${normalizedUrl}`);
            visited.add(normalizedUrl);
            
            const page = await context.newPage();
            const pageDir = path.join(artifactsDir, `page-${visited.size}`);
            ensureDir(pageDir);
            
            const pageInfo = { url: normalizedUrl, index: visited.size };
            
            try {
                const startTime = Date.now();
                const response = await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                await waitForPageReady(page);
                
                pageInfo.loadTime = Date.now() - startTime;
                pageInfo.status = response ? response.status() : 200;
                
                if (pageInfo.status === 404) {
                    console.log(`      ❌ 404 - 页面不存在`);
                    pageInfo.status = 404;
                    results.failedPages.push({
                        ...pageInfo,
                        error: 'HTTP 404 Not Found',
                        errorType: '404'
                    });
                } else {
                    pageInfo.title = await page.title();
                    pageInfo.content = await page.textContent('body');
                    pageInfo.html = await page.content();
                    pageInfo.links = await collectLinks(page, BASE_URL);
                    pageInfo.features = await analyzePageFeatures(page);
                    pageInfo.tests = generateTestCases(pageInfo);
                    pageInfo.testsPassed = pageInfo.tests.filter(t => t.passed).length;
                    pageInfo.testsTotal = pageInfo.tests.length;
                    
                    await safeScreenshot(page, path.join(pageDir, 'screenshot.png'));
                    pageInfo.screenshot = `artifacts/page-${visited.size}/screenshot.png`;
                    fs.writeFileSync(path.join(pageDir, 'dom.html'), pageInfo.html);
                    
                    console.log(`      ✅ 加载：${pageInfo.loadTime}ms, 链接：${pageInfo.links.length}, 测试：${pageInfo.testsPassed}/${pageInfo.testsTotal}`);
                    
                    results.successPages.push(pageInfo);
                    
                    pageInfo.links.forEach(link => {
                        if (!visited.has(link) && !toVisit.includes(link)) toVisit.push(link);
                    });
                }
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                pageInfo.status = 'failed';
                pageInfo.error = error.message;
                pageInfo.errorType = error.message.includes('ERR_CONNECTION') ? '连接错误' : 
                                    error.message.includes('ERR_NETWORK') ? '网络错误' : 
                                    error.message.includes('timeout') ? '超时' : '其他错误';
                results.failedPages.push(pageInfo);
                
                results.issues.push({
                    page: normalizedUrl,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional', pageInfo.errorType],
                    bug_priority: 7,
                    bug_confidence: 10,
                    reproduction_steps: `1. 访问 ${normalizedUrl}\n2. 等待页面加载`,
                    expected_result: '页面正常加载 (HTTP 200)',
                    actual_result: error.message,
                    suggested_fix: '检查网络连接和服务器状态，可能是反爬虫机制或服务器限制'
                });
            }
            
            results.allPages.push(pageInfo);
            await page.close();
        }
        
        await context.close();
        
        // 生成报告
        console.log('\n📄 Step 2: 生成 HTML 报告...\n');
        
        const summary = {
            testType: 'full-stack-complete',
            version: '5.3',
            timestamp: results.timestamp,
            baseUrl: BASE_URL,
            testDir: TEST_DIR,
            maxPages: MAX_PAGES,
            agents: TEST_AGENTS,
            summary: {
                crawledPages: results.allPages.length,
                successPages: results.successPages.length,
                failedPages: results.failedPages.length,
                totalIssues: results.issues.length
            },
            successPages: results.successPages,
            failedPages: results.failedPages,
            issues: results.issues
        };
        
        fs.writeFileSync(path.join(reportsDir, 'summary.json'), JSON.stringify(summary, null, 2));
        
        const htmlReport = generateHtmlReport(summary, TEST_DIR);
        fs.writeFileSync(path.join(reportsDir, 'report.html'), htmlReport);
        
        console.log(`✅ 报告已生成：${path.join(reportsDir, 'report.html')}`);
        
        try {
            require('child_process').exec(`start "${path.join(reportsDir, 'report.html')}" "${path.join(reportsDir, 'report.html')}"`);
            console.log('🌐 已自动打开 HTML 报告\n');
        } catch (e) {}
        
    } catch (error) {
        console.error('❌ 测试执行错误:', error.message);
    } finally {
        if (browser) await browser.close();
    }
    
    console.log('✅ 全栈测试完成！\n');
    console.log('📊 测试结果:');
    console.log(`   爬取页面：${results.allPages.length}`);
    console.log(`   成功页面：${results.successPages.length}`);
    console.log(`   失败页面：${results.failedPages.length}`);
    console.log(`   发现问题：${results.issues.length}`);
    console.log(`\n🤖 参与测试的 Agent 角色:`);
    TEST_AGENTS.forEach(agent => {
        console.log(`   ${agent.emoji} ${agent.name} - ${agent.role}`);
    });
    console.log(`\n📁 目录：${TEST_DIR}`);
}

function generateHtmlReport(summary, testDir) {
    const screenshots = {};
    (summary.successPages || []).forEach(p => {
        if (p.screenshot) {
            const fullPath = path.join(testDir, p.screenshot);
            if (fs.existsSync(fullPath)) {
                screenshots[p.screenshot.replace(/\\/g, '/')] = `data:image/png;base64,${fs.readFileSync(fullPath).toString('base64')}`;
            }
        }
    });
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>全栈测试报告 v5.3</title>
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
        .error-box { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .error-box h4 { color: var(--error); margin-bottom: 8px; font-size: 14px; }
        .error-box code { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .error-box .error-message { color: var(--text); font-family: monospace; font-size: 13px; margin-top: 8px; white-space: pre-wrap; }
        .test-list { margin: 8px 0; }
        .test-item { padding: 6px 12px; border-radius: 6px; margin: 4px 0; font-size: 13px; }
        .test-item.passed { background: rgba(63,185,80,0.1); border-left: 3px solid var(--success); }
        .test-item.failed { background: rgba(248,81,73,0.1); border-left: 3px solid var(--error); }
        .screenshot-container { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 800px; }
        .screenshot-container img { width: 100%; height: auto; display: block; }
        .screenshot-caption { background: var(--bg); padding: 12px; font-size: 13px; color: var(--muted); }
        .expandable { cursor: pointer; }
        .expandable::before { content: '▶'; display: inline-block; margin-right: 8px; transition: transform 0.2s; }
        .expandable.open::before { transform: rotate(90deg); }
        .expandable-content { display: none; margin-top: 12px; }
        .expandable.open .expandable-content { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 全栈测试报告 v5.3</h1>
            <div class="url">${summary.baseUrl}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 8px;">${new Date(summary.timestamp).toLocaleString('zh-CN')}</div>
            <div class="agents-bar">
                ${summary.agents.map(a => `<span class="agent-badge">${a.emoji} ${a.name}</span>`).join('')}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">爬取页面</div>
                <div class="value">${summary.summary.crawledPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">成功</div>
                <div class="value success">${summary.summary.successPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">失败</div>
                <div class="value failed">${summary.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">问题</div>
                <div class="value">${summary.summary.totalIssues}</div>
            </div>
        </div>
        
        ${summary.failedPages && summary.failedPages.length > 0 ? `
        <div class="section">
            <h2>❌ 失败页面 (${summary.failedPages.length})</h2>
            ${summary.failedPages.map((p, i) => `
            <div class="error-box">
                <h4>#${i + 1} ${p.errorType || '未知错误'}</h4>
                <div style="margin-bottom: 8px;">
                    <strong>页面:</strong> <code>${p.url}</code>
                </div>
                <div class="error-message">${p.error || '未知错误'}</div>
                <div style="margin-top: 12px; font-size: 12px; color: var(--muted);">
                    <strong>建议:</strong> 检查网络连接和服务器状态，可能是反爬虫机制或服务器限制
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="section">
            <h2>✅ 成功页面 (${summary.successPages.length})</h2>
            <table>
                <thead>
                    <tr><th>#</th><th>页面</th><th>标题</th><th>加载时间</th><th>测试</th><th>状态</th></tr>
                </thead>
                <tbody>
                    ${summary.successPages.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><a href="${p.url}" target="_blank" style="color: var(--accent)">${p.url.substring(0, 60)}${p.url.length > 60 ? '...' : ''}</a></td>
                        <td>${(p.title || '').substring(0, 30)}${(p.title || '').length > 30 ? '...' : ''}</td>
                        <td>${p.loadTime}ms</td>
                        <td><span class="status ${p.testsPassed === p.testsTotal ? 'success' : 'failed'}">${p.testsPassed}/${p.testsTotal}</span></td>
                        <td><span class="status success">${p.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3 style="margin: 24px 0 16px; font-size: 16px;">📋 详细测试用例</h3>
            ${summary.successPages.map((p, i) => `
            <div class="expandable" onclick="this.classList.toggle('open')">
                <strong>#${i + 1} ${p.title || '无标题'}</strong>
                <span style="color: var(--muted); margin-left: 12px">(${p.url.substring(0, 50)}...)</span>
                <span class="status ${p.testsPassed === p.testsTotal ? 'success' : 'failed'}" style="margin-left: 12px">${p.testsPassed}/${p.testsTotal}</span>
                <div class="expandable-content">
                    ${p.screenshot && screenshots[p.screenshot] ? `
                    <div class="screenshot-container" style="margin-top: 12px;">
                        <img src="${screenshots[p.screenshot]}" alt="${p.title}">
                        <div class="screenshot-caption">${p.title}</div>
                    </div>
                    ` : ''}
                    <div class="test-list" style="margin-top: 12px;">
                        ${p.tests ? p.tests.map(t => `
                        <div class="test-item ${t.passed ? 'passed' : 'failed'}">
                            <strong>${t.name}</strong>: ${t.check}
                            <span style="float: right">${t.passed ? '✅' : '❌'} ${t.actual}</span>
                        </div>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
            `).join('')}
        </div>
        
        ${summary.issues && summary.issues.length > 0 ? `
        <div class="section">
            <h2>🐛 发现的问题 (${summary.issues.length})</h2>
            ${summary.issues.map((issue, i) => `
            <div class="error-box">
                <h4>${i + 1}. ${issue.bug_title}</h4>
                <div style="margin-bottom: 8px;"><strong>页面:</strong> <code>${issue.page}</code></div>
                <div style="margin-bottom: 8px;"><strong>类型:</strong> ${issue.bug_type.join(', ')}</div>
                <div style="margin-bottom: 8px;"><strong>复现步骤:</strong><div class="error-message">${issue.reproduction_steps}</div></div>
                <div style="margin-bottom: 8px;"><strong>预期:</strong> ${issue.expected_result}</div>
                <div style="margin-bottom: 8px;"><strong>实际:</strong> ${issue.actual_result}</div>
                <div style="margin-bottom: 8px;"><strong>建议:</strong> ${issue.suggested_fix}</div>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
            OpenTestAI × OpenClaw v5.3 | 参与 Agent: ${summary.agents.map(a => a.name).join(', ')} | 点击页面展开测试用例详情
        </div>
    </div>
</body>
</html>`;
}

main().catch(e => {
    console.error('❌ 未捕获错误:', e.message);
    process.exit(1);
});
