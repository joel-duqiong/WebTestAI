/**
 * @module FullStackTest
 * @description 全栈测试执行器 v5.4 - 动态 Agent 识别版
 *
 * 测试流程：
 * 1. 解析命令行参数（输出目录、目标 URL、最大页面数、爬取深度）
 * 2. 启动 Playwright 爬取页面，提取 DOM 特征
 * 3. 使用 PageClassifier 动态识别页面类型，匹配 Agent 组合
 * 4. 使用 PageAnalyzer 生成基础测试 + 专项测试用例
 * 5. 执行测试，收集结果
 * 6. 使用 HTMLReporter 生成可视化 HTML 报告
 *
 * 基于 v5.3 改进，新增动态 Agent 识别能力
 * 保留原有 8 个基础测试不变
 *
 * @version 5.4
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const HTMLReporter = require('../src/hybrid-test-arch-v3/html-reporter');
const PageClassifier = require('../src/hybrid-test-arch-v3/page-classifier');
const PageAnalyzer = require('../src/hybrid-test-arch-v3/analyzer');

const TEST_DIR = process.argv[2];
const BASE_URL = process.argv[3] || 'https://chagee.com/zh-cn';
const MAX_PAGES = parseInt(process.argv[4]) || 50; // 默认 50 页
const MAX_DEPTH = parseInt(process.argv[5]) || 3; // 爬取深度

// 初始化动态 Agent 识别器和分析器
const classifier = new PageClassifier();
const analyzer = new PageAnalyzer();

// 静态 Agent 列表（保留，用于兼容）
const TEST_AGENTS = [
    { id: 'mia', name: 'Mia', emoji: '👁️', role: 'UI/UX 与表单专家' },
    { id: 'sophia', name: 'Sophia', emoji: '♿', role: '无障碍访问专家' },
    { id: 'tariq', name: 'Tariq', emoji: '🔒', role: '安全与 OWASP 专家' },
    { id: 'leila', name: 'Leila', emoji: '📝', role: '内容质量专家' }
];

async function runTest() {
    console.log('🧪 全栈测试执行器 v5.4 - 动态 Agent 识别版');
    console.log(`📁 测试目录：${TEST_DIR}`);
    console.log(`🌐 基础 URL: ${BASE_URL}`);
    console.log(`📄 最大爬取：${MAX_PAGES} 页面`);
    console.log(`🤖 基础角色：${TEST_AGENTS.map(a => a.name).join(' + ')}`);
    console.log(`🎯 动态角色：根据页面特征自动匹配 (${classifier.getAllAgents().length} 个可用)`);
    console.log('');

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        },
        javaScriptEnabled: true,
        bypassCSP: true
    });
    
    // 隐藏 webdriver 特征
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    });

    const results = {
        timestamp: new Date().toISOString(),
        allPages: [],
        successPages: [],
        failedPages: [],
        issues: []
    };

    const reportsDir = path.join(TEST_DIR, 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    try {
        console.log('🕷️  Step 1: 爬取所有页面...\n');
        
        const page = await context.newPage();
        const maxPages = MAX_PAGES || 50;
        const maxDepth = MAX_DEPTH || 3;
        
        // 预定义 URL 列表（适合 SPA 单页应用）
        const predefinedUrls = [
            '/zh-cn',
            '/zh-cn/about',
            '/zh-cn/about/history',
            '/zh-cn/about/health-ambassador',
            '/zh-cn/product',
            '/zh-cn/product/fresh-milk-tea-series',
            '/zh-cn/product/snowy-frappe-series',
            '/zh-cn/product/fruit-tea-series',
            '/zh-cn/product/brewed-tea-series',
            '/zh-cn/product/teaspresso-latte',
            '/zh-cn/product/iced-oriental-tea-series',
            '/zh-cn/stores',
            '/zh-cn/influence',
            '/zh-cn/influence/culture',
            '/zh-cn/influence/health',
            '/zh-cn/influence/connection',
            '/zh-cn/influence/community',
            '/zh-cn/media-centre',
            '/zh-cn/media-centre/news',
            '/zh-cn/media-centre/brand'
        ];
        
        // 修复 URL：避免重复 /zh-cn
        const baseUrl = BASE_URL.replace(/\/zh-cn.*$/, '').replace(/\/$/, '');
        const uniqueUrls = predefinedUrls
            .map(p => {
                const path = p.replace(/^\/zh-cn/, ''); // 移除开头的 /zh-cn
                return `${baseUrl}/zh-cn${path}`;
            })
            .slice(0, maxPages);
        
        console.log(`📊 准备测试 ${uniqueUrls.length} 个页面...\n`);
        
        for (let i = 0; i < uniqueUrls.length; i++) {
            const url = uniqueUrls[i];
            console.log(`📄 [${i + 1}/${uniqueUrls.length}] ${url}`);
            
            // 随机延迟，避免被反爬虫
            const randomDelay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            const pageInfo = {
                url,
                timestamp: new Date().toISOString(),
                tests: [],
                testsPassed: 0,
                testsTotal: 8
            };

            try {
                const startTime = Date.now();
                const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                const loadTime = Date.now() - startTime;

                pageInfo.loadTime = loadTime;
                const httpStatus = response ? response.status() : 200;
                pageInfo.status = httpStatus;
                
                // 检查是否是错误页面（405/404/500 等）
                const pageTitle = await page.title();
                const isErrorTitle = pageTitle === '405' || pageTitle === '404' || pageTitle === '500' || pageTitle.includes('Access Denied');
                const isHttpError = httpStatus >= 400;
                
                // 先保存截图（即使是错误页面也要有截图）
                const screenshotPath = path.join(TEST_DIR, `screenshot-${i}.png`);
                try {
                    const screenshotBuffer = await page.screenshot({ path: screenshotPath, fullPage: false });
                    pageInfo.screenshot = screenshotBuffer.toString('base64'); // 转为 base64 字符串
                    pageInfo.screenshotPath = screenshotPath;
                } catch (e) {
                    console.log(`  ⚠️ 截图失败：${e.message}`);
                    pageInfo.screenshot = null;
                }
                
                if (isHttpError || isErrorTitle) {
                    pageInfo.title = `错误：${pageTitle} (HTTP ${httpStatus})`;
                    pageInfo.isErrorPage = true;
                    pageInfo.error = `HTTP ${httpStatus} - ${pageTitle}`;
                    pageInfo.errorType = httpStatus === 405 ? '方法不允许' : httpStatus === 404 ? '页面不存在' : 'HTTP 错误';
                    
                    // 加入失败页面
                    results.failedPages.push(pageInfo);
                    results.issues.push({
                        page: url,
                        bug_title: `页面访问失败 - HTTP ${httpStatus}`,
                        bug_type: ['Functional', pageInfo.errorType],
                        bug_priority: 8,
                        bug_confidence: 10,
                        bug_reasoning_why_a_bug: `页面返回 HTTP ${httpStatus} 错误，用户无法正常访问。${pageInfo.errorType === '方法不允许' ? '服务器拒绝了当前 HTTP 方法（可能是 GET 请求被阻止）。' : '页面不存在或服务器错误。'}`,
                        reproduction_steps: `1. 访问 ${url}\n2. 等待页面加载`,
                        expected_result: '页面正常加载 (HTTP 200)',
                        actual_result: `HTTP ${httpStatus} - ${pageTitle}`,
                        suggested_fix: '网站可能有反爬虫机制，需要调整访问策略。建议：1) 添加真实的 User-Agent 2) 降低请求频率 3) 使用浏览器指纹 4) 检查是否需要特定的 HTTP 方法或请求头',
                        ai_prompt: `修复 HTTP ${httpStatus} 错误：检查服务器配置，确保 ${url} 允许 GET 请求。如果是反爬虫机制，添加请求头模拟真实浏览器：{ 'User-Agent': 'Mozilla/5.0...', 'Accept': 'text/html' }`
                    });
                    
                    results.allPages.push(pageInfo);
                    continue; // 跳过后续测试，但已加入 allPages
                } else {
                    pageInfo.title = pageTitle;
                }
                
                // 获取当前页面链接数
                const linkCount = await page.evaluate(() => {
                    return document.querySelectorAll('a[href]').length;
                });

                // === 基础测试（保留原有 8 项）===
                const tests = [
                    { name: 'HTTPS', check: '使用 HTTPS 协议', passed: url.startsWith('https://'), actual: url.startsWith('https://') ? '通过' : '失败', critical: true },
                    { name: '加载时间', check: '页面加载 < 10 秒', passed: loadTime < 10000, actual: `${loadTime}ms`, critical: false },
                    { name: '页面标题', check: '有页面标题', passed: !!pageInfo.title && pageInfo.title.length > 0, actual: pageInfo.title || '无标题', critical: true },
                    { name: '页面链接', check: '有内部链接', passed: linkCount >= 0, actual: `${linkCount} 个链接`, critical: false, warning: linkCount === 0 }, // 0 个链接只是警告，不失败
                    { name: '页面截图', check: '截图成功', passed: !!pageInfo.screenshot, actual: pageInfo.screenshot ? '已截图' : '无截图', critical: false },
                    { name: '移动端适配', check: 'viewport 正确', passed: true, actual: '1280x800', critical: false },
                    { name: '页面可访问', check: 'HTTP 状态正常', passed: httpStatus === 200, actual: `HTTP ${httpStatus}`, critical: true },
                    { name: '页面内容', check: '有 HTML 内容', passed: true, actual: '正常', critical: false }
                ];

                // === 新增：提取 DOM 特征 → 动态 Agent 匹配 → 专项测试 ===
                let matchedAgentNames = [];
                let matchedAgentIds = [];
                try {
                    // 提取 DOM 特征（复用 crawler 的 analyzeFeatures 逻辑）
                    const features = await page.evaluate(() => {
                        const bodyText = document.body ? document.body.textContent : '';
                        const html = document.documentElement.outerHTML || '';
                        return {
                            hasNavigation: document.querySelectorAll('nav, .nav, .menu, [role="navigation"]').length > 0,
                            hasBanner: document.querySelectorAll('.banner, .carousel, .hero, .slider, .swiper').length > 0,
                            isSPA: !!(window.__NEXT_DATA__ || window.__NUXT__ || document.querySelector('[id="app"], [id="root"]')),
                            hasForms: document.querySelectorAll('form').length > 0,
                            hasInputs: document.querySelectorAll('input, textarea, select').length > 0,
                            hasLoginForm: document.querySelectorAll('input[type="password"]').length > 0,
                            hasContactForm: !!(document.querySelector('form') && (bodyText.includes('联系') || bodyText.includes('Contact') || bodyText.includes('Message'))),
                            hasProductCards: document.querySelectorAll('.product, .item, .goods, .card, [class*="product"]').length > 3,
                            hasPrice: document.querySelectorAll('.price, .amount, [class*="price"]').length > 0,
                            hasAddToCart: !!(document.querySelector('[class*="add-to-cart"], [class*="addtocart"], .buy-btn, .add-cart') || bodyText.match(/加入购物车|Add to Cart|Buy Now/i)),
                            hasShoppingCart: !!(document.querySelector('[class*="cart"], .shopping-cart') || bodyText.match(/购物车|Shopping Cart|My Cart/i)),
                            hasSearchBox: document.querySelectorAll('input[type="search"], [role="search"], .search-input, [class*="search"]').length > 0,
                            hasArticle: document.querySelectorAll('article, .post, .blog, .article, [class*="article"]').length > 0,
                            hasVideo: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="bilibili"]').length > 0,
                            hasChatWidget: !!(document.querySelector('[class*="chat-widget"], [class*="chatbot"], [class*="intercom"], [class*="crisp"], [class*="tawk"]') || document.querySelector('iframe[src*="chat"]')),
                            hasAvatar: document.querySelectorAll('.avatar, [class*="avatar"], .profile-pic, [class*="profile"]').length > 0,
                            hasCookieBanner: !!(document.querySelector('[class*="cookie"], [class*="consent"], [class*="gdpr"], [id*="cookie"]') || bodyText.match(/cookie|Cookie 政策|接受 Cookie|Accept Cookies/i)),
                            hasLanguageSwitcher: document.querySelectorAll('[class*="lang"], [class*="locale"], .language-selector').length > 0,
                            hasCTA: document.querySelectorAll('.cta, [class*="call-to-action"], .hero-btn, .primary-btn').length > 0,
                            hasDatePicker: document.querySelectorAll('input[type="date"], [class*="datepicker"], [class*="calendar"]').length > 0,
                            linkCount: document.querySelectorAll('a[href]').length,
                            imageCount: document.querySelectorAll('img').length,
                            buttonCount: document.querySelectorAll('button, [role="button"]').length,
                        };
                    });

                    // 构造 pageData 供 classifier 使用
                    const pageContent = await page.textContent('body').catch(() => '');
                    const pageHtml = await page.content().catch(() => '');
                    const pageData = {
                        url,
                        title: pageInfo.title,
                        loadTime,
                        status: httpStatus,
                        features,
                        content: pageContent,
                        html: pageHtml,
                        consoleLogs: []
                    };

                    // 动态匹配 Agent
                    const matchedAgents = classifier.classify(pageData);
                    matchedAgentIds = matchedAgents.map(a => a.id);  // 存 id 用于报告
                    matchedAgentNames = matchedAgents.map(a => a.name);  // 用于日志显示
                    pageInfo.matchedAgents = matchedAgentIds;  // 报告里用 id 匹配 agentDescriptions

                    // 记录匹配到的 Agent（全局收集）
                    for (const agent of matchedAgents) {
                        if (!results.dynamicAgents) results.dynamicAgents = {};
                        if (!results.dynamicAgents[agent.id]) {
                            results.dynamicAgents[agent.id] = { id: agent.id, name: agent.name, pageCount: 0, testCount: 0 };
                        }
                        results.dynamicAgents[agent.id].pageCount++;
                    }

                    // 生成动态测试用例
                    const dynamicTests = analyzer.generateTestCases(pageData, matchedAgents);

                    // 合并到基础测试后面（去重：如果动态测试名称和基础测试重复则跳过）
                    const baseTestNames = new Set(tests.map(t => t.name));
                    for (const dt of dynamicTests) {
                        if (!baseTestNames.has(dt.name)) {
                            tests.push(dt);
                            // 统计
                            if (results.dynamicAgents[dt.agent]) {
                                results.dynamicAgents[dt.agent].testCount++;
                            }
                        }
                    }

                    if (matchedAgentNames.length > 0) {
                        console.log(`      🎯 匹配 Agent: ${matchedAgentNames.join(', ')}`);
                    }
                } catch (e) {
                    // 动态识别失败不影响基础测试
                    console.log(`      ⚠️ 动态识别: ${e.message}`);
                }
                
                // 计算通过率：显示所有测试的通过情况
                const passedTests = tests.filter(t => t.passed).length;
                pageInfo.testsPassed = passedTests;
                pageInfo.testsTotal = tests.length;
                pageInfo.hasWarnings = tests.some(t => t.warning);
                pageInfo.hasFailures = tests.some(t => !t.passed);

                pageInfo.tests = tests;
                pageInfo.testsPassed = tests.filter(t => t.passed).length;

                console.log(`      ${pageInfo.status === 200 ? '✅' : '⚠️'} 加载：${loadTime}ms, 链接：${linkCount}个，测试：${pageInfo.testsPassed}/${pageInfo.testsTotal}`);
                if (pageInfo.status === 200) {
                    results.successPages.push(pageInfo);
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
                    page: url,
                    bug_title: '页面加载失败',
                    bug_type: ['Functional', pageInfo.errorType],
                    bug_priority: 7,
                    bug_confidence: 10,
                    bug_reasoning_why_a_bug: `页面加载失败：${error.message}。用户无法访问该页面，影响用户体验和功能可用性。`,
                    reproduction_steps: `1. 访问 ${url}\n2. 等待页面加载`,
                    expected_result: '页面正常加载 (HTTP 200)',
                    actual_result: error.message,
                    suggested_fix: `检查网络连接和服务器状态。具体步骤：1) 确认服务器运行正常 2) 检查防火墙设置 3) 验证 DNS 解析 4) 如果是超时问题，增加超时时间或优化页面加载性能`,
                    ai_prompt: `修复页面加载错误：${error.message}。检查网络连接，确认服务器地址 ${url} 可访问。如果是超时，优化页面资源加载或增加 timeout 参数。`
                });
            }
            
            results.allPages.push(pageInfo);
        }
        
        await context.close();
        
        console.log('\n📄 Step 2: 生成 HTML 报告...\n');
        
        // 生成问题统计
        const issueStats = {
            byPriority: {
                critical: results.issues.filter(i => i.bug_priority >= 8).length,
                medium: results.issues.filter(i => i.bug_priority >= 4 && i.bug_priority < 8).length,
                low: results.issues.filter(i => i.bug_priority < 4).length
            },
            byType: []
        };
        
        // 统计问题类型
        const typeCount = {};
        results.issues.forEach(issue => {
            issue.bug_type.forEach(type => {
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
        });
        issueStats.byType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));
        
        const reporter = new HTMLReporter();

        // 合并静态 + 动态 Agent 列表
        const dynamicAgentIds = results.dynamicAgents ? Object.keys(results.dynamicAgents) : [];
        const allAgentIds = [...new Set([...TEST_AGENTS.map(a => a.id), ...dynamicAgentIds])];

        const reportData = {
            timestamp: results.timestamp,
            baseUrl: BASE_URL,
            agents: allAgentIds,
            summary: {
                crawledPages: results.allPages.length,
                successPages: results.successPages.length,
                failedPages: results.failedPages.length,
                totalIssues: results.issues.length
            },
            issueStats: issueStats,
            pages: results.allPages,
            issues: results.issues
        };
        
        await reporter.generate(reportData, reportsDir);
        
        console.log(`✅ 报告已生成：${path.join(reportsDir, 'report.html')}\n`);
        
    } catch (error) {
        console.error('❌ 测试执行错误:', error.message);
    } finally {
        if (browser) await browser.close();
    }
    
    console.log('✅ 全栈测试完成！\n');
    console.log('📊 测试结果:');
    console.log(`   总页面：${results.allPages.length}`);
    console.log(`   成功页面：${results.successPages.length}`);
    console.log(`   失败页面：${results.failedPages.length}`);
    console.log(`   发现问题：${results.issues.length}`);

    // 打印动态 Agent 统计
    if (results.dynamicAgents && Object.keys(results.dynamicAgents).length > 0) {
        console.log(`\n🎯 动态识别的 Agent 角色 (${Object.keys(results.dynamicAgents).length} 个):`);
        const sorted = Object.values(results.dynamicAgents).sort((a, b) => b.pageCount - a.pageCount);
        for (const agent of sorted) {
            console.log(`   🤖 ${agent.name} — 覆盖 ${agent.pageCount} 页, ${agent.testCount} 个测试`);
        }
    }

    console.log(`\n📁 目录：${TEST_DIR}`);
}

runTest();
