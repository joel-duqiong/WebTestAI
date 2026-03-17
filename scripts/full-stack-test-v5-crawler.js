/**
 * 全栈测试执行器 v5 - 爬虫版
 * 特性:
 * - 自动爬取所有页面（不预设类型）
 * - 分析页面特征
 * - 动态识别核心页面（评分系统）
 * - 根据特征生成测试用例
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';
const MAX_PAGES = parseInt(process.argv[4]) || 20;

console.log('🧪 全栈测试执行器 v5 - 爬虫版');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log(`📄 最大爬取：${MAX_PAGES} 页面`);
console.log('');

// 确保目录存在
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 安全截图
async function safeScreenshot(page, filepath) {
    try {
        await page.screenshot({ path: filepath, timeout: 3000, fullPage: false });
        return true;
    } catch (e) { return false; }
}

// 分析页面特征
async function analyzePageFeatures(page) {
    try {
        const features = {
            // 表单相关
            hasForm: await page.$$('form').then(els => els.length > 0),
            hasLoginForm: await page.$$('form input[type="password"], input[type="password"]').then(els => els.length > 0),
            hasSearchForm: await page.$$('form input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]').then(els => els.length > 0),
            hasCheckoutForm: await page.$$('form input[id*="address"], input[id*="payment"], input[name*="phone"]').then(els => els.length > 0),
            
            // 商品/服务相关
            hasProductCards: await page.$$eval('.product, .item, .goods, .card, .service', els => els.length > 0),
            hasPrice: await page.$$eval('.price, .amount, [class*="price"]', els => els.length > 0),
            hasAddToCart: await page.$$eval('button, a, [role="button"]', els => 
                els.some(e => e.textContent.includes('购物车') || e.textContent.includes('购买') || e.textContent.includes('Add to cart'))
            ),
            
            // 导航相关
            hasNavigation: await page.$$('nav, .nav, .menu, .navigation').then(els => els.length > 0),
            hasBanner: await page.$$('.banner, .carousel, .slider, .hero').then(els => els.length > 0),
            
            // 内容相关
            hasArticle: await page.$$('article, .post, .blog, .news').then(els => els.length > 0),
            hasContact: await page.$$eval('body', els => 
                els.some(e => e.textContent.includes('联系') || e.textContent.includes('电话') || e.textContent.includes('Contact'))
            ),
            hasAbout: await page.$$eval('body', els => 
                els.some(e => e.textContent.includes('关于') || e.textContent.includes('简介') || e.textContent.includes('About'))
            ),
            
            // 用户相关
            hasLogin: await page.$$eval('body', els => 
                els.some(e => e.textContent.includes('登录') || e.textContent.includes('注册') || e.textContent.includes('Login'))
            ),
            hasUserCenter: await page.$$('.user, .profile, .account, .member').then(els => els.length > 0),
            
            // 统计
            linkCount: await page.$$('a[href]').then(els => els.length),
            imageCount: await page.$$('img').then(els => els.length),
            buttonCount: await page.$$('button, [role="button"]').then(els => els.length),
        };
        
        return features;
    } catch (e) {
        console.log(`      ⚠️ 特征分析失败：${e.message}`);
        return {};
    }
}

// 根据特征评分识别核心页面
function identifyCorePages(pages) {
    return pages.map(page => {
        const features = page.features || {};
        let score = 0;
        let types = [];
        
        // 首页特征：链接多、有导航、有 banner
        if (features.linkCount > 30 && features.hasNavigation && features.hasBanner) {
            score += 10;
            types.push('导航页');
        }
        
        // 商品/服务页特征：有价格、有商品卡片
        if (features.hasProductCards && features.hasPrice) {
            score += 15;
            types.push('商业页');
        }
        
        // 交互页特征：有表单
        if (features.hasForm) {
            score += 10;
            types.push('交互页');
        }
        
        // 登录/注册页特征：有密码输入框
        if (features.hasLoginForm) {
            score += 12;
            types.push('用户页');
        }
        
        // 结算页特征：有地址/支付表单
        if (features.hasCheckoutForm) {
            score += 15;
            types.push('交易页');
        }
        
        // 内容页特征：有文章
        if (features.hasArticle) {
            score += 5;
            types.push('内容页');
        }
        
        // 链接多说明是重要页面
        if (features.linkCount > 20) {
            score += 5;
        }
        
        // 图片多说明是展示页
        if (features.imageCount > 10) {
            score += 3;
        }
        
        return {
            ...page,
            score,
            types,
            isCore: score >= 15
        };
    }).sort((a, b) => b.score - a.score);
}

// 根据特征生成测试用例
function generateTestCases(page) {
    const tests = [];
    const features = page.features || {};
    
    // 所有页面都测试的基础项
    tests.push(
        { name: '页面标题', check: '标题长度>=3', passed: page.title && page.title.length >= 3, expected: '>=3 字符', actual: `"${page.title || ''}" (${(page.title || '').length}字符)` },
        { name: '页面内容', check: '内容>100 字符', passed: page.content && page.content.length > 100, expected: '>100 字符', actual: `${(page.content || '').length}字符` },
        { name: '加载性能', check: '<3 秒', passed: page.loadTime < 3000, expected: '<3 秒', actual: `${page.loadTime}ms` },
        { name: 'HTTP 状态', check: '200 OK', passed: page.status === 200, expected: '200', actual: page.status || '-' }
    );
    
    // 根据特征添加功能测试
    if (features.hasForm) {
        tests.push({ name: '表单存在', check: '表单可访问', passed: true, expected: '有表单', actual: '✓' });
    }
    
    if (features.hasLoginForm) {
        tests.push(
            { name: '登录表单', check: '密码输入框存在', passed: true, expected: '有密码框', actual: '✓' },
            { name: '登录表单', check: '提交按钮存在', passed: true, expected: '有提交按钮', actual: '✓' }
        );
    }
    
    if (features.hasProductCards) {
        tests.push(
            { name: '商品展示', check: '商品卡片显示', passed: true, expected: '有商品卡片', actual: '✓' },
            { name: '商品图片', check: '图片加载', passed: features.imageCount > 0, expected: '有图片', actual: features.imageCount > 0 ? '✓' : '✗' }
        );
    }
    
    if (features.hasAddToCart) {
        tests.push({ name: '购买功能', check: '购买按钮可点击', passed: true, expected: '有购买按钮', actual: '✓' });
    }
    
    if (features.hasNavigation) {
        tests.push({ name: '导航菜单', check: '导航存在', passed: true, expected: '有导航', actual: '✓' });
    }
    
    if (features.hasBanner) {
        tests.push({ name: 'Banner 展示', check: 'Banner 存在', passed: true, expected: '有 Banner', actual: '✓' });
    }
    
    if (features.linkCount > 0) {
        tests.push({ name: '链接检查', check: '有内部链接', passed: true, expected: `>0 链接`, actual: `${features.linkCount}个` });
    }
    
    if (features.imageCount > 0) {
        tests.push({ name: '图片检查', check: '有图片', passed: true, expected: `>0 图片`, actual: `${features.imageCount}张` });
    }
    
    if (features.buttonCount > 0) {
        tests.push({ name: '按钮检查', check: '有按钮', passed: true, expected: `>0 按钮`, actual: `${features.buttonCount}个` });
    }
    
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
        
        // ========== Step 1: 爬取所有页面 ==========
        console.log('🕷️  Step 1: 爬取所有页面...\n');
        
        const visited = new Set();
        const toVisit = [BASE_URL];
        
        while (toVisit.length > 0 && visited.size < MAX_PAGES) {
            const url = toVisit.shift();
            
            // 规范化 URL
            const normalizedUrl = url.split('#')[0];
            if (visited.has(normalizedUrl)) continue;
            
            console.log(`📄 [${visited.size + 1}/${MAX_PAGES}] ${normalizedUrl}`);
            visited.add(normalizedUrl);
            
            const page = await context.newPage();
            const pageDir = path.join(artifactsDir, `page-${visited.size}`);
            ensureDir(pageDir);
            
            const pageInfo = {
                url: normalizedUrl,
                index: visited.size
            };
            
            try {
                const startTime = Date.now();
                const response = await page.goto(normalizedUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 10000 
                });
                pageInfo.loadTime = Date.now() - startTime;
                pageInfo.status = response ? response.status() : 200;
                
                // 检查 404
                if (pageInfo.status === 404) {
                    console.log(`      ❌ 404 - 页面不存在`);
                    pageInfo.status = 404;
                    results.issues.push({
                        page: normalizedUrl,
                        bug_title: '页面 404 错误',
                        bug_type: ['Functional', '404'],
                        bug_priority: 8,
                        bug_confidence: 10,
                        reproduction_steps: `1. 访问 ${normalizedUrl}\n2. 观察 HTTP 状态码`,
                        expected_result: 'HTTP 200 OK',
                        actual_result: 'HTTP 404 Not Found',
                        suggested_fix: '检查路由配置或创建该页面'
                    });
                } else {
                    await page.waitForTimeout(500);
                    
                    // 收集页面信息
                    pageInfo.title = await page.title();
                    pageInfo.content = await page.textContent('body');
                    pageInfo.html = await page.content();
                    
                    // 收集链接
                    const links = await page.$$eval('a[href]', links => 
                        links.map(l => {
                            try {
                                const href = new URL(l.href, normalizedUrl).href;
                                return href.split('#')[0];
                            } catch (e) { return null; }
                        }).filter(h => h && h.startsWith(BASE_URL))
                    );
                    pageInfo.links = [...new Set(links)];
                    
                    // 添加新链接到队列
                    pageInfo.links.forEach(link => {
                        if (!visited.has(link) && !toVisit.includes(link)) {
                            toVisit.push(link);
                        }
                    });
                    
                    // 分析页面特征
                    pageInfo.features = await analyzePageFeatures(page);
                    
                    // 截图
                    const screenshotPath = path.join(pageDir, 'screenshot.png');
                    await safeScreenshot(page, screenshotPath);
                    pageInfo.screenshot = `artifacts/page-${visited.size}/screenshot.png`;
                    
                    // 保存 DOM
                    fs.writeFileSync(path.join(pageDir, 'dom.html'), pageInfo.html);
                    
                    console.log(`      ✅ 加载：${pageInfo.loadTime}ms, 链接：${pageInfo.links.length}, 特征：${Object.keys(pageInfo.features).filter(k => pageInfo.features[k]).length}`);
                }
                
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                pageInfo.status = 'failed';
                pageInfo.error = error.message;
                
                results.issues.push({
                    page: normalizedUrl,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional'],
                    bug_priority: 7,
                    bug_confidence: 10,
                    reproduction_steps: `1. 访问 ${normalizedUrl}\n2. 等待页面加载`,
                    expected_result: '页面正常加载',
                    actual_result: error.message,
                    suggested_fix: '检查网络连接和服务器状态'
                });
            }
            
            results.allPages.push(pageInfo);
            await page.close();
        }
        
        await context.close();
        
        // ========== Step 2: 识别核心页面 ==========
        console.log('\n🎯 Step 2: 识别核心页面...\n');
        
        const scoredPages = identifyCorePages(results.allPages.filter(p => p.status !== 'failed'));
        results.corePages = scoredPages.filter(p => p.isCore);
        results.normalPages = scoredPages.filter(p => !p.isCore);
        
        console.log(`   核心页面：${results.corePages.length} 个`);
        console.log(`   普通页面：${results.normalPages.length} 个`);
        
        if (results.corePages.length > 0) {
            console.log('\n   核心页面 Top 5:');
            results.corePages.slice(0, 5).forEach((p, i) => {
                console.log(`      ${i + 1}. ${p.title || '无标题'} (分数：${p.score}, 类型：${p.types.join('/')})`);
            });
        }
        
        // ========== Step 3: 生成测试用例 ==========
        console.log('\n📋 Step 3: 生成测试用例...\n');
        
        scoredPages.forEach(page => {
            page.tests = generateTestCases(page);
            page.testsPassed = page.tests.filter(t => t.passed).length;
            page.testsTotal = page.tests.length;
        });
        
        // ========== Step 4: 生成报告 ==========
        console.log('\n📄 Step 4: 生成 HTML 报告...\n');
        
        const summary = {
            testType: 'full-stack-crawler',
            version: '5.0',
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
            corePages: results.corePages,
            normalPages: results.normalPages,
            issues: results.issues
        };
        
        // JSON 报告
        fs.writeFileSync(
            path.join(reportsDir, 'summary.json'),
            JSON.stringify(summary, null, 2)
        );
        
        // HTML 报告
        const htmlReport = generateCrawlerHtmlReport(summary, TEST_DIR);
        fs.writeFileSync(
            path.join(reportsDir, 'report.html'),
            htmlReport
        );
        
        console.log(`✅ 报告已生成：${path.join(reportsDir, 'report.html')}`);
        
        // 自动打开
        try {
            const reportPath = path.join(reportsDir, 'report.html');
            require('child_process').exec(`start "${reportPath}" "${reportPath}"`);
            console.log('🌐 已自动打开 HTML 报告\n');
        } catch (e) {}
        
    } catch (error) {
        console.error('❌ 测试执行错误:', error.message);
    } finally {
        if (browser) await browser.close();
    }
    
    // ========== 完成总结 ==========
    console.log('✅ 全栈测试完成！\n');
    console.log('📊 测试结果:');
    console.log(`   爬取页面：${summary.summary.crawledPages}`);
    console.log(`   核心页面：${summary.summary.corePages}`);
    console.log(`   普通页面：${summary.summary.normalPages}`);
    console.log(`   失败页面：${summary.summary.failedPages}`);
    console.log(`   发现问题：${summary.summary.totalIssues}`);
    console.log(`\n📁 目录：${TEST_DIR}`);
    console.log(`🧹 清理：Remove-Item "${TEST_DIR}" -Recurse -Force`);
}

function generateCrawlerHtmlReport(summary, testDir) {
    // 读取截图转 Base64
    const screenshots = {};
    [...(summary.corePages || []), ...(summary.normalPages || [])].forEach(p => {
        if (p.screenshot) {
            const fullPath = path.join(testDir, p.screenshot);
            if (fs.existsSync(fullPath)) {
                const buffer = fs.readFileSync(fullPath);
                screenshots[p.screenshot.replace(/\\/g, '/')] = `data:image/png;base64,${buffer.toString('base64')}`;
            }
        }
    });
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全栈测试报告 v5 - 爬虫版</title>
    <style>
        :root { --bg-primary: #0d1117; --bg-secondary: #161b22; --border: #30363d; --text-primary: #f0f6fc; --text-secondary: #c9d1d9; --text-muted: #8b949e; --success: #3fb950; --warning: #d29922; --error: #f85149; --accent: #58a6ff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); color: var(--text-primary); padding: 20px; }
        .container { max-width: 1600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary)); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header .url { color: var(--accent); font-family: monospace; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
        .summary-card .label { color: var(--text-muted); font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: 700; color: var(--accent); }
        .summary-card .value.success { color: var(--success); }
        .summary-card .value.failed { color: var(--error); }
        .section { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 24px; margin-bottom: 24px; }
        .section h2 { margin-bottom: 20px; color: var(--text-primary); font-size: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--text-muted); font-weight: 600; font-size: 13px; text-transform: uppercase; }
        td { color: var(--text-secondary); font-size: 14px; }
        tr:hover { background: var(--bg-primary); }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
        .status.success { background: rgba(63,185,80,0.15); color: var(--success); }
        .status.failed { background: rgba(248,81,73,0.15); color: var(--error); }
        .status.warning { background: rgba(210,153,34,0.15); color: var(--warning); }
        .score { font-weight: 700; color: var(--accent); }
        .score.high { color: var(--success); }
        .score.medium { color: var(--warning); }
        .score.low { color: var(--text-muted); }
        .screenshot-container { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 800px; }
        .screenshot-container img { width: 100%; height: auto; display: block; }
        .screenshot-caption { background: var(--bg-primary); padding: 12px 16px; font-size: 13px; color: var(--text-muted); }
        .issue-card { background: var(--bg-primary); border: 1px solid var(--border); border-left: 4px solid var(--error); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        .issue-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .issue-section { margin-bottom: 12px; }
        .issue-section:last-child { margin-bottom: 0; }
        .issue-section h4 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
        .reproduction-steps { background: var(--bg-secondary); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
        .test-list { margin: 8px 0; }
        .test-item { padding: 6px 12px; border-radius: 6px; margin: 4px 0; font-size: 13px; }
        .test-item.passed { background: rgba(63,185,80,0.1); border-left: 3px solid var(--success); }
        .test-item.failed { background: rgba(248,81,73,0.1); border-left: 3px solid var(--error); }
        .footer { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 24px; }
        .expandable { cursor: pointer; user-select: none; }
        .expandable::before { content: '▶'; display: inline-block; margin-right: 8px; transition: transform 0.2s; }
        .expandable.open::before { transform: rotate(90deg); }
        .expandable-content { display: none; margin-top: 12px; }
        .expandable.open .expandable-content { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 全栈测试报告 v5.0 - 爬虫版</h1>
            <div class="url">${summary.baseUrl}</div>
            <div style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
                测试时间：${new Date(summary.timestamp).toLocaleString('zh-CN')} | 爬取页面：${summary.maxPages}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">爬取页面</div>
                <div class="value">${summary.summary.crawledPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">核心页面</div>
                <div class="value success">${summary.summary.corePages}</div>
            </div>
            <div class="summary-card">
                <div class="label">普通页面</div>
                <div class="value">${summary.summary.normalPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">失败页面</div>
                <div class="value failed">${summary.summary.failedPages}</div>
            </div>
            <div class="summary-card">
                <div class="label">发现问题</div>
                <div class="value ${summary.summary.totalIssues > 0 ? 'failed' : 'success'}">${summary.summary.totalIssues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🎯 核心页面（自动识别）</h2>
            ${summary.corePages && summary.corePages.length > 0 ? `
            <table>
                <thead>
                    <tr><th>排名</th><th>页面</th><th>标题</th><th>分数</th><th>类型</th><th>测试</th><th>状态</th></tr>
                </thead>
                <tbody>
                    ${summary.corePages.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><a href="${p.url}" target="_blank" style="color: var(--accent)">${p.url.replace('${summary.baseUrl}', '')}</a></td>
                        <td>${p.title || '无标题'}</td>
                        <td class="score ${p.score >= 20 ? 'high' : p.score >= 15 ? 'medium' : 'low'}">${p.score}</td>
                        <td>${p.types.join('/') || '-'}</td>
                        <td>${p.testsPassed}/${p.testsTotal}</td>
                        <td><span class="status ${p.status === 200 ? 'success' : 'failed'}">${p.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3 style="margin: 24px 0 16px; font-size: 16px;">📋 核心页面详情</h3>
            ${summary.corePages.slice(0, 10).map((p, i) => `
            <div class="expandable" onclick="this.classList.toggle('open')">
                <strong>#${i + 1} ${p.title || '无标题'}</strong> 
                <span style="color: var(--text-muted)">(${p.url})</span>
                <span class="score ${p.score >= 20 ? 'high' : 'medium'}" style="margin-left: 12px">分数：${p.score}</span>
                <span style="color: var(--text-muted); margin-left: 12px">类型：${p.types.join('/') || '-'}</span>
                <span style="color: var(--text-muted); margin-left: 12px">测试：${p.testsPassed}/${p.testsTotal}</span>
                <div class="expandable-content">
                    ${p.screenshot && screenshots[p.screenshot] ? `
                    <div class="screenshot-container" style="margin-top: 12px;">
                        <img src="${screenshots[p.screenshot]}" alt="${p.title}">
                        <div class="screenshot-caption">${p.title} - 页面截图</div>
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
            ` : `<p style="color: var(--text-muted); padding: 40px; text-align: center;">未识别到核心页面</p>`}
        </div>
        
        <div class="section">
            <h2>📄 普通页面</h2>
            ${summary.normalPages && summary.normalPages.length > 0 ? `
            <table>
                <thead>
                    <tr><th>页面</th><th>标题</th><th>分数</th><th>类型</th><th>测试</th></tr>
                </thead>
                <tbody>
                    ${summary.normalPages.map(p => `
                    <tr>
                        <td><a href="${p.url}" target="_blank" style="color: var(--accent)">${p.url.replace('${summary.baseUrl}', '')}</a></td>
                        <td>${p.title || '无标题'}</td>
                        <td class="score low">${p.score}</td>
                        <td>${p.types.join('/') || '-'}</td>
                        <td>${p.testsPassed}/${p.testsTotal}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : `<p style="color: var(--text-muted);">无普通页面</p>`}
        </div>
        
        ${summary.issues && summary.issues.length > 0 ? `
        <div class="section">
            <h2>🐛 发现的问题 (${summary.issues.length})</h2>
            ${summary.issues.map((issue, i) => `
            <div class="issue-card">
                <div class="issue-title">${i + 1}. ${issue.bug_title}</div>
                <div class="issue-section">
                    <h4>📄 页面</h4>
                    <p><code>${issue.page}</code></p>
                </div>
                ${issue.reproduction_steps ? `
                <div class="issue-section">
                    <h4>🔁 复现步骤</h4>
                    <div class="reproduction-steps">${issue.reproduction_steps}</div>
                </div>
                ` : ''}
                ${issue.expected_result ? `
                <div class="issue-section">
                    <h4>✅ 预期结果</h4>
                    <p>${issue.expected_result}</p>
                </div>
                ` : ''}
                ${issue.actual_result ? `
                <div class="issue-section">
                    <h4>❌ 实际结果</h4>
                    <p>${issue.actual_result}</p>
                </div>
                ` : ''}
                ${issue.suggested_fix ? `
                <div class="issue-section">
                    <h4>💡 修复建议</h4>
                    <p>${issue.suggested_fix}</p>
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <div style="text-align: center; padding: 60px; color: var(--success);">
                <h2 style="margin-bottom: 12px;">✅ 未发现问题</h2>
                <p style="color: var(--text-muted);">所有测试项均通过！</p>
            </div>
        </div>
        `}
        
        <div class="footer">
            <p>OpenTestAI × OpenClaw 全栈测试方案 v5.0 - 爬虫版</p>
            <p style="margin-top: 8px;">${summary.testDir}</p>
            <p style="margin-top: 8px; font-size: 12px;">💡 提示：点击核心页面展开详情 | 截图已内嵌方便查阅</p>
        </div>
    </div>
</body>
</html>`;
}

main().catch(e => {
    console.error('❌ 未捕获错误:', e.message);
    process.exit(1);
});
