/**
 * @module PageClassifier
 * @description 页面类型识别器 - WebTestAI 的核心调度组件
 *
 * 负责根据 URL 模式、DOM 特征、页面内容自动识别页面类型，
 * 并返回匹配的测试 Agent 列表。系统内置 33 个 Agent：
 * - 页面类型 Agent（20个）：根据 URL 和 DOM 特征条件匹配
 * - 通用 Agent（7个）：对所有页面生效或按条件触发
 * - 合规/专项 Agent（6个）：按特定条件触发
 *
 * @version 3.1
 */

/**
 * 页面类型识别器类
 * @class PageClassifier
 */
class PageClassifier {
    /**
     * 初始化识别器，注册 33 个 Agent 及其匹配规则
     * @constructor
     */
    constructor() {
        /**
         * 33 个 OpenTestAI Agent 配置列表
         * 每个 Agent 包含 id、name、prompt 文件名和 match 匹配函数
         * @type {Array<{id: string, name: string, prompt: string, match?: Function, universal?: boolean}>}
         */
        this.agents = [
            {
                id: 'homepage',
                name: '首页测试员',
                prompt: 'homepage.md',
                match: (page) => this.isHomepage(page)
            },
            {
                id: 'about-pages',
                name: '关于页面测试员',
                prompt: 'about-pages.md',
                match: (page) => this.matchUrl(page, /\/(about|关于|who-we-are|our-story|our-team)/i)
            },
            {
                id: 'contact-pages',
                name: '联系页面测试员',
                prompt: 'contact-pages.md',
                match: (page) => this.matchUrl(page, /\/(contact|联系|reach-us|get-in-touch|support)/i) ||
                    this.hasFeature(page, 'hasContactForm')
            },
            {
                id: 'pricing-pages',
                name: '定价页面测试员',
                prompt: 'pricing-pages.md',
                match: (page) => this.matchUrl(page, /\/(pricing|价格|plans|subscription)/i) ||
                    this.contentMatch(page, /pricing|plan|subscribe|月付|年付|免费|premium/i)
            },
            {
                id: 'landing-pages',
                name: '落地页测试员',
                prompt: 'landing-pages.md',
                match: (page) => this.matchUrl(page, /\/(lp|landing|campaign|promo|offer)/i) ||
                    (this.hasFeature(page, 'hasCTA') && this.hasFeature(page, 'hasBanner'))
            },
            {
                id: 'product-catalog',
                name: '产品目录测试员',
                prompt: 'product-catalog.md',
                match: (page) => this.matchUrl(page, /\/(products|catalog|shop|store|商品|分类|category|collection)/i) ||
                    this.hasFeature(page, 'hasProductCards')
            },
            {
                id: 'product-details',
                name: '产品详情测试员',
                prompt: 'product-details.md',
                match: (page) => this.matchUrl(page, /\/(product|item|goods)\/[^/]+$/i) ||
                    this.hasFeature(page, 'hasAddToCart')
            },
            {
                id: 'shopping-cart',
                name: '购物车测试员',
                prompt: 'shopping-cart.md',
                match: (page) => this.matchUrl(page, /\/(cart|basket|购物车|bag)/i)
            },
            {
                id: 'checkout',
                name: '结账流程测试员',
                prompt: 'checkout.md',
                match: (page) => this.matchUrl(page, /\/(checkout|payment|order|结算|支付)/i)
            },
            {
                id: 'signup',
                name: '注册流程测试员',
                prompt: 'signup.md',
                match: (page) => this.matchUrl(page, /\/(signup|register|注册|join|create-account|login|登录|sign-in)/i) ||
                    this.hasFeature(page, 'hasLoginForm')
            },
            {
                id: 'search-box',
                name: '搜索框测试员',
                prompt: 'search-box.md',
                match: (page) => this.hasFeature(page, 'hasSearchBox')
            },
            {
                id: 'search-results',
                name: '搜索结果测试员',
                prompt: 'search-results.md',
                match: (page) => this.matchUrl(page, /[?&](q|query|search|keyword|s)=/i) ||
                    this.matchUrl(page, /\/search/i)
            },
            {
                id: 'news',
                name: '新闻页面测试员',
                prompt: 'news.md',
                match: (page) => this.matchUrl(page, /\/(news|blog|article|post|新闻|博客|资讯)/i) ||
                    this.contentMatch(page, /<article|<time|datetime/i)
            },
            {
                id: 'video',
                name: '视频测试员',
                prompt: 'video.md',
                match: (page) => this.hasFeature(page, 'hasVideo') ||
                    this.contentMatch(page, /<video|<iframe.*youtube|<iframe.*vimeo|<iframe.*bilibili/i)
            },
            {
                id: 'social-feed',
                name: '社交动态测试员',
                prompt: 'social-feed.md',
                match: (page) => this.matchUrl(page, /\/(feed|timeline|stream|动态)/i)
            },
            {
                id: 'social-profiles',
                name: '社交资料测试员',
                prompt: 'social-profiles.md',
                match: (page) => this.matchUrl(page, /\/(profile|user|member|个人|account)/i) ||
                    this.hasFeature(page, 'hasAvatar')
            },
            {
                id: 'ai-chatbots',
                name: 'AI 聊天机器人测试员',
                prompt: 'ai-chatbots.md',
                match: (page) => this.hasFeature(page, 'hasChatWidget') ||
                    this.contentMatch(page, /chat-widget|chatbot|live-chat|intercom|crisp|tawk/i)
            },
            {
                id: 'javascript-booking-flows',
                name: '预订流程测试员',
                prompt: 'javascript-booking-flows.md',
                match: (page) => this.matchUrl(page, /\/(book|booking|reserve|reservation|appointment|预约|预订)/i) ||
                    this.hasFeature(page, 'hasDatePicker')
            },
            {
                id: 'error-messages-careers-pages',
                name: '错误消息/招聘页测试员',
                prompt: 'error-messages-careers-pages.md',
                match: (page) => this.matchUrl(page, /\/(careers|jobs|hiring|招聘|join-us)/i) ||
                    page.status >= 400
            },
            {
                id: 'genai-code',
                name: '生成式 AI 代码测试员',
                prompt: 'genai-code.md',
                match: (page) => this.contentMatch(page, /ai-generated|copilot|code-generation|playground/i)
            },
            // ===== 以下为通用 Agent（7个），根据页面特征始终/条件性启用 =====
            {
                id: 'ui-ux-forms',
                name: 'UI/UX 表单测试员 (Mia)',
                prompt: 'ui-ux-forms.md',
                match: (page) => this.hasFeature(page, 'hasForms') || this.hasFeature(page, 'hasInputs'),
                universal: false
            },
            {
                id: 'accessibility',
                name: '无障碍测试员 (Sophia)',
                prompt: 'accessibility.md',
                universal: true  // 所有页面都测
            },
            {
                id: 'security-owasp',
                name: '安全测试员 (Tariq)',
                prompt: 'security-owasp.md',
                universal: true  // 所有页面都测
            },
            {
                id: 'content',
                name: '内容测试员 (Leila)',
                prompt: 'content.md',
                universal: true  // 所有页面都测
            },
            {
                id: 'performance-core-web-vitals',
                name: '性能测试员 (Viktor)',
                prompt: 'performance-core-web-vitals.md',
                universal: true  // 所有页面都测
            },
            {
                id: 'mobile',
                name: '移动端测试员 (Zanele)',
                prompt: 'mobile.md',
                universal: true  // 所有页面都测
            },
            {
                id: 'console-logs',
                name: '控制台日志测试员',
                prompt: 'console-logs.md',
                match: (page) => page.consoleLogs && page.consoleLogs.length > 0,
                universal: false
            },
            // ===== 以下为合规/专项 Agent（6个），按特定条件触发 =====
            {
                name: '隐私/Cookie 测试员',
                prompt: 'privacy-cookie-consent.md',
                match: (page) => this.hasFeature(page, 'hasCookieBanner') ||
                    this.contentMatch(page, /cookie|privacy|gdpr|隐私|Cookie/i)
            },
            {
                id: 'gdpr-compliance',
                name: 'GDPR 合规测试员',
                prompt: 'gdpr-compliance.md',
                match: (page) => this.contentMatch(page, /gdpr|privacy policy|data protection|个人信息保护/i)
            },
            {
                id: 'wcag-compliance',
                name: 'WCAG 合规测试员',
                prompt: 'wcag-compliance.md',
                match: (page) => false  // 仅在指定时启用
            },
            {
                id: 'i18n-localization',
                name: '国际化测试员',
                prompt: 'i18n-localization.md',
                match: (page) => this.hasFeature(page, 'hasLanguageSwitcher') ||
                    this.matchUrl(page, /\/(en|zh|ja|ko|fr|de|es|pt|ru)\//i)
            },
            {
                id: 'networking-connectivity',
                name: '网络连接测试员',
                prompt: 'networking-connectivity.md',
                match: (page) => false  // 仅在指定时启用
            },
            {
                id: 'system-errors',
                name: '系统错误测试员',
                prompt: 'system-errors.md',
                match: (page) => page.status >= 400 ||
                    (page.consoleLogs && page.consoleLogs.some(l => l.type === 'error'))
            }
        ];
    }

    /**
     * 识别页面类型，返回匹配的 Agent 列表
     * 遍历所有 Agent，通用 Agent 直接加入，其他 Agent 根据 match 函数判断
     * @param {Object} pageData - 爬取的页面数据（包含 url、features、html、content 等）
     * @returns {Array<{id: string, name: string, prompt: string}>} 匹配的 Agent 列表
     */
    classify(pageData) {
        const matched = [];
        const matchedIds = new Set(); // 用于去重，防止同一 Agent 重复加入

        for (const agent of this.agents) {
            // 通用 Agent（universal: true）始终加入
            if (agent.universal) {
                if (!matchedIds.has(agent.id)) {
                    matched.push(agent);
                    matchedIds.add(agent.id);
                }
                continue;
            }

            // 条件 Agent：调用 match 函数判断是否匹配当前页面
            if (agent.match && agent.match(pageData)) {
                if (!matchedIds.has(agent.id)) {
                    matched.push(agent);
                    matchedIds.add(agent.id);
                }
            }
        }

        return matched;
    }

    /**
     * 获取所有可用 Agent 列表（含 id、name、prompt、universal 属性）
     * @returns {Array<{id: string, name: string, prompt: string, universal: boolean}>}
     */
    getAllAgents() {
        return this.agents.map(a => ({
            id: a.id,
            name: a.name,
            prompt: a.prompt,
            universal: !!a.universal
        }));
    }

    // ===== 辅助匹配方法 =====

    /**
     * 判断是否为首页（根据 URL 路径判断）
     * @param {Object} page - 页面数据
     * @returns {boolean}
     */
    isHomepage(page) {
        const url = page.url || '';
        const path = new URL(url).pathname;
        return path === '/' || path === '' || path === '/index.html' || path === '/index.htm' ||
            /^\/?(home|首页|main[_-]?page)?\/?$/i.test(path);
    }

    /**
     * URL 正则匹配
     * @param {Object} page - 页面数据
     * @param {RegExp} regex - 匹配规则
     * @returns {boolean}
     */
    matchUrl(page, regex) {
        return regex.test(page.url || '');
    }

    /**
     * 检查页面是否具有指定 DOM 特征
     * @param {Object} page - 页面数据
     * @param {string} feature - 特征名（如 hasForms、hasSearchBox 等）
     * @returns {boolean}
     */
    hasFeature(page, feature) {
        return !!(page.features && page.features[feature]);
    }

    /**
     * 页面内容正则匹配（匹配 HTML 源码或文本内容）
     * @param {Object} page - 页面数据
     * @param {RegExp} regex - 匹配规则
     * @returns {boolean}
     */
    contentMatch(page, regex) {
        return regex.test(page.html || '') || regex.test(page.content || '');
    }
}

module.exports = PageClassifier;
