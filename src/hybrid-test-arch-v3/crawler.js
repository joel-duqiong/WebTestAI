/**
 * @module PageCrawler
 * @description 混合测试架构 - 基础爬取层 (Playwright)
 *
 * 核心职责：
 * 1. 启动/关闭 Playwright 浏览器实例
 * 2. 爬取单个页面：导航、截图、提取 DOM 特征、收集链接
 * 3. 批量爬取多个页面
 * 4. 智能爬取：自动发现链接并递归爬取
 *
 * 提取的页面特征包括：导航、Banner、表单、搜索框、商品卡片、
 * 视频、聊天组件、Cookie Banner、语言切换器等 20+ 种特征
 *
 * @version 3.0
 */

const { chromium } = require('playwright');

/**
 * 页面爬取器
 * @class PageCrawler
 */
class PageCrawler {
    /**
     * 初始化爬取器
     * @param {Object} options - 配置选项
     * @param {string} [options.baseUrl] - 目标网站基础 URL
     * @param {number} [options.maxPages=50] - 最大爬取页面数
     * @param {Object} [options.viewport] - 浏览器视口大小，默认 1280x800
     * @param {number} [options.timeout=15000] - 页面加载超时时间（毫秒）
     */
    constructor(options = {}) {
        /** @type {string} 目标网站基础 URL */
        this.baseUrl = options.baseUrl || 'https://example.com';
        /** @type {number} 最大爬取页面数 */
        this.maxPages = options.maxPages || 50;
        /** @type {Object} 浏览器视口大小 {width, height} */
        this.viewport = options.viewport || { width: 1280, height: 800 };
        /** @type {number} 页面加载超时时间（毫秒） */
        this.timeout = options.timeout || 15000;
        /** @type {Browser|null} Playwright 浏览器实例 */
        this.browser = null;
        /** @type {BrowserContext|null} 浏览器上下文 */
        this.context = null;
    }

    /**
     * 启动 Chromium 浏览器
     * 配置 headless 模式、禁用沙盒、设置视口和 User-Agent
     * @returns {PageCrawler} 返回自身实例（链式调用）
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
     * 关闭浏览器上下文和浏览器实例
     * 释放资源
     */
    async close() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }

    /**
     * 爬取单个页面
     * 导航到指定 URL，收集页面信息、截图、提取 DOM 特征
     * @param {string} url - 目标页面 URL
     * @returns {Object} 页面爬取结果，包含 url、title、content、screenshot、features 等
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
     * 收集页面中的同域名链接
     * 在页面中执行 JavaScript，提取所有 <a href> 的绝对 URL
     * @param {Page} page - Playwright Page 实例
     * @param {string} baseUrl - 基础 URL（用于过滤同域名链接）
     * @returns {Array<string>} 同域名链接列表
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
     * 分析页面 DOM 特征
     * 在页面中执行 JavaScript，检测 20+ 种特征：
     * - 导航、Banner、SPA 框架
     * - 表单、登录框、搜索框
     * - 电商相关（商品卡片、价格、购物车）
     * - 内容相关（文章、视频）
     * - 社交相关（聊天组件、头像）
     * - 合规相关（Cookie Banner、语言切换器）
     * @param {Page} page - Playwright Page 实例
     * @returns {Object} 特征检测结果，包含布尔值和计数
     */
    async analyzeFeatures(page) {
        try {
            const features = await page.evaluate(() => {
                const bodyText = document.body ? document.body.textContent : '';
                const html = document.documentElement.outerHTML || '';
                return {
                    // 基础特征
                    hasNavigation: document.querySelectorAll('nav, .nav, .menu, [role="navigation"]').length > 0,
                    hasBanner: document.querySelectorAll('.banner, .carousel, .hero, .slider, .swiper').length > 0,
                    isSPA: !!(window.__NEXT_DATA__ || window.__NUXT__ || document.querySelector('[id="app"], [id="root"]')),

                    // 表单相关
                    hasForms: document.querySelectorAll('form').length > 0,
                    hasInputs: document.querySelectorAll('input, textarea, select').length > 0,
                    hasLoginForm: document.querySelectorAll('input[type="password"]').length > 0,
                    hasContactForm: !!(document.querySelector('form') &&
                        (bodyText.includes('联系') || bodyText.includes('Contact') || bodyText.includes('Message'))),

                    // 电商相关
                    hasProductCards: document.querySelectorAll('.product, .item, .goods, .card, [class*="product"]').length > 3,
                    hasPrice: document.querySelectorAll('.price, .amount, [class*="price"]').length > 0,
                    hasAddToCart: !!(document.querySelector('[class*="add-to-cart"], [class*="addtocart"], .buy-btn, .add-cart') ||
                        bodyText.match(/加入购物车|Add to Cart|Buy Now/i)),
                    hasShoppingCart: !!(document.querySelector('[class*="cart"], .shopping-cart') ||
                        bodyText.match(/购物车|Shopping Cart|My Cart/i)),

                    // 搜索相关
                    hasSearchBox: document.querySelectorAll('input[type="search"], [role="search"], .search-input, [class*="search"]').length > 0,

                    // 内容相关
                    hasArticle: document.querySelectorAll('article, .post, .blog, .article, [class*="article"]').length > 0,
                    hasVideo: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="bilibili"]').length > 0,

                    // 社交相关
                    hasChatWidget: !!(document.querySelector('[class*="chat-widget"], [class*="chatbot"], [class*="intercom"], [class*="crisp"], [class*="tawk"]') ||
                        document.querySelector('iframe[src*="chat"]')),
                    hasAvatar: document.querySelectorAll('.avatar, [class*="avatar"], .profile-pic, [class*="profile"]').length > 0,

                    // 合规相关
                    hasCookieBanner: !!(document.querySelector('[class*="cookie"], [class*="consent"], [class*="gdpr"], [id*="cookie"]') ||
                        bodyText.match(/cookie|Cookie 政策|接受 Cookie|Accept Cookies/i)),
                    hasLanguageSwitcher: document.querySelectorAll('[class*="lang"], [class*="locale"], .language-selector').length > 0,

                    // CTA
                    hasCTA: document.querySelectorAll('.cta, [class*="call-to-action"], .hero-btn, .primary-btn').length > 0,

                    // 日期选择器
                    hasDatePicker: document.querySelectorAll('input[type="date"], [class*="datepicker"], [class*="calendar"]').length > 0,

                    // 页面内容关键词
                    hasAbout: bodyText.includes('关于') || bodyText.includes('简介') || bodyText.includes('About'),
                    hasContact: bodyText.includes('联系') || bodyText.includes('电话') || bodyText.includes('Contact'),
                    hasLogin: bodyText.includes('登录') || bodyText.includes('注册') || bodyText.includes('Login'),
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
     * 批量爬取多个页面
     * 按顺序爬取 URL 列表，支持进度回调
     * @param {Array<string>} urls - URL 列表
     * @param {Function} [onProgress] - 进度回调函数，参数为 {current, total, url, result}
     * @returns {Array<Object>} 所有页面的爬取结果
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
     * 从起始 URL 开始，自动发现页面中的链接并递归爬取
     * 使用队列管理待爬取 URL，自动去重，直到达到 maxPages 限制
     * @param {string} startUrl - 起始 URL
     * @param {Function} [onProgress] - 进度回调函数
     * @returns {Array<Object>} 所有爬取页面的结果
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
