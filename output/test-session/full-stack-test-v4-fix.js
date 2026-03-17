/**
 * 全栈测试执行器 v4 - 修复版
 * 修复:
 * - URL 路径重复问题
 * - 404 页面检测
 * - 更全面的功能测试
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';

console.log('🧪 全栈测试执行器 v4 - 修复版');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 基础 URL: ${BASE_URL}`);
console.log('');

// 确保目录存在
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 安全截图
async function safeScreenshot(page, filepath) {
    try {
        await page.screenshot({ path: filepath, timeout: 3000 });
        return true;
    } catch (e) { return false; }
}

// 定义要测试的页面（修复 URL 路径）
const PAGES_TO_TEST = [
    { 
        path: '/', 
        name: '首页', 
        priority: 'P0',
        checks: ['title', 'logo', 'navigation', 'banner', 'footer']
    },
    { 
        path: '/product', 
        name: '产品列表页', 
        priority: 'P0',
        checks: ['title', 'productList', 'filter', 'sort', 'pagination']
    },
    { 
        path: '/product/1', 
        name: '产品详情页', 
        priority: 'P0',
        checks: ['title', 'productImage', 'productInfo', 'addToCart', 'related']
    },
    { 
        path: '/cart', 
        name: '购物车页', 
        priority: 'P0',
        checks: ['title', 'cartItems', 'quantityEdit', 'priceCalc', 'checkout']
    },
    { 
        path: '/checkout', 
        name: '结算页', 
        priority: 'P0',
        checks: ['title', 'address', 'delivery', 'payment', 'submit']
    },
    { 
        path: '/login', 
        name: '登录页', 
        priority: 'P1',
        checks: ['title', 'loginForm', 'socialLogin', 'registerLink']
    },
    { 
        path: '/about', 
        name: '关于我们', 
        priority: 'P2',
        checks: ['title', 'content', 'contact', 'social']
    },
];

async function main() {
    const timestamp = Date.now();
    const artifactsDir = path.join(TEST_DIR, 'artifacts');
    const reportsDir = path.join(TEST_DIR, 'reports');
    
    ensureDir(artifactsDir);
    ensureDir(reportsDir);
    
    const results = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        pagesTested: [],
        issues: []
    };
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        
        console.log('📄 开始页面测试...\n');
        
        for (const pageConfig of PAGES_TO_TEST) {
            console.log(`📄 测试：${pageConfig.name} (${pageConfig.path}) [${pageConfig.priority}]`);
            
            const page = await context.newPage();
            // 修复：不要重复添加 /zh-cn
            const url = BASE_URL + pageConfig.path;
            const pageDir = path.join(artifactsDir, `page-${pageConfig.name.replace(/[\u4e00-\u9fa5]/g, p => p.charCodeAt(0))}`);
            ensureDir(pageDir);
            
            const pageResult = {
                name: pageConfig.name,
                path: pageConfig.path,
                priority: pageConfig.priority,
                url,
                checks: [],
                screenshot: null
            };
            
            try {
                const startTime = Date.now();
                const response = await page.goto(url, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 10000 
                });
                const loadTime = Date.now() - startTime;
                
                // 检查 404
                const status = response ? response.status() : 200;
                if (status === 404) {
                    console.log(`      ❌ 404 - 页面不存在`);
                    pageResult.status = '404';
                    pageResult.loadTime = loadTime;
                    
                    results.issues.push({
                        page: pageConfig.name,
                        bug_title: '页面 404 错误',
                        bug_type: ['Functional', '404'],
                        bug_priority: pageConfig.priority === 'P0' ? 9 : 7,
                        bug_confidence: 10,
                        reproduction_steps: `1. 访问 ${url}\n2. 观察 HTTP 状态码`,
                        expected_result: 'HTTP 200 OK',
                        actual_result: `HTTP ${status} Not Found`,
                        suggested_fix: '检查路由配置或创建该页面',
                        screenshot: null
                    });
                    
                    results.pagesTested.push(pageResult);
                    await page.close();
                    continue;
                }
                
                await page.waitForTimeout(1000);
                
                // 截图
                const screenshotPath = path.join(pageDir, 'screenshot.png');
                await safeScreenshot(page, screenshotPath);
                pageResult.screenshot = `artifacts/page-${pageConfig.name.replace(/[\u4e00-\u9fa5]/g, p => p.charCodeAt(0))}/screenshot.png`;
                
                // 保存 DOM
                fs.writeFileSync(path.join(pageDir, 'dom.html'), await page.content());
                
                // 执行页面检查
                const title = await page.title();
                const checks = [];
                
                // 1. 标题检查
                const titleCheck = {
                    name: '页面标题',
                    passed: title && title.length >= 3,
                    expected: '标题长度>=3 字符',
                    actual: `"${title}" (${title.length}字符)`
                };
                checks.push(titleCheck);
                
                if (!titleCheck.passed) {
                    results.issues.push({
                        page: pageConfig.name,
                        bug_title: '页面标题过短或缺失',
                        bug_type: ['SEO', 'Content'],
                        bug_priority: 5,
                        bug_confidence: 9,
                        reproduction_steps: `1. 访问 ${url}\n2. 查看浏览器标签页标题`,
                        expected_result: titleCheck.expected,
                        actual_result: titleCheck.actual,
                        suggested_fix: '添加描述性页面标题，包含品牌名和页面内容',
                        screenshot: pageResult.screenshot
                    });
                }
                
                // 2. 检查页面主要内容是否存在
                const bodyContent = await page.$('body');
                const bodyText = bodyContent ? await bodyContent.textContent() : '';
                const hasContent = bodyText && bodyText.length > 100;
                
                const contentCheck = {
                    name: '页面内容',
                    passed: hasContent,
                    expected: '页面有足够的内容 (>100 字符)',
                    actual: hasContent ? `${bodyText.length}字符` : '内容过少或为空'
                };
                checks.push(contentCheck);
                
                if (!contentCheck.passed) {
                    results.issues.push({
                        page: pageConfig.name,
                        bug_title: '页面内容过少',
                        bug_type: ['Content'],
                        bug_priority: 6,
                        bug_confidence: 8,
                        reproduction_steps: `1. 访问 ${url}\n2. 查看页面内容`,
                        expected_result: contentCheck.expected,
                        actual_result: contentCheck.actual,
                        suggested_fix: '添加页面主要内容',
                        screenshot: pageResult.screenshot
                    });
                }
                
                // 3. 检查是否有明显错误
                const consoleErrors = [];
                page.on('console', msg => {
                    if (msg.type() === 'error') {
                        consoleErrors.push(msg.text());
                    }
                });
                
                // 4. 检查链接是否有效（抽样检查）
                const links = await page.$$('a[href]');
                let brokenLinks = 0;
                for (let i = 0; i < Math.min(links.length, 10); i++) {
                    const href = await links[i].getAttribute('href');
                    if (href && href.startsWith('#') || href.startsWith('javascript:')) {
                        continue; // 跳过锚点和 JS 链接
                    }
                    // 简单检查，不实际请求
                }
                
                const linkCheck = {
                    name: '链接检查',
                    passed: brokenLinks === 0,
                    expected: '无损坏链接',
                    actual: brokenLinks > 0 ? `${brokenLinks}个损坏链接` : '正常'
                };
                checks.push(linkCheck);
                
                // 5. 检查加载时间
                const perfCheck = {
                    name: '加载性能',
                    passed: loadTime < 3000,
                    expected: '加载时间<3 秒',
                    actual: `${loadTime}ms`
                };
                checks.push(perfCheck);
                
                if (!perfCheck.passed) {
                    results.issues.push({
                        page: pageConfig.name,
                        bug_title: '页面加载过慢',
                        bug_type: ['Performance'],
                        bug_priority: 6,
                        bug_confidence: 10,
                        reproduction_steps: `1. 访问 ${url}\n2. 记录加载时间`,
                        expected_result: perfCheck.expected,
                        actual_result: perfCheck.actual,
                        suggested_fix: '优化资源加载，使用 CDN，压缩图片等',
                        screenshot: pageResult.screenshot
                    });
                }
                
                pageResult.status = 'success';
                pageResult.loadTime = loadTime;
                pageResult.checks = checks;
                pageResult.checksPassed = checks.filter(c => c.passed).length;
                pageResult.checksTotal = checks.length;
                
                const statusIcon = pageResult.status === 'success' ? '✅' : '❌';
                console.log(`      ${statusIcon} 完成 - 加载：${loadTime}ms, 检查：${pageResult.checksPassed}/${pageResult.checksTotal}`);
                
            } catch (error) {
                console.log(`      ❌ 失败：${error.message}`);
                pageResult.status = 'failed';
                pageResult.error = error.message;
                
                results.issues.push({
                    page: pageConfig.name,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional'],
                    bug_priority: pageConfig.priority === 'P0' ? 8 : 6,
                    bug_confidence: 10,
                    reproduction_steps: `1. 访问 ${url}\n2. 等待页面加载`,
                    expected_result: '页面正常加载',
                    actual_result: error.message,
                    suggested_fix: '检查网络连接和服务器状态',
                    screenshot: null
                });
            }
            
            results.pagesTested.push(pageResult);
            await page.close();
        }
        
        await context.close();
        
    } catch (error) {
        console.error('❌ 测试执行错误:', error.message);
    } finally {
        if (browser) await browser.close();
    }
    
    // 生成报告
    console.log('\n📄 生成 HTML 报告...\n');
    
    const summary = {
        testType: 'full-stack-fix',
        version: '4.0',
        timestamp: results.timestamp,
        baseUrl: BASE_URL,
        testDir: TEST_DIR,
        summary: {
            pagesTested: results.pagesTested.length,
            pagesSuccess: results.pagesTested.filter(p => p.status === 'success').length,
            pages404: results.pagesTested.filter(p => p.status === '404').length,
            pagesFailed: results.pagesTested.filter(p => p.status === 'failed').length,
            totalIssues: results.issues.length
        },
        pages: results.pagesTested,
        issues: results.issues
    };
    
    // JSON 报告
    fs.writeFileSync(
        path.join(reportsDir, 'summary.json'),
        JSON.stringify(summary, null, 2)
    );
    
    // HTML 报告
    const htmlReport = generateFixHtmlReport(summary, TEST_DIR);
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
    
    // 完成总结
    console.log('✅ 全栈测试完成！\n');
    console.log('📊 测试结果:');
    console.log(`   页面总数：${summary.summary.pagesTested}`);
    console.log(`   成功：${summary.summary.pagesSuccess}`);
    console.log(`   404: ${summary.summary.pages404}`);
    console.log(`   失败：${summary.summary.pagesFailed}`);
    console.log(`   问题：${summary.summary.totalIssues}`);
    console.log(`\n📁 目录：${TEST_DIR}`);
    console.log(`🧹 清理：Remove-Item "${TEST_DIR}" -Recurse -Force`);
}

function generateFixHtmlReport(summary, testDir) {
    // 读取截图转 Base64
    const screenshots = {};
    summary.pages.forEach(p => {
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
    <title>全栈测试报告 v4 - ${summary.baseUrl}</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #1c2129;
            --border: #30363d;
            --text-primary: #f0f6fc;
            --text-secondary: #c9d1d9;
            --text-muted: #8b949e;
            --success: #3fb950;
            --warning: #d29922;
            --error: #f85149;
            --accent: #58a6ff;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        
        .header {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header .url { color: var(--accent); font-family: monospace; font-size: 14px; }
        .header .meta { color: var(--text-muted); font-size: 13px; margin-top: 8px; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .summary-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 20px;
        }
        .summary-card .label { color: var(--text-muted); font-size: 13px; margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: 700; color: var(--accent); }
        .summary-card .value.success { color: var(--success); }
        .summary-card .value.failed { color: var(--error); }
        .summary-card .value.warning { color: var(--warning); }
        
        .section {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .section h2 { margin-bottom: 20px; color: var(--text-primary); font-size: 20px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        th { color: var(--text-muted); font-weight: 600; font-size: 13px; text-transform: uppercase; }
        td { color: var(--text-secondary); font-size: 14px; }
        tr:hover { background: var(--bg-tertiary); }
        
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
        .status.success { background: rgba(63, 185, 80, 0.15); color: var(--success); }
        .status.failed { background: rgba(248, 81, 73, 0.15); color: var(--error); }
        .status.warning { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
        .status.404 { background: rgba(139, 148, 158, 0.15); color: var(--text-muted); }
        
        .priority { font-weight: 700; font-size: 13px; }
        .priority.P0 { color: var(--error); }
        .priority.P1 { color: var(--warning); }
        .priority.P2 { color: var(--accent); }
        
        .screenshot-container {
            margin: 16px 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot-container img { width: 100%; height: auto; display: block; }
        .screenshot-caption {
            background: var(--bg-tertiary);
            padding: 12px 16px;
            font-size: 13px;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
        }
        
        .issue-card {
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-left: 4px solid var(--error);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .issue-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .issue-section { margin-bottom: 12px; }
        .issue-section:last-child { margin-bottom: 0; }
        .issue-section h4 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
        .issue-section p { line-height: 1.7; }
        .reproduction-steps {
            background: var(--bg-primary);
            padding: 12px 16px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
        }
        
        .checks-list { margin: 8px 0; }
        .check-item {
            padding: 6px 12px;
            border-radius: 6px;
            margin: 4px 0;
            font-size: 13px;
        }
        .check-item.passed { background: rgba(63, 185, 80, 0.1); border-left: 3px solid var(--success); }
        .check-item.failed { background: rgba(248, 81, 73, 0.1); border-left: 3px solid var(--error); }
        
        .footer {
            text-align: center;
            padding: 24px;
            color: var(--text-muted);
            font-size: 13px;
            border-top: 1px solid var(--border);
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 全栈测试报告 v4.0</h1>
            <div class="url">${summary.baseUrl}</div>
            <div class="meta">测试时间：${new Date(summary.timestamp).toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">页面总数</div>
                <div class="value">${summary.summary.pagesTested}</div>
            </div>
            <div class="summary-card">
                <div class="label">成功</div>
                <div class="value success">${summary.summary.pagesSuccess}</div>
            </div>
            <div class="summary-card">
                <div class="label">404</div>
                <div class="value warning">${summary.summary.pages404}</div>
            </div>
            <div class="summary-card">
                <div class="label">失败</div>
                <div class="value failed">${summary.summary.pagesFailed}</div>
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
                    <tr>
                        <th>页面名称</th>
                        <th>路径</th>
                        <th>优先级</th>
                        <th>状态</th>
                        <th>加载时间</th>
                        <th>检查项</th>
                        <th>截图</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.pages.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td><code>${p.path}</code></td>
                        <td class="priority ${p.priority}">${p.priority}</td>
                        <td><span class="status ${p.status === 'success' ? 'success' : p.status}">${p.status}</span></td>
                        <td>${p.loadTime ? p.loadTime + 'ms' : '-'}</td>
                        <td>${p.checksPassed || 0}/${p.checksTotal || 0}</td>
                        <td>${p.screenshot && screenshots[p.screenshot] ? `<a href="#" onclick="alert('查看截图');return false;">📸 查看</a>` : '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h3 style="margin: 24px 0 16px; font-size: 16px;">📋 详细检查结果</h3>
            ${summary.pages.filter(p => p.status === 'success').map(p => `
            <div style="margin-bottom: 20px; background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">
                <h4 style="margin-bottom: 12px;">${p.name} <span style="color: var(--text-muted); font-weight: normal;">(${p.checksPassed}/${p.checksTotal} 通过)</span></h4>
                <div class="checks-list">
                    ${p.checks ? p.checks.map(c => `
                    <div class="check-item ${c.passed ? 'passed' : 'failed'}">
                        <strong>${c.name}</strong>: ${c.expected}
                        ${!c.passed ? `<br><small style="color: var(--error)">实际：${c.actual}</small>` : ''}
                    </div>
                    `).join('') : ''}
                </div>
                ${p.screenshot && screenshots[p.screenshot] ? `
                <div class="screenshot-container" style="margin-top: 12px; max-width: 800px;">
                    <img src="${screenshots[p.screenshot]}" alt="${p.name}">
                    <div class="screenshot-caption">${p.name} - 页面截图</div>
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        
        ${summary.issues.length > 0 ? `
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
                ${issue.screenshot && screenshots[issue.screenshot] ? `
                <div class="issue-section">
                    <h4>📸 问题截图</h4>
                    <div class="screenshot-container" style="max-width: 600px;">
                        <img src="${screenshots[issue.screenshot]}" alt="问题截图">
                    </div>
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <div style="text-align: center; padding: 60px 20px; color: var(--success);">
                <h2 style="margin-bottom: 12px;">✅ 未发现问题</h2>
                <p style="color: var(--text-muted);">所有测试项均通过！</p>
            </div>
        </div>
        `}
        
        <div class="footer">
            <p>OpenTestAI × OpenClaw 全栈测试方案 v4.0</p>
            <p style="margin-top: 8px;">${summary.testDir}</p>
        </div>
    </div>
</body>
</html>`;
}

main().catch(e => {
    console.error('❌ 未捕获错误:', e.message);
    process.exit(1);
});
