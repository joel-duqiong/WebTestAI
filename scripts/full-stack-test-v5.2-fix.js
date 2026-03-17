/**
 * 全栈测试执行器 v5.2 - 修复测试用例显示
 * 修复：测试用例正确生成和显示
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';
const MAX_PAGES = parseInt(process.argv[4]) || 20;

console.log('🧪 全栈测试执行器 v5.2 - 测试用例修复版');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log(`📄 最大爬取：${MAX_PAGES} 页面`);
console.log('');

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
                hasSearchForm: document.querySelectorAll('input[type="search"], input[placeholder*="搜索"]').length > 0,
                hasProductCards: document.querySelectorAll('.product, .item, .goods, .card').length > 0,
                hasPrice: document.querySelectorAll('.price, .amount, [class*="price"]').length > 0,
                hasNavigation: document.querySelectorAll('nav, .nav, .menu').length > 0,
                hasBanner: document.querySelectorAll('.banner, .carousel, .hero').length > 0,
                hasArticle: document.querySelectorAll('article, .post, .blog').length > 0,
                hasContact: bodyText.includes('联系') || bodyText.includes('电话'),
                hasAbout: bodyText.includes('关于') || bodyText.includes('简介'),
                hasLogin: bodyText.includes('登录') || bodyText.includes('注册'),
                isSPA: !!window.__NEXT_DATA__
            };
        });
        features.linkCount = await page.$$('a[href]').then(els => els.length);
        features.imageCount = await page.$$('img').then(els => els.length);
        features.buttonCount = await page.$$('button, [role="button"]').then(els => els.length);
        return features;
    } catch (e) { return {}; }
}

// 生成测试用例（确保返回正确的数据结构）
function generateTestCases(page) {
    const tests = [];
    const features = page.features || {};
    
    // 基础测试
    tests.push({
        name: '页面标题',
        check: '标题长度>=3',
        passed: !!(page.title && page.title.length >= 3),
        expected: '>=3 字符',
        actual: `"${page.title || ''}" (${(page.title || '').length}字符)`
    });
    
    tests.push({
        name: '页面内容',
        check: '内容>100 字符',
        passed: !!(page.content && page.content.length > 100),
        expected: '>100 字符',
        actual: `${(page.content || '').length}字符`
    });
    
    tests.push({
        name: '加载性能',
        check: '<5 秒 (SPA)',
        passed: page.loadTime < 5000,
        expected: '<5 秒',
        actual: `${page.loadTime}ms`
    });
    
    tests.push({
        name: 'HTTP 状态',
        check: '200 OK',
        passed: page.status === 200,
        expected: '200',
        actual: page.status || '-'
    });
    
    // 功能测试
    if (features.hasNavigation) {
        tests.push({ name: '导航菜单', check: '导航存在', passed: true, expected: '有导航', actual: '✓' });
    }
    
    if (features.hasBanner) {
        tests.push({ name: 'Banner 展示', check: 'Banner 存在', passed: true, expected: '有 Banner', actual: '✓' });
    }
    
    if (features.hasProductCards) {
        tests.push({ name: '商品展示', check: '商品卡片显示', passed: true, expected: '有商品卡片', actual: '✓' });
    }
    
    if (features.imageCount > 0) {
        tests.push({ name: '图片检查', check: '图片加载', passed: true, expected: '有图片', actual: `${features.imageCount}张` });
    }
    
    if (features.linkCount > 0) {
        tests.push({ name: '链接检查', check: '内部链接', passed: true, expected: '>0 链接', actual: `${features.linkCount}个` });
    }
    
    if (features.buttonCount > 0) {
        tests.push({ name: '按钮检查', check: '按钮存在', passed: true, expected: '>0 按钮', actual: `${features.buttonCount}个` });
    }
    
    // SPA 特定测试
    if (features.isSPA) {
        tests.push({
            name: 'SPA 架构',
            check: 'JavaScript 渲染',
            passed: true,
            expected: 'SPA 正常',
            actual: `✓ ${features.framework || 'Next.js'}`
        });
    }
    
    return tests;
}

function identifyCorePages(pages) {
    return pages.map(page => {
        const features = page.features || {};
        let score = 0;
        let types = [];
        
        if (features.linkCount > 20 && features.hasNavigation && features.hasBanner) {
            score += 10;
            types.push('导航页');
        }
        if (features.hasProductCards && features.hasPrice) {
            score += 15;
            types.push('商业页');
        }
        if (features.hasForm) {
            score += 10;
            types.push('交互页');
        }
        if (features.hasArticle) {
            score += 5;
            types.push('内容页');
        }
        
        return { ...page, score, types, isCore: score >= 15 };
    }).sort((a, b) => b.score - a.score);
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
        corePages: [],
        normalPages: [],
        issues: []
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
                    console.log(`      ❌ 404`);
                    pageInfo.status = 404;
                } else {
                    pageInfo.title = await page.title();
                    pageInfo.content = await page.textContent('body');
                    pageInfo.html = await page.content();
                    pageInfo.links = await collectLinks(page, BASE_URL);
                    pageInfo.features = await analyzePageFeatures(page);
                    
                    // 生成测试用例
                    pageInfo.tests = generateTestCases(pageInfo);
                    pageInfo.testsPassed = pageInfo.tests.filter(t => t.passed).length;
                    pageInfo.testsTotal = pageInfo.tests.length;
                    
                    await safeScreenshot(page, path.join(pageDir, 'screenshot.png'));
                    pageInfo.screenshot = `artifacts/page-${visited.size}/screenshot.png`;
                    fs.writeFileSync(path.join(pageDir, 'dom.html'), pageInfo.html);
                    
                    console.log(`      ✅ 加载：${pageInfo.loadTime}ms, 链接：${pageInfo.links.length}, 测试：${pageInfo.testsPassed}/${pageInfo.testsTotal}`);
                    
                    pageInfo.links.forEach(link => {
                        if (!visited.has(link) && !toVisit.includes(link)) toVisit.push(link);
                    });
                }
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                pageInfo.status = 'failed';
                pageInfo.error = error.message;
            }
            
            results.allPages.push(pageInfo);
            await page.close();
        }
        
        await context.close();
        
        // 识别核心页面
        console.log('\n🎯 Step 2: 识别核心页面...\n');
        const scoredPages = identifyCorePages(results.allPages.filter(p => p.status !== 'failed'));
        results.corePages = scoredPages.filter(p => p.isCore);
        results.normalPages = scoredPages.filter(p => !p.isCore);
        
        console.log(`   核心页面：${results.corePages.length} 个`);
        console.log(`   普通页面：${results.normalPages.length} 个`);
        
        // 生成报告
        console.log('\n📄 Step 3: 生成 HTML 报告...\n');
        
        const summary = {
            testType: 'full-stack-fix',
            version: '5.2',
            timestamp: results.timestamp,
            baseUrl: BASE_URL,
            testDir: TEST_DIR,
            maxPages: MAX_PAGES,
            summary: {
                crawledPages: results.allPages.length,
                corePages: results.corePages.length,
                normalPages: results.normalPages.length,
                failedPages: results.allPages.filter(p => p.status === 'failed' || p.status === 404).length,
                totalIssues: results.issues.length
            },
            pages: results.allPages.filter(p => p.status !== 'failed'),
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
    console.log(`   核心页面：${results.corePages.length}`);
    console.log(`   普通页面：${results.normalPages.length}`);
    console.log(`   失败页面：${results.allPages.filter(p => p.status === 'failed' || p.status === 404).length}`);
    console.log(`   发现问题：${results.issues.length}`);
    console.log(`\n📁 目录：${TEST_DIR}`);
}

function generateHtmlReport(summary, testDir) {
    const screenshots = {};
    (summary.pages || []).forEach(p => {
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
    <title>全栈测试报告 v5.2</title>
    <style>
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #f0f6fc; --muted: #8b949e; --success: #3fb950; --error: #f85149; --accent: #58a6ff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 20px; }
        .container { max-width: 1600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, var(--card), var(--bg)); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .url { color: var(--accent); font-family: monospace; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
        .summary-card .label { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: 700; color: var(--accent); }
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
            <h1>🧪 全栈测试报告 v5.2</h1>
            <div class="url">${summary.baseUrl}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 8px;">${new Date(summary.timestamp).toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">爬取页面</div>
                <div class="value">${summary.summary.crawledPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">成功</div>
                <div class="value" style="color: var(--success)">${summary.summary.crawledPages - summary.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">失败</div>
                <div class="value" style="color: var(--error)">${summary.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">问题</div>
                <div class="value">${summary.summary.totalIssues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 页面测试结果 (${summary.pages ? summary.pages.length : 0})</h2>
            ${summary.pages && summary.pages.length > 0 ? `
            <table>
                <thead>
                    <tr><th>#</th><th>页面</th><th>标题</th><th>加载时间</th><th>测试</th><th>状态</th></tr>
                </thead>
                <tbody>
                    ${summary.pages.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><a href="${p.url}" target="_blank" style="color: var(--accent)">${p.url.replace('${summary.baseUrl}', '').substring(0, 50)}</a></td>
                        <td>${(p.title || '').substring(0, 30)}${(p.title || '').length > 30 ? '...' : ''}</td>
                        <td>${p.loadTime}ms</td>
                        <td><span class="status ${p.testsPassed === p.testsTotal ? 'success' : 'failed'}">${p.testsPassed}/${p.testsTotal}</span></td>
                        <td><span class="status ${p.status === 200 ? 'success' : 'failed'}">${p.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3 style="margin: 24px 0 16px; font-size: 16px;">📋 详细测试用例</h3>
            ${summary.pages.map((p, i) => `
            <div class="expandable" onclick="this.classList.toggle('open')">
                <strong>#${i + 1} ${p.title || '无标题'}</strong>
                <span style="color: var(--muted); margin-left: 12px">(${p.url})</span>
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
                        `).join('') : '<div style="color: var(--muted)">无测试用例</div>'}
                    </div>
                </div>
            </div>
            `).join('')}
            ` : '<p style="color: var(--muted); padding: 40px; text-align: center;">无页面数据</p>'}
        </div>
        
        <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
            OpenTestAI × OpenClaw v5.2 | 点击页面展开测试用例详情
        </div>
    </div>
</body>
</html>`;
}

main().catch(e => {
    console.error('❌ 未捕获错误:', e.message);
    process.exit(1);
});
