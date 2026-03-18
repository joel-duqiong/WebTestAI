/**
 * Hybrid Test v3.0 - OpenClaw 技能入口
 * 核心改进：爬取与分析完全分离
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
 * 创建测试会话（仅爬取）
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

    console.log('🧪 创建测试会话 v3.0...');
    console.log(`📄 起始 URL: ${url}`);
    console.log(`📊 最大页面：${maxPages}`);
    console.log(`💾 保存目录：${saveDir}`);
    console.log('');

    const sessionId = crypto.createHash('md5').update(`${url}-${Date.now()}`).digest('hex').substring(0, 8);
    const storage = new DataStorage(saveDir);
    const crawler = new PageCrawler({ baseUrl: url, maxPages, timeout, viewport });

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
                
                // 添加新链接到队列
                result.links.forEach(link => {
                    if (!visited.has(link) && !toVisit.includes(link)) {
                        toVisit.push(link);
                    }
                });
            } else {
                console.log(`      ❌ 失败：${result.error || result.status}`);
            }
        }

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
        console.log('\n💡 下一步：使用 analyze() 添加 Agent 分析');
        console.log(`   示例：await testSession.analyze(['mia', 'sophia'])\n`);

        return {
            sessionId,
            baseUrl: url,
            pagesCount: pages.length,
            storage,
            
            /**
             * 添加 Agent 分析
             */
            analyze: async (agents = [], options = {}) => {
                const {
                    useLLM = false,
                    llmProvider = 'openai',
                    llmApiKey = process.env.LLM_API_KEY
                } = options;

                console.log(`\n🤖 添加 Agent 分析：${agents.join(', ')}`);
                
                // 加载页面数据
                const session = await storage.loadSession(sessionId);
                const analyzer = new PageAnalyzer({ agents });
                
                const analysisResults = [];
                const updatedPages = [];
                
                // 为每个页面生成测试用例
                for (const page of session.pages) {
                    if (page.status === 200) {
                        // 生成测试用例
                        const tests = analyzer.generateTestCases(page);
                        
                        updatedPages.push({
                            ...page,
                            tests,
                            testsPassed: tests.filter(t => t.passed).length,
                            testsTotal: tests.length
                        });
                        
                        console.log(`   📄 ${page.url.substring(0, 50)}... - 测试：${tests.filter(t => t.passed).length}/${tests.length}`);
                    } else {
                        updatedPages.push(page);
                    }
                }
                
                // 使用 LLM 分析（可选）
                if (useLLM && llmApiKey) {
                    const llm = new LLMIntegration({
                        provider: llmProvider,
                        apiKey: llmApiKey
                    });
                    
                    for (const page of updatedPages) {
                        if (page.status === 200) {
                            const llmResults = await llm.analyzeMultipleAgents(
                                page,
                                agents,
                                analyzer.prompts
                            );
                            analysisResults.push(...llmResults);
                        }
                    }
                }
                
                // 保存更新后的页面数据（包含测试用例）
                const pagesDir = path.join(storage.baseDir, sessionId, 'pages');
                for (const [index, page] of updatedPages.entries()) {
                    const pagePath = path.join(pagesDir, `page-${index}.json`);
                    const pageData = {
                        url: page.url,
                        title: page.title,
                        loadTime: page.loadTime,
                        status: page.status,
                        features: page.features,
                        consoleLogs: page.consoleLogs,
                        links: page.links,
                        screenshot: page.screenshot ? page.screenshot.toString('base64') : null,
                        html: page.html,
                        tests: page.tests,
                        testsPassed: page.testsPassed,
                        testsTotal: page.testsTotal
                    };
                    fs.writeFileSync(pagePath, JSON.stringify(pageData, null, 2));
                }
                
                // 保存分析结果
                for (const agent of agents) {
                    await storage.saveAnalysis(sessionId, agent, analysisResults);
                }
                
                console.log(`✅ 分析完成，测试用例已保存`);
                return updatedPages;
            },

            /**
             * 生成报告
             */
            report: async (options = {}) => {
                const {
                    format = ['html'],
                    outputDir = './reports'
                } = options;

                console.log(`\n📄 生成报告...`);
                
                // 重新加载页面数据（包含测试用例）
                const session = await storage.loadSession(sessionId);
                const analysisResults = await storage.loadAnalysis(sessionId);
                
                // 去重和聚合
                const deduplicator = new ResultDeduplicator();
                const allIssues = [];
                
                // 收集所有问题
                for (const result of analysisResults) {
                    if (result.llmAnalysis) {
                        allIssues.push(...result.llmAnalysis);
                    }
                }
                
                const dedupedIssues = deduplicator.deduplicate(allIssues);
                const issueStats = deduplicator.generateStats(dedupedIssues);
                
                // 从分析结果文件名提取 Agent 名称
                const analysisDir = path.join(storage.baseDir, sessionId, 'analysis');
                let uniqueAgents = [];
                if (fs.existsSync(analysisDir)) {
                    const files = fs.readdirSync(analysisDir).filter(f => f.endsWith('.json'));
                    uniqueAgents = Array.from(new Set(files.map(f => {
                        const match = f.match(/^([^-]+)-\d+\.json$/);
                        return match ? match[1] : null;
                    }).filter(Boolean)));
                }
                
                const results = {
                    timestamp: session.timestamp,
                    baseUrl: session.baseUrl,
                    summary: {
                        crawledPages: session.pages.length,
                        successPages: session.pages.filter(p => p.status === 200).length,
                        failedPages: session.pages.filter(p => p.status !== 200).length,
                        totalIssues: dedupedIssues.length,
                        llmIssues: dedupedIssues.length
                    },
                    pages: session.pages,
                    issues: dedupedIssues,
                    agents: uniqueAgents,
                    issueStats
                };

                const reportPaths = {};

                // 生成 HTML 报告
                if (format.includes('html')) {
                    const HTMLReporter = require('../html-reporter');
                    const reporter = new HTMLReporter();
                    reportPaths.html = await reporter.generate(results, outputDir);
                }

                // 生成 PDF 报告
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

            /**
             * 清理会话
             */
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
 * 快速测试（兼容 v2.0 API）
 */
async function execute(options = {}) {
    const {
        url,
        maxPages = 30,
        agents = ['mia', 'sophia', 'tariq'],
        saveDir = './test-data',
        exportPDF = true
    } = options;

    const session = await createSession({ url, maxPages, saveDir });
    await session.analyze(agents);
    const reportPaths = await session.report({ format: ['html', 'pdf'], exportPDF });
    
    return { session, reportPaths };
}

module.exports = {
    createSession,
    execute
};
