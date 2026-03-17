/**
 * 全栈测试执行器 v3 - 稳定版
 * OpenTestAI × OpenClaw 测试提效方案
 * 
 * 改进点:
 * - 更短的超时时间 (避免长时间等待)
 * - 更好的错误处理 (单点失败不影响整体)
 * - 确保报告一定生成 (即使测试失败)
 * - 更智能的选择器匹配
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';

console.log('🧪 全栈测试执行器 v3 - 稳定版');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log(`⏱️  超时设置：页面加载 10s, 操作 3s`);
console.log('');

// 确保目录存在
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 安全截图 (失败不中断)
async function safeScreenshot(page, filepath, timeout = 3000) {
    try {
        await page.screenshot({ path: filepath, timeout });
        return true;
    } catch (e) {
        console.log(`      ⚠️ 截图失败：${e.message}`);
        return false;
    }
}

// 智能点击 (尝试多个选择器)
async function smartClick(page, selectors, timeout = 3000) {
    for (const selector of selectors) {
        try {
            await page.click(selector, { timeout, force: true });
            return { success: true, selector };
        } catch (e) {}
    }
    return { success: false, error: '所有选择器都失败' };
}

// 定义要测试的页面
const PAGES_TO_TEST = [
    { path: '/zh-cn/product', name: '产品列表页', priority: 'P0' },
    { path: '/zh-cn/product/1', name: '产品详情页', priority: 'P0' },
    { path: '/zh-cn/cart', name: '购物车页', priority: 'P0' },
    { path: '/zh-cn/checkout', name: '结算页', priority: 'P0' },
];

// 定义用户旅程 (简化版)
const USER_JOURNEYS = [
    {
        name: '01-游客浏览',
        steps: [
            { action: 'visit', path: '/zh-cn/product', description: '访问产品列表页' },
            { action: 'screenshot', name: 'journey1-product-list', description: '产品列表截图' },
        ]
    },
];

async function main() {
    const timestamp = Date.now();
    const artifactsDir = path.join(TEST_DIR, 'artifacts');
    const journeysDir = path.join(TEST_DIR, 'journeys');
    const reportsDir = path.join(TEST_DIR, 'reports');
    
    ensureDir(artifactsDir);
    ensureDir(journeysDir);
    ensureDir(reportsDir);
    
    const results = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        pagesTested: [],
        journeysTested: [],
        viewportsTested: [],
        issues: []
    };
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        
        // ========== 1. 多页面测试 ==========
        console.log('📄 步骤 1: 多页面测试...');
        const pageContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        
        for (const pageConfig of PAGES_TO_TEST) {
            console.log(`\n   📄 测试：${pageConfig.name} (${pageConfig.path})`);
            
            const page = await pageContext.newPage();
            const url = BASE_URL + pageConfig.path;
            const pageDir = path.join(artifactsDir, `page-${pageConfig.name.replace(/[\u4e00-\u9fa5]/g, p => p.charCodeAt(0))}`);
            ensureDir(pageDir);
            
            try {
                const startTime = Date.now();
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                const loadTime = Date.now() - startTime;
                
                await page.waitForTimeout(1000);
                
                // 截图
                await safeScreenshot(page, path.join(pageDir, 'screenshot.png'));
                
                // 保存 DOM
                fs.writeFileSync(path.join(pageDir, 'dom.html'), await page.content());
                
                // 简单分析
                const title = await page.title();
                const issues = [];
                
                if (!title || title.length < 3) {
                    issues.push({
                        page: pageConfig.name,
                        bug_title: '页面标题过短',
                        bug_type: ['SEO'],
                        bug_priority: 5,
                        bug_confidence: 9,
                        reproduction_steps: `1. 访问 ${url}\n2. 查看页面标题`,
                        expected_result: '标题长度>=3 字符',
                        actual_result: `"${title}" (${title.length}字符)`,
                        suggested_fix: '添加描述性标题',
                        screenshot: `artifacts/page-${pageConfig.name.replace(/[\u4e00-\u9fa5]/g, p => p.charCodeAt(0))}/screenshot.png`
                    });
                }
                
                results.pagesTested.push({
                    name: pageConfig.name,
                    path: pageConfig.path,
                    priority: pageConfig.priority,
                    url,
                    loadTime,
                    status: 'success',
                    issues: issues.length,
                    screenshot: `artifacts/page-${pageConfig.name.replace(/[\u4e00-\u9fa5]/g, p => p.charCodeAt(0))}/screenshot.png`
                });
                
                results.issues.push(...issues);
                
                console.log(`      ✅ 完成 - 加载：${loadTime}ms, 问题：${issues.length}`);
                
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                results.pagesTested.push({
                    name: pageConfig.name,
                    path: pageConfig.path,
                    priority: pageConfig.priority,
                    status: 'failed',
                    error: error.message
                });
                
                results.issues.push({
                    page: pageConfig.name,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional'],
                    bug_priority: pageConfig.priority === 'P0' ? 8 : 6,
                    bug_confidence: 10,
                    reproduction_steps: `1. 访问 ${url}\n2. 等待页面加载`,
                    expected_result: '页面正常加载',
                    actual_result: error.message,
                    suggested_fix: '检查网络连接和服务器状态'
                });
            }
            
            await page.close();
        }
        
        await pageContext.close();
        
        // ========== 2. 用户旅程测试 ==========
        console.log('\n🛤️ 步骤 2: 用户旅程测试...');
        
        for (const journey of USER_JOURNEYS) {
            console.log(`\n   🛤️ 测试旅程：${journey.name}`);
            
            const journeyDir = path.join(journeysDir, journey.name.replace(/\s+/g, '-'));
            ensureDir(journeyDir);
            
            const journeyContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const journeyPage = await journeyContext.newPage();
            
            const journeyResults = {
                name: journey.name,
                steps: [],
                screenshots: [],
                status: 'success'
            };
            
            for (let i = 0; i < journey.steps.length; i++) {
                const step = journey.steps[i];
                console.log(`      步骤${i + 1}/${journey.steps.length}: ${step.description}`);
                
                try {
                    switch (step.action) {
                        case 'visit':
                            await journeyPage.goto(BASE_URL + step.path, { 
                                waitUntil: 'domcontentloaded',
                                timeout: 10000 
                            });
                            break;
                        
                        case 'screenshot':
                            const shotPath = path.join(journeyDir, `${step.name}.png`);
                            await safeScreenshot(journeyPage, shotPath);
                            journeyResults.screenshots.push({
                                step: i + 1,
                                name: step.name,
                                description: step.description,
                                path: `journeys/${journey.name.replace(/\s+/g, '-')}/${step.name}.png`
                            });
                            break;
                    }
                    
                    journeyResults.steps.push({ ...step, status: 'success', stepNumber: i + 1 });
                } catch (error) {
                    console.log(`         ❌ 失败：${error.message}`);
                    journeyResults.steps.push({
                        ...step,
                        status: 'failed',
                        error: error.message,
                        stepNumber: i + 1
                    });
                    journeyResults.status = 'partial';
                }
            }
            
            await journeyContext.close();
            results.journeysTested.push(journeyResults);
            console.log(`      旅程状态：${journeyResults.status}`);
        }
        
        // ========== 3. 简化 Viewport 测试 ==========
        console.log('\n📱 步骤 3: Viewport 测试 (简化版)...');
        
        const viewports = [
            { name: '桌面', width: 1280, height: 800 },
            { name: '手机', width: 375, height: 667 },
        ];
        
        for (const vp of viewports) {
            console.log(`   测试：${vp.name} (${vp.width}x${vp.height})`);
            
            const vpContext = await browser.newContext({ viewport });
            const vpPage = await vpContext.newPage();
            
            try {
                await vpPage.goto(BASE_URL + '/zh-cn/product', { 
                    waitUntil: 'domcontentloaded',
                    timeout: 10000 
                });
                
                const vpDir = path.join(artifactsDir, `viewport-${vp.name}`);
                ensureDir(vpDir);
                
                await safeScreenshot(vpPage, path.join(vpDir, 'screenshot.png'));
                
                results.viewportsTested.push({
                    name: vp.name,
                    width: vp.width,
                    height: vp.height,
                    status: 'success',
                    screenshot: `artifacts/viewport-${vp.name}/screenshot.png`
                });
                
                console.log(`      ✅ 完成`);
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                results.viewportsTested.push({
                    name: vp.name,
                    width: vp.width,
                    height: vp.height,
                    status: 'failed',
                    error: error.message
                });
            }
            
            await vpContext.close();
        }
        
    } catch (error) {
        console.error('❌ 测试执行错误:', error.message);
    } finally {
        if (browser) await browser.close();
    }
    
    // ========== 4. 生成报告 (确保一定执行) ==========
    console.log('\n📄 步骤 4: 生成 HTML 报告...');
    
    try {
        const summary = {
            testType: 'full-stack-stable',
            version: '3.0',
            timestamp: results.timestamp,
            baseUrl: BASE_URL,
            testDir: TEST_DIR,
            summary: {
                pagesTested: results.pagesTested.length,
                pagesSuccess: results.pagesTested.filter(p => p.status === 'success').length,
                journeysTested: results.journeysTested.length,
                viewportsTested: results.viewportsTested.length,
                totalIssues: results.issues.length
            },
            pages: results.pagesTested,
            journeys: results.journeysTested,
            viewports: results.viewportsTested,
            issues: results.issues
        };
        
        // JSON 报告
        fs.writeFileSync(
            path.join(reportsDir, 'summary.json'),
            JSON.stringify(summary, null, 2)
        );
        
        // HTML 报告
        const htmlReport = generateStableHtmlReport(summary, TEST_DIR);
        fs.writeFileSync(
            path.join(reportsDir, 'report.html'),
            htmlReport
        );
        
        console.log(`✅ 报告已生成：${path.join(reportsDir, 'report.html')}`);
        
        // 自动打开
        try {
            const reportPath = path.join(reportsDir, 'report.html');
            require('child_process').exec(`start "${reportPath}" "${reportPath}"`);
            console.log('🌐 已自动打开 HTML 报告');
        } catch (e) {}
        
    } catch (error) {
        console.error('❌ 报告生成失败:', error.message);
    }
    
    // ========== 5. 完成总结 ==========
    console.log('\n✅ 全栈测试完成！');
    console.log('');
    console.log('📊 测试结果:');
    console.log(`   页面：${results.pagesTested.filter(p => p.status === 'success').length}/${results.pagesTested.length}`);
    console.log(`   旅程：${results.journeysTested.filter(j => j.status === 'success').length}/${results.journeysTested.length}`);
    console.log(`   Viewport: ${results.viewportsTested.filter(v => v.status === 'success').length}/${results.viewportsTested.length}`);
    console.log(`   问题：${results.issues.length}`);
    console.log('');
    console.log(`📁 目录：${TEST_DIR}`);
    console.log(`🧹 清理：Remove-Item "${TEST_DIR}" -Recurse -Force`);
}

function generateStableHtmlReport(summary, testDir) {
    // 读取截图转 Base64
    const screenshots = {};
    const allScreenshots = [];
    
    summary.pages.forEach(p => { if (p.screenshot) allScreenshots.push(p.screenshot); });
    summary.journeys.forEach(j => {
        (j.screenshots || []).forEach(s => allScreenshots.push(s.path));
    });
    summary.viewports.forEach(v => { if (v.screenshot) allScreenshots.push(v.screenshot); });
    
    for (const shotPath of allScreenshots) {
        const fullPath = path.join(testDir, shotPath);
        if (fs.existsSync(fullPath)) {
            const buffer = fs.readFileSync(fullPath);
            screenshots[shotPath.replace(/\\/g, '/')] = `data:image/png;base64,${buffer.toString('base64')}`;
        }
    }
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>测试报告 - ${summary.baseUrl}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#e6edf3;padding:20px}
        .container{max-width:1400px;margin:0 auto}
        .header{background:linear-gradient(135deg,#161b22,#1a1f2e);border:1px solid #30363d;border-radius:12px;padding:24px;margin-bottom:24px}
        .header h1{font-size:24px;margin-bottom:8px}
        .header .url{color:#58a6ff;font-family:monospace}
        .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:24px}
        .summary-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;text-align:center}
        .summary-card .label{color:#8b949e;font-size:13px;margin-bottom:8px}
        .summary-card .value{font-size:32px;font-weight:700;color:#58a6ff}
        .summary-card .value.success{color:#3fb950}
        .summary-card .value.failed{color:#f85149}
        .section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px;margin-bottom:24px}
        .section h2{margin-bottom:16px;color:#f0f6fc;font-size:20px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #30363d}
        th{color:#8b949e;font-weight:600;font-size:13px}
        td{color:#c9d1d9;font-size:14px}
        tr:hover{background:#1c2129}
        .status{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block}
        .status.success{background:rgba(63,185,80,0.15);color:#3fb950}
        .status.failed{background:rgba(248,81,73,0.15);color:#f85149}
        .status.partial{background:rgba(210,153,34,0.15);color:#d29922}
        .priority{font-weight:700}
        .priority.P0{color:#f85149}
        .priority.P1{color:#d29922}
        .screenshot-container{margin:16px 0;border:1px solid #30363d;border-radius:8px;overflow:hidden}
        .screenshot-container img{width:100%;height:auto;display:block}
        .screenshot-caption{background:#1c2129;padding:12px 16px;font-size:13px;color:#8b949e;border-top:1px solid #30363d}
        .issue-card{background:#1c2129;border:1px solid #30363d;border-left:4px solid #f85149;border-radius:8px;padding:20px;margin-bottom:16px}
        .issue-title{font-size:16px;font-weight:600;margin-bottom:12px}
        .issue-section{margin-bottom:12px}
        .issue-section:last-child{margin-bottom:0}
        .issue-section h4{font-size:12px;text-transform:uppercase;color:#8b949e;margin-bottom:6px}
        .reproduction-steps{background:#0d1117;padding:12px;border-radius:6px;font-family:monospace;font-size:13px;white-space:pre-wrap}
        .footer{text-align:center;padding:24px;color:#8b949e;font-size:13px;border-top:1px solid #30363d;margin-top:24px}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 全栈测试报告 v3.0</h1>
            <div class="url">${summary.baseUrl}</div>
            <div style="color:#8b949e;font-size:13px;margin-top:8px">
                ${new Date(summary.timestamp).toLocaleString('zh-CN')}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">页面测试</div>
                <div class="value ${summary.summary.pagesSuccess === summary.summary.pagesTested ? 'success' : 'failed'}">${summary.summary.pagesSuccess}/${summary.summary.pagesTested}</div>
            </div>
            <div class="summary-card">
                <div class="label">旅程测试</div>
                <div class="value">${summary.summary.journeysTested}</div>
            </div>
            <div class="summary-card">
                <div class="label">Viewport</div>
                <div class="value">${summary.summary.viewportsTested}</div>
            </div>
            <div class="summary-card">
                <div class="label">问题总数</div>
                <div class="value ${summary.summary.totalIssues > 0 ? 'failed' : 'success'}">${summary.summary.totalIssues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 页面测试结果</h2>
            <table>
                <thead>
                    <tr><th>页面</th><th>路径</th><th>优先级</th><th>状态</th><th>加载时间</th><th>问题</th></tr>
                </thead>
                <tbody>
                    ${summary.pages.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td><code>${p.path}</code></td>
                        <td class="priority ${p.priority}">${p.priority}</td>
                        <td><span class="status ${p.status}">${p.status}</span></td>
                        <td>${p.loadTime ? p.loadTime + 'ms' : '-'}</td>
                        <td>${p.issues || 0}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${summary.pages.filter(p => p.screenshot && screenshots[p.screenshot]).map(p => `
            <div class="screenshot-container" style="margin-top:16px">
                <img src="${screenshots[p.screenshot]}" alt="${p.name}">
                <div class="screenshot-caption">${p.name} - ${p.status === 'success' ? '✅' : '❌'}</div>
            </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>🛤️ 用户旅程</h2>
            ${summary.journeys.map(j => `
            <div style="margin-bottom:24px">
                <h3 style="margin-bottom:8px">${j.name}</h3>
                <p style="color:#8b949e;margin-bottom:12px">状态：<span class="status ${j.status}">${j.status}</span></p>
                ${j.screenshots && j.screenshots.length > 0 ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
                    ${j.screenshots.map(s => `
                    <div class="screenshot-container">
                        <img src="${screenshots[s.path] || ''}" alt="${s.name}">
                        <div class="screenshot-caption">步骤${s.step}: ${s.description}</div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>📱 Viewport 测试</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
                ${summary.viewports.map(v => `
                <div>
                    <h4 style="margin-bottom:8px">${v.name} (${v.width}×${v.height})</h4>
                    ${v.screenshot && screenshots[v.screenshot] ? `
                    <div class="screenshot-container">
                        <img src="${screenshots[v.screenshot]}" alt="${v.name}">
                        <div class="screenshot-caption">${v.status === 'success' ? '✅' : '❌'}</div>
                    </div>
                    ` : `<p style="color:#8b949e">${v.status}</p>`}
                </div>
                `).join('')}
            </div>
        </div>
        
        ${summary.issues.length > 0 ? `
        <div class="section">
            <h2>🐛 发现的问题 (${summary.issues.length})</h2>
            ${summary.issues.map((issue, i) => `
            <div class="issue-card">
                <div class="issue-title">${i + 1}. ${issue.bug_title}</div>
                <div class="issue-section">
                    <h4>页面</h4>
                    <p><code>${issue.page || '-'}</code></p>
                </div>
                ${issue.reproduction_steps ? `
                <div class="issue-section">
                    <h4>复现步骤</h4>
                    <div class="reproduction-steps">${issue.reproduction_steps}</div>
                </div>
                ` : ''}
                ${issue.expected_result ? `
                <div class="issue-section">
                    <h4>预期结果</h4>
                    <p>${issue.expected_result}</p>
                </div>
                ` : ''}
                ${issue.actual_result ? `
                <div class="issue-section">
                    <h4>实际结果</h4>
                    <p>${issue.actual_result}</p>
                </div>
                ` : ''}
                ${issue.suggested_fix ? `
                <div class="issue-section">
                    <h4>修复建议</h4>
                    <p>${issue.suggested_fix}</p>
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <div style="text-align:center;padding:40px;color:#3fb950">
                <h2 style="margin-bottom:12px">✅ 未发现问题</h2>
                <p style="color:#8b949e">所有测试项通过</p>
            </div>
        </div>
        `}
        
        <div class="footer">
            <p>OpenTestAI × OpenClaw v3.0 稳定版</p>
            <p style="margin-top:8px">${summary.testDir}</p>
        </div>
    </div>
</body>
</html>`;
}

main().catch(e => {
    console.error('❌ 未捕获错误:', e.message);
    process.exit(1);
});
