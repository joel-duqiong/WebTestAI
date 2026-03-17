/**
 * 混合测试架构 - 基础爬取层 (Playwright)
 * 负责：页面导航、链接收集、截图、DOM 抓取
 */

const { chromium } = require('playwright');

class PageCrawler {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://example.com';
        this.maxPages = options.maxPages || 50;
        this.viewport = options.viewport || { width: 1280, height: 800 };
        this.timeout = options.timeout || 15000;
        this.browser = null;
        this.context = null;
    }

    /**
     * 启动浏览器
     */
    async launch() {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        this.context = await this.browser.newContext({
            viewport: this.viewport,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        return this;
    }

    /**
     * 关闭浏览器
     */
    async close() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }

    /**
     * 爬取单个页面
     */
    async crawlPage(url) {
        const page = await this.context.newPage();
        const result = {
            url,
            timestamp: new Date().toISOString(),
            status: null,
            loadTime: 0,
            title: null,
            content: null,
            html: null,
            links: [],
            screenshot: null,
            consoleLogs: [],
            features: {},
            error: null
        };

        try {
            const startTime = Date.now();
            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeout
            });

            result.loadTime = Date.now() - startTime;
            result.status = response ? response.status() : 200;

            // 等待页面稳定
            await page.waitForTimeout(2000);

            // 收集页面信息
            result.title = await page.title();
            result.content = await page.textContent('body');
            result.html = await page.content();

            // 收集链接
            result.links = await this.collectLinks(page, this.baseUrl);

            // 收集控制台日志
            page.on('console', msg => {
                result.consoleLogs.push({
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now()
                });
            });

            // 截图 (保存为 Buffer)
            result.screenshot = await page.screenshot({ type: 'png', fullPage: false });
            result.screenshotBuffer = result.screenshot; // 保存 Buffer 用于报告

            // 分析页面特征
            result.features = await this.analyzeFeatures(page);

        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
        }

        await page.close();
        return result;
    }

    /**
     * 收集页面链接
     */
    async collectLinks(page, baseUrl) {
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

            // 过滤同域名链接
            return links.filter(link => {
                try {
                    return new URL(link).origin === new URL(baseUrl).origin;
                } catch (e) {
                    return false;
                }
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * 分析页面特征
     */
    async analyzeFeatures(page) {
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
                    hasArticle: document.querySelectorAll('article, .post, .blog').length > 0,
                    hasContact: bodyText.includes('联系') || bodyText.includes('电话') || bodyText.includes('Contact'),
                    hasAbout: bodyText.includes('关于') || bodyText.includes('简介') || bodyText.includes('About'),
                    hasLogin: bodyText.includes('登录') || bodyText.includes('注册') || bodyText.includes('Login'),
                    isSPA: !!window.__NEXT_DATA__
                };
            });

            features.linkCount = await page.$$('a[href]').then(els => els.length);
            features.imageCount = await page.$$('img').then(els => els.length);
            features.buttonCount = await page.$$('button, [role="button"]').then(els => els.length);

            return features;
        } catch (e) {
            return {};
        }
    }

    /**
     * 爬取多个页面
     */
    async crawlMultiplePages(urls, onProgress = null) {
        const results = [];
        const visited = new Set();

        for (let i = 0; i < urls.length && i < this.maxPages; i++) {
            const url = urls[i];
            if (visited.has(url)) continue;
            visited.add(url);

            const result = await this.crawlPage(url);
            results.push(result);

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: Math.min(urls.length, this.maxPages),
                    url,
                    result
                });
            }
        }

        return results;
    }

    /**
     * 智能爬取（自动发现链接）
     */
    async crawlSmart(startUrl, onProgress = null) {
        const visited = new Set();
        const toVisit = [startUrl];
        const results = [];

        while (toVisit.length > 0 && visited.size < this.maxPages) {
            const url = toVisit.shift();
            const normalizedUrl = url.split('#')[0];
            if (visited.has(normalizedUrl)) continue;

            visited.add(normalizedUrl);
            const result = await this.crawlPage(normalizedUrl);
            results.push(result);

            // 添加新链接到队列
            result.links.forEach(link => {
                if (!visited.has(link) && !toVisit.includes(link)) {
                    toVisit.push(link);
                }
            });

            if (onProgress) {
                onProgress({
                    current: visited.size,
                    total: this.maxPages,
                    url: normalizedUrl,
                    result
                });
            }
        }

        return results;
    }
}

module.exports = PageCrawler;
