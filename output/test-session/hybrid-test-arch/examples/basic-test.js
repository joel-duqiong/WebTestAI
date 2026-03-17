/**
 * 混合测试架构 - 基础使用示例
 */

const PageCrawler = require('../core/crawler');
const PageAnalyzer = require('../core/analyzer');

async function basicTest() {
    console.log('🧪 启动混合测试示例...\n');

    const crawler = new PageCrawler({
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 15000
    });

    const analyzer = new PageAnalyzer({
        agents: ['mia', 'sophia', 'tariq']
    });

    try {
        // 启动浏览器
        await crawler.launch();

        // 爬取页面
        const pages = await crawler.crawlSmart('https://example.com', (progress) => {
            console.log(`📄 [${progress.current}/${progress.total}] ${progress.url}`);
        });

        console.log(`\n✅ 爬取完成：${pages.length} 个页面\n`);

        // 分析页面
        for (const page of pages) {
            if (page.status === 200) {
                console.log(`🤖 分析：${page.url}`);
                
                // 生成测试用例
                const tests = analyzer.generateTestCases(page);
                console.log(`   测试：${tests.filter(t => t.passed).length}/${tests.length}\n`);
            }
        }

        console.log('✅ 测试完成！');

    } finally {
        await crawler.close();
    }
}

// 运行示例
basicTest().catch(console.error);
