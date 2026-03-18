/**
 * @module HybridTestSkill
 * @description Hybrid Test v3.1 - OpenClaw 技能入口
 *
 * 核心职责：
 * 1. 作为 OpenClaw 技能对外暴露统一接口
 * 2. 编排完整测试流程：爬取 → 分析 → 去重 → 报告 → PDF 导出
 * 3. 封装 PageCrawler、PageAnalyzer、HTMLReporter 等组件
 * 4. 支持 33 个 OpenTestAI Agent + 动态页面类型识别
 *
 * 对外接口：
 * - execute(options): 执行完整测试流程
 * - generateReport(results): 生成 HTML/PDF 报告
 *
 * @version 3.1
 */

const PageCrawler = require('../crawler');
const PageAnalyzer = require('../analyzer');
const DataStorage = require('../storage');
const ResultDeduplicator = require('../deduplication');
const PDFExporter = require('../pdf-exporter');
const LLMIntegration = require('../llm-integration');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * 创建测试会话
 */
async function createSession(options = {}) {
    const {
        url,
        maxPages = 50,
        timeout = 15000,
        viewport = { width: 1280, height: 800 },
        saveDir = './test-data'
    } = options;

    if (!url) {
        throw new Error('缺少必需参数：url');
    }

    console.log('🧪 创建测试会话 v3.1（动态 Agent 识别）...');
    console.log(`📄 起始 URL: ${url}`);
    console.log(`📊 最大页面：${maxPages}`);
    console.log(`💾 保存目录：${saveDir}`);
    console.log('');

    const sessionId = crypto.createHash('md5').update(`${url}-${Date.now()}`).digest('hex').substring(0, 8);
    const storage = new DataStorage(saveDir);
    const crawler = new PageCrawler({ baseUrl: url, maxPages, timeout, viewport });
    const analyzer = new PageAnalyzer();

    const testStartTime = new Date();  // 记录测试开始时间

    try {
        // 启动浏览器
        console.log('🕷️  Step 1: 启动浏览器...');
        await crawler.launch();

        // 爬取页面
        console.log('🕷️  Step 2: 爬取页面...\n');
        const pages = [];
        const visited = new Set();
        const toVisit = [url];

        while (toVisit.length > 0 && visited.size < maxPages) {
            const pageUrl = toVisit.shift();
            const normalizedUrl = pageUrl.split('#')[0];
            if (visited.has(normalizedUrl)) continue;

            visited.add(normalizedUrl);
            console.log(`📄 [${visited.size}/${maxPages}] ${normalizedUrl}`);

            const result = await crawler.crawlPage(normalizedUrl);
            pages.push(result);

            if (result.status === 200) {
                console.log(`      ✅ 加载：${result.loadTime}ms, 链接：${result.links.length}`);

                result.links.forEach(link => {
                    if (!visited.has(link) && !toVisit.includes(link)) {
                        toVisit.push(link);
                    }
                });
            } else {
                console.log(`      ❌ 失败：${result.error || result.status}`);
            }
        }

        // 关闭浏览器
        await crawler.close();

        // 保存会话数据
        console.log('\n💾 Step 3: 保存会话数据...\n');
        const sessionData = {
            id: sessionId,
            baseUrl: url,
            timestamp: new Date().toISOString(),
            maxPages,
            pages
        };

        await storage.saveSession(sessionData);

        console.log('\n✅ 会话创建完成！\n');
        console.log('📊 爬取结果:');
        console.log(`   会话 ID: ${sessionId}`);
        console.log(`   爬取页面：${pages.length}`);
        console.log(`   成功页面：${pages.filter(p => p.status === 200).length}`);
        console.log(`   失败页面：${pages.filter(p => p.status !== 200).length}`);
        console.log('');

        return {
            sessionId,
            baseUrl: url,
            pagesCount: pages.length,
            storage,

            /**
             * 动态 Agent 分析
             * @param {Array} agents - 可选，指定 Agent ID 列表。为空则自动识别
             * @param {Object} options - useLLM, llmProvider, llmApiKey
             */
            analyze: async (agents = [], analyzeOptions = {}) => {
                const {
                    useLLM = false,
                    llmProvider = 'bailian',
                    llmApiKey = process.env.LLM_API_KEY
                } = analyzeOptions;

                const session = await storage.loadSession(sessionId);
                const updatedPages = [];
                const analysisResults = [];
                const agentStats = {};  // 统计每个 Agent 被调用的次数

                console.log('\n🤖 Step 4: 动态 Agent 分析...\n');

                for (const page of session.pages) {
                    if (page.status !== 200) {
                        updatedPages.push(page);
                        continue;
                    }

                    // 动态识别页面类型，匹配 Agent
                    const matchedAgents = analyzer.classifyPage(page);
                    const agentNames = matchedAgents.map(a => a.id);

                    // 统计
                    for (const a of matchedAgents) {
                        agentStats[a.id] = (agentStats[a.id] || 0) + 1;
                    }

                    // 生成动态测试用例
                    const tests = analyzer.generateTestCases(page, matchedAgents);
                    const passed = tests.filter(t => t.passed).length;

                    updatedPages.push({
                        ...page,
                        matchedAgents: agentNames,
                        tests,
                        testsPassed: passed,
                        testsTotal: tests.length
                    });

                    const shortUrl = page.url.length > 55 ? page.url.substring(0, 55) + '...' : page.url;
                    console.log(`   📄 ${shortUrl}`);
                    console.log(`      🎯 匹配 Agent: ${agentNames.join(', ')}`);
                    console.log(`      📋 测试用例：${passed}/${tests.length}`);

                    // LLM 深度分析（可选）
                    if (useLLM && llmApiKey) {
                        const llm = new LLMIntegration({
                            provider: llmProvider,
                            apiKey: llmApiKey
                        });

                        for (const agent of matchedAgents) {
                            const prompt = analyzer.buildPrompt(agent.id, page);
                            if (prompt) {
                                try {
                                    const llmResult = await llm.analyze(prompt, page);
                                    analysisResults.push({
                                        agent: agent.id,
                                        url: page.url,
                                        llmAnalysis: llmResult
                                    });
                                } catch (e) {
                                    console.log(`      ⚠️ LLM 分析失败 (${agent.id}): ${e.message}`);
                                }
                            }
                        }
                    }
                }

                // 保存更新后的页面数据
                const pagesDir = path.join(storage.baseDir, sessionId, 'pages');
                if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

                for (const [index, page] of updatedPages.entries()) {
                    const pagePath = path.join(pagesDir, `page-${index}.json`);
                    const pageData = {
                        url: page.url,
                        title: page.title || '',  // 确保 title 存在
                        loadTime: page.loadTime,
                        status: page.status,
                        features: page.features,
                        consoleLogs: page.consoleLogs,
                        links: page.links,
                        screenshot: page.screenshot && Buffer.isBuffer(page.screenshot) ? page.screenshot.toString('base64') : (page.screenshot || null),
                        matchedAgents: page.matchedAgents,
                        tests: page.tests,
                        testsPassed: page.testsPassed,
                        testsTotal: page.testsTotal
                    };
                    fs.writeFileSync(pagePath, JSON.stringify(pageData, null, 2), 'utf8');
                }

                // 保存分析结果
                const allAgentIds = [...new Set(updatedPages.flatMap(p => p.matchedAgents || []))];
                for (const agentId of allAgentIds) {
                    await storage.saveAnalysis(sessionId, agentId, analysisResults.filter(r => r.agent === agentId));
                }

                // 打印 Agent 统计
                console.log('\n📊 Agent 调用统计:');
                const sorted = Object.entries(agentStats).sort((a, b) => b[1] - a[1]);
                for (const [id, count] of sorted) {
                    console.log(`   ${id}: ${count} 页`);
                }

                const totalTests = updatedPages.reduce((sum, p) => sum + (p.testsTotal || 0), 0);
                const totalPassed = updatedPages.reduce((sum, p) => sum + (p.testsPassed || 0), 0);
                console.log(`\n✅ 分析完成！共 ${totalTests} 个测试用例，通过 ${totalPassed}/${totalTests}`);

                return updatedPages;
            },

            /**
             * 生成报告
             */
            report: async (reportOptions = {}) => {
                const {
                    format = ['html'],
                    outputDir = './reports'
                } = reportOptions;

                console.log(`\n📄 生成报告...`);

                const session = await storage.loadSession(sessionId);
                const analysisResults = await storage.loadAnalysis(sessionId);

                const deduplicator = new ResultDeduplicator();
                const allIssues = [];

                for (const result of analysisResults) {
                    if (result.llmAnalysis) {
                        allIssues.push(...result.llmAnalysis);
                    }
                }

                const dedupedIssues = deduplicator.deduplicate(allIssues);
                const issueStats = deduplicator.generateStats(dedupedIssues);

                // 收集所有参与的 Agent
                const allAgents = [...new Set(
                    session.pages
                        .filter(p => p.matchedAgents)
                        .flatMap(p => p.matchedAgents)
                )];

                const testEndTime = new Date();  // 记录测试结束时间

                // 从文件重新加载页面数据（包含 screenshot）
                const pagesDir = path.join(storage.baseDir, sessionId, 'pages');
                const reportPages = [];
                if (fs.existsSync(pagesDir)) {
                    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
                    for (const file of files) {
                        const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf8'));
                        reportPages.push({
                            ...pageData,
                            html: undefined,
                            content: undefined
                        });
                    }
                }

                const results = {
                    timestamp: session.timestamp,
                    baseUrl: session.baseUrl,
                    summary: {
                        crawledPages: session.pages.length,
                        successPages: session.pages.filter(p => p.status === 200).length,
                        failedPages: session.pages.filter(p => p.status !== 200).length,
                        totalIssues: dedupedIssues.length,
                        totalAgents: allAgents.length
                    },
                    pages: reportPages,
                    issues: dedupedIssues,
                    agents: allAgents,
                    issueStats
                };

                const reportPaths = {};

                // 添加测试时间
                results.testStartTime = testStartTime.toISOString();
                results.testEndTime = testEndTime.toISOString();

                if (format.includes('html')) {
                    const HTMLReporter = require('../html-reporter');
                    const reporter = new HTMLReporter();
                    reportPaths.html = await reporter.generate(results, outputDir);
                }

                if (format.includes('pdf')) {
                    const pdfExporter = new PDFExporter();
                    const pdfPath = `${outputDir}/report-${sessionId}.pdf`;
                    reportPaths.pdf = await pdfExporter.generatePDF(results, pdfPath);
                }

                console.log(`✅ 报告已生成`);
                console.log(`   HTML: ${reportPaths.html || '未生成'}`);
                console.log(`   PDF: ${reportPaths.pdf || '未生成'}`);

                return reportPaths;
            },

            cleanup: async () => {
                storage.deleteSession(sessionId);
                console.log(`🗑️ 会话已清理：${sessionId}`);
            }
        };

    } catch (error) {
        console.error('❌ 创建会话失败:', error.message);
        await crawler.close();
        throw error;
    }
}

/**
 * 快速测试
 */
async function execute(options = {}) {
    const { url, maxPages = 30, saveDir = './test-data', exportPDF = true } = options;

    const session = await createSession({ url, maxPages, saveDir });
    await session.analyze();  // 自动识别 Agent
    const reportPaths = await session.report({ format: ['html', exportPDF ? 'pdf' : null].filter(Boolean) });

    return { session, reportPaths };
}

module.exports = { createSession, execute };
