/**
 * 全栈测试执行器 - 多页面 + 用户旅程 + 多设备
 * OpenTestAI × OpenClaw 测试提效方案
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';

console.log('🧪 全栈测试执行器');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log('');

// 定义要测试的页面路由
const PAGES_TO_TEST = [
    { path: '/', name: '首页', priority: 'P0' },
    { path: '/zh-cn/product', name: '产品列表页', priority: 'P0' },
    { path: '/zh-cn/product/*', name: '产品详情页', priority: 'P0', wildcard: true },
    { path: '/zh-cn/cart', name: '购物车', priority: 'P0' },
    { path: '/zh-cn/checkout', name: '结账页', priority: 'P0' },
    { path: '/zh-cn/login', name: '登录页', priority: 'P1' },
    { path: '/zh-cn/register', name: '注册页', priority: 'P1' },
    { path: '/zh-cn/user', name: '用户中心', priority: 'P1' },
    { path: '/zh-cn/about', name: '关于我们', priority: 'P2' },
    { path: '/zh-cn/contact', name: '联系我们', priority: 'P2' },
    { path: '/zh-cn/help', name: '帮助中心', priority: 'P2' },
];

// 定义用户旅程
const USER_JOURNEYS = [
    {
        name: '游客浏览旅程',
        steps: [
            { action: 'visit', path: '/', description: '访问首页' },
            { action: 'click', selector: 'nav a[href*="product"]', description: '点击产品导航' },
            { action: 'visit', path: '/zh-cn/product', description: '浏览产品列表' },
            { action: 'screenshot', name: 'product-list', description: '产品列表截图' },
        ]
    },
    {
        name: '用户登录旅程',
        steps: [
            { action: 'visit', path: '/zh-cn/login', description: '访问登录页' },
            { action: 'fill', selector: 'input[name="username"]', value: 'testuser', description: '输入用户名' },
            { action: 'fill', selector: 'input[name="password"]', value: 'Test123!', description: '输入密码' },
            { action: 'click', selector: 'button[type="submit"]', description: '点击登录' },
            { action: 'waitForNavigation', description: '等待导航' },
            { action: 'screenshot', name: 'after-login', description: '登录后截图' },
        ]
    },
    {
        name: '购物流程旅程',
        steps: [
            { action: 'visit', path: '/zh-cn/product', description: '访问产品页' },
            { action: 'click', selector: '.product-card:first-child', description: '选择第一个产品' },
            { action: 'click', selector: 'button.add-to-cart', description: '加入购物车' },
            { action: 'visit', path: '/zh-cn/cart', description: '访问购物车' },
            { action: 'screenshot', name: 'cart-page', description: '购物车截图' },
        ]
    }
];

// 定义测试的 viewport
const VIEWPORTS = [
    { name: '桌面', width: 1280, height: 800 },
    { name: '平板', width: 768, height: 1024 },
    { name: '手机', width: 375, height: 667 },
];

async function main() {
    const timestamp = Date.now();
    const artifactsDir = path.join(TEST_DIR, 'artifacts');
    const journeysDir = path.join(TEST_DIR, 'journeys');
    const reportsDir = path.join(TEST_DIR, 'reports');
    
    // 创建目录
    [artifactsDir, journeysDir, reportsDir].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        pagesTested: [],
        journeysTested: [],
        viewportsTested: [],
        issues: []
    };
    
    // ========== 1. 多页面测试 ==========
    console.log('📄 步骤 1: 多页面测试...');
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    
    for (const pageConfig of PAGES_TO_TEST.slice(0, 5)) { // 先测试前 5 个 P0/P1 页面
        console.log(`   测试：${pageConfig.name} (${pageConfig.path})`);
        
        try {
            const page = await context.newPage();
            const url = BASE_URL + pageConfig.path.replace('*', '1');
            
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            await page.waitForTimeout(2000);
            
            // 捕获工件
            const pageDir = path.join(artifactsDir, `page-${pageConfig.name.replace(/\//g, '-')}`);
            fs.mkdirSync(pageDir, { recursive: true });
            
            await page.screenshot({ path: path.join(pageDir, 'screenshot.png') });
            fs.writeFileSync(path.join(pageDir, 'dom.html'), await page.content());
            
            // 收集控制台日志
            const logs = [];
            page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
            fs.writeFileSync(path.join(pageDir, 'console.json'), JSON.stringify(logs, null, 2));
            
            // 检查基础问题
            const pageIssues = await analyzePage(page, pageConfig);
            results.pagesTested.push({
                name: pageConfig.name,
                path: pageConfig.path,
                priority: pageConfig.priority,
                url,
                status: 'success',
                issues: pageIssues.length
            });
            results.issues.push(...pageIssues);
            
            await page.close();
            console.log(`      ✅ 完成，发现${pageIssues.length}个问题`);
        } catch (error) {
            console.log(`      ❌ 失败：${error.message}`);
            results.pagesTested.push({
                name: pageConfig.name,
                path: pageConfig.path,
                priority: pageConfig.priority,
                status: 'failed',
                error: error.message
            });
        }
    }
    
    await context.close();
    
    // ========== 2. 用户旅程测试 ==========
    console.log('');
    console.log('🛤️ 步骤 2: 用户旅程测试...');
    
    for (const journey of USER_JOURNEYS) {
        console.log(`   测试旅程：${journey.name}`);
        const journeyDir = path.join(journeysDir, journey.name.replace(/\s+/g, '-'));
        fs.mkdirSync(journeyDir, { recursive: true });
        
        const journeyContext = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const journeyPage = await journeyContext.newPage();
        
        const journeyResults = {
            name: journey.name,
            steps: [],
            status: 'success'
        };
        
        for (const step of journey.steps) {
            try {
                console.log(`      执行：${step.description}`);
                
                switch (step.action) {
                    case 'visit':
                        await journeyPage.goto(BASE_URL + step.path, { 
                            waitUntil: 'networkidle',
                            timeout: 15000 
                        });
                        break;
                    
                    case 'click':
                        await journeyPage.click(step.selector, { timeout: 5000 });
                        break;
                    
                    case 'fill':
                        await journeyPage.fill(step.selector, step.value, { timeout: 5000 });
                        break;
                    
                    case 'waitForNavigation':
                        await journeyPage.waitForNavigation({ timeout: 10000 });
                        break;
                    
                    case 'screenshot':
                        await journeyPage.screenshot({ 
                            path: path.join(journeyDir, `${step.name}.png`) 
                        });
                        break;
                }
                
                journeyResults.steps.push({
                    ...step,
                    status: 'success'
                });
            } catch (error) {
                console.log(`         ❌ 失败：${error.message}`);
                journeyResults.steps.push({
                    ...step,
                    status: 'failed',
                    error: error.message
                });
                journeyResults.status = 'partial';
            }
        }
        
        await journeyContext.close();
        results.journeysTested.push(journeyResults);
        console.log(`      旅程完成：${journeyResults.status}`);
    }
    
    // ========== 3. 多 Viewport 测试 ==========
    console.log('');
    console.log('📱 步骤 3: 多 Viewport 测试...');
    
    for (const viewport of VIEWPORTS) {
        console.log(`   测试 Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        const vpContext = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height }
        });
        const vpPage = await vpContext.newPage();
        
        await vpPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await vpPage.waitForTimeout(2000);
        
        const vpDir = path.join(artifactsDir, `viewport-${viewport.name}`);
        fs.mkdirSync(vpDir, { recursive: true });
        
        await vpPage.screenshot({ path: path.join(vpDir, 'screenshot.png') });
        
        results.viewportsTested.push({
            name: viewport.name,
            width: viewport.width,
            height: viewport.height,
            status: 'success'
        });
        
        await vpContext.close();
        console.log(`      ✅ 完成`);
    }
    
    await browser.close();
    
    // ========== 4. 生成综合报告 ==========
    console.log('');
    console.log('📄 步骤 4: 生成综合报告...');
    
    const summary = {
        testType: 'full-stack',
        timestamp: results.timestamp,
        baseUrl: BASE_URL,
        summary: {
            pagesTested: results.pagesTested.length,
            pagesSuccess: results.pagesTested.filter(p => p.status === 'success').length,
            journeysTested: results.journeysTested.length,
            journeysSuccess: results.journeysTested.filter(j => j.status === 'success').length,
            viewportsTested: results.viewportsTested.length,
            totalIssues: results.issues.length
        },
        pages: results.pagesTested,
        journeys: results.journeysTested,
        viewports: results.viewportsTested,
        issues: results.issues
    };
    
    fs.writeFileSync(
        path.join(reportsDir, 'full-stack-summary.json'),
        JSON.stringify(summary, null, 2)
    );
    
    const htmlReport = generateFullStackHtmlReport(summary);
    fs.writeFileSync(
        path.join(reportsDir, 'full-stack-summary.html'),
        htmlReport
    );
    
    console.log('');
    console.log('✅ 全栈测试完成！');
    console.log('');
    console.log('📊 测试结果摘要:');
    console.log(`   页面测试：${summary.summary.pagesSuccess}/${summary.summary.pagesTested}`);
    console.log(`   旅程测试：${summary.summary.journeysSuccess}/${summary.summary.journeysTested}`);
    console.log(`   Viewport 测试：${summary.summary.viewportsTested}`);
    console.log(`   总问题数：${summary.summary.totalIssues}`);
    console.log('');
    console.log(`📁 报告保存：${reportsDir}`);
    console.log('');
    console.log('🧹 清理命令:');
    console.log(`   Remove-Item "${TEST_DIR}" -Recurse -Force`);
}

async function analyzePage(page, pageConfig) {
    // 简单的页面分析（实际应调用 AI 测试员）
    const issues = [];
    
    // 检查页面标题
    const title = await page.title();
    if (!title || title.length < 5) {
        issues.push({
            page: pageConfig.name,
            bug_title: '页面标题过短或缺失',
            bug_type: ['SEO', 'Content'],
            bug_priority: 5,
            bug_confidence: 9,
            bug_reasoning_why_a_bug: '页面标题对于 SEO 和用户理解页面内容很重要',
            suggested_fix: '添加描述性的页面标题，包含品牌名和页面内容',
            prompt_to_fix_this_issue: '在<head>中添加<title>标签，格式如"品牌名 - 页面名"'
        });
    }
    
    // 检查是否有主要图片
    const images = await page.$$('img');
    if (images.length === 0 && pageConfig.priority === 'P0') {
        issues.push({
            page: pageConfig.name,
            bug_title: '页面缺少图片内容',
            bug_type: ['Content', 'UI/UX'],
            bug_priority: 4,
            bug_confidence: 8,
            bug_reasoning_why_a_bug: '核心页面应该有视觉内容吸引用户',
            suggested_fix: '添加产品图片或品牌相关图片',
            prompt_to_fix_this_issue: '在页面主要内容区域添加高质量的产品或品牌图片'
        });
    }
    
    // 检查是否有主要按钮
    const buttons = await page.$$('button, a[href]');
    if (buttons.length < 3) {
        issues.push({
            page: pageConfig.name,
            bug_title: '页面交互元素过少',
            bug_type: ['UI/UX', 'Navigation'],
            bug_priority: 5,
            bug_confidence: 7,
            bug_reasoning_why_a_bug: '页面缺少足够的交互元素，用户无法进行下一步操作',
            suggested_fix: '添加导航链接、CTA 按钮等交互元素',
            prompt_to_fix_this_issue: '在页面添加明确的 CTA 按钮和导航链接，引导用户进行下一步操作'
        });
    }
    
    return issues;
}

function generateFullStackHtmlReport(summary) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>全栈测试报告 - ${summary.baseUrl}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #161b22 0%, #1a1f2e 100%);
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .url { color: #58a6ff; font-family: monospace; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .summary-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 20px;
        }
        .summary-card .label { color: #8b949e; font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: 700; color: #58a6ff; }
        .summary-card .value.success { color: #3fb950; }
        .summary-card .value.failed { color: #f85149; }
        
        .section {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .section h2 { margin-bottom: 16px; color: #f0f6fc; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #30363d;
        }
        th { color: #8b949e; font-weight: 600; font-size: 13px; }
        td { color: #c9d1d9; }
        
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status.success { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
        .status.failed { background: rgba(248, 81, 73, 0.15); color: #f85149; }
        .status.partial { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        
        .priority { font-weight: 600; }
        .priority.P0 { color: #f85149; }
        .priority.P1 { color: #d29922; }
        .priority.P2 { color: #58a6ff; }
        
        .footer {
            text-align: center;
            padding: 24px;
            color: #8b949e;
            font-size: 13px;
            border-top: 1px solid #30363d;
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 全栈测试报告</h1>
            <div class="url">${summary.baseUrl}</div>
            <div style="color: #8b949e; font-size: 14px; margin-top: 8px;">
                测试时间：${new Date(summary.timestamp).toLocaleString('zh-CN')}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">页面测试</div>
                <div class="value ${summary.summary.pagesSuccess === summary.summary.pagesTested ? 'success' : 'failed'}">
                    ${summary.summary.pagesSuccess}/${summary.summary.pagesTested}
                </div>
            </div>
            <div class="summary-card">
                <div class="label">旅程测试</div>
                <div class="value ${summary.summary.journeysSuccess === summary.summary.journeysTested ? 'success' : 'failed'}">
                    ${summary.summary.journeysSuccess}/${summary.summary.journeysTested}
                </div>
            </div>
            <div class="summary-card">
                <div class="label">Viewport 测试</div>
                <div class="value success">${summary.summary.viewportsTested}</div>
            </div>
            <div class="summary-card">
                <div class="label">总问题数</div>
                <div class="value failed">${summary.summary.totalIssues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 页面测试结果</h2>
            <table>
                <thead>
                    <tr>
                        <th>页面名称</th>
                        <th>路径</th>
                        <th>优先级</th>
                        <th>状态</th>
                        <th>问题数</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.pages.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td><code>${p.path}</code></td>
                        <td class="priority ${p.priority}">${p.priority}</td>
                        <td><span class="status ${p.status === 'success' ? 'success' : 'failed'}">${p.status}</span></td>
                        <td>${p.issues || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>🛤️ 用户旅程测试结果</h2>
            <table>
                <thead>
                    <tr>
                        <th>旅程名称</th>
                        <th>状态</th>
                        <th>步骤数</th>
                        <th>成功步骤</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.journeys.map(j => `
                    <tr>
                        <td>${j.name}</td>
                        <td><span class="status ${j.status}">${j.status}</span></td>
                        <td>${j.steps.length}</td>
                        <td>${j.steps.filter(s => s.status === 'success').length}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>📱 Viewport 测试结果</h2>
            <table>
                <thead>
                    <tr>
                        <th>设备</th>
                        <th>分辨率</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.viewports.map(v => `
                    <tr>
                        <td>${v.name}</td>
                        <td>${v.width} × ${v.height}</td>
                        <td><span class="status ${v.status}">${v.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>OpenTestAI × OpenClaw 全栈测试方案</p>
            <p>测试目录：<code>${TEST_DIR || 'N/A'}</code></p>
        </div>
    </div>
</body>
</html>`;
}

main().catch(console.error);
