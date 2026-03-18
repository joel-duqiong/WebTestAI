/**
 * @module PageAnalyzer
 * @description 混合测试架构 v3.1 - 智能分析层
 *
 * 核心职责：
 * 1. 加载 33 个 Agent 的测试提示词（从 prompts/ 目录）
 * 2. 调用 PageClassifier 识别页面类型，获取匹配的 Agent 列表
 * 3. 根据匹配的 Agent 动态生成基础测试 + 专项测试用例
 * 4. 构建 LLM 分析 prompt（用于可选的大模型深度分析）
 *
 * @version 3.1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PageClassifier = require('./page-classifier');

/**
 * 页面智能分析器
 * @class PageAnalyzer
 */
class PageAnalyzer {
    /**
     * 初始化分析器
     * @param {Object} options - 配置选项
     * @param {string} [options.promptsDir] - 提示词目录路径，默认为 ./prompts/
     */
    constructor(options = {}) {
        /** @type {string} 提示词文件目录 */
        this.promptsDir = options.promptsDir || path.join(__dirname, 'prompts');
        /** @type {PageClassifier} 页面类型识别器实例 */
        this.classifier = new PageClassifier();
        /** @type {Object<string, string>} 已加载的提示词缓存，key 为 Agent ID */
        this.prompts = {};
        this.loadAllPrompts();
    }

    /**
     * 加载 prompts/ 目录下所有 .md 提示词文件到内存缓存
     * 文件名（去掉 .md）作为 Agent ID
     */
    loadAllPrompts() {
        if (!fs.existsSync(this.promptsDir)) return;

        const files = fs.readdirSync(this.promptsDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const id = file.replace('.md', '');
            const content = fs.readFileSync(path.join(this.promptsDir, file), 'utf8');
            this.prompts[id] = content;
        }
        console.log(`📚 已加载 ${Object.keys(this.prompts).length} 个 Agent prompt`);
    }

    /**
     * 获取指定 Agent 的提示词内容
     * @param {string} agentId - Agent 标识符
     * @returns {string|null} 提示词内容，未找到返回 null
     */
    getPrompt(agentId) {
        return this.prompts[agentId] || null;
    }

    /**
     * 调用 PageClassifier 识别页面类型
     * @param {Object} pageData - 爬取的页面数据
     * @returns {Array} 匹配的 Agent 列表
     */
    classifyPage(pageData) {
        return this.classifier.classify(pageData);
    }

    /**
     * 构建 LLM 分析 prompt
     * 将页面信息、DOM 特征、控制台日志和 Agent 提示词组合成完整的分析 prompt
     * @param {string} agentId - Agent 标识符
     * @param {Object} pageData - 页面数据（含 url、title、loadTime、status、features 等）
     * @returns {string|null} 组装好的 prompt，Agent 无提示词时返回 null
     */
    buildPrompt(agentId, pageData) {
        const basePrompt = this.getPrompt(agentId);
        if (!basePrompt) return null;

        return `
## 页面信息
- URL: ${pageData.url}
- 标题：${pageData.title || '无标题'}
- 加载时间：${pageData.loadTime}ms
- 状态码：${pageData.status}

## 页面特征
${JSON.stringify(pageData.features, null, 2)}

## 控制台日志 (前 10 条)
${JSON.stringify((pageData.consoleLogs || []).slice(0, 10), null, 2)}

## 测试要求
${basePrompt}

## 输出格式
返回 JSON 数组，每个问题包含：
{
  "bug_title": "问题标题",
  "bug_type": ["类型"],
  "bug_priority": 1-10,
  "bug_confidence": 1-10,
  "bug_reasoning_why_a_bug": "为什么是问题",
  "suggested_fix": "修复建议"
}

## 要求
- 只报告高置信度问题 (confidence >= 7)
- 基于实际页面内容分析
- 提供具体可执行的修复建议
`;
    }

    /**
     * 为页面生成动态测试用例
     * 根据匹配的 Agent 数量和类型动态生成基础测试 + 专项测试
     * @param {Object} pageData - 页面数据
     * @param {Array} matchedAgents - 匹配的 Agent 列表
     * @returns {Array} 测试用例列表，每个用例包含 agent、name、check、passed、expected、actual
     */
    generateTestCases(pageData, matchedAgents) {
        const tests = [];
        const features = pageData.features || {};

        // ===== 基础测试（所有页面必测）：标题、内容、HTTP 状态 =====
        tests.push({
            agent: 'basic',
            name: '页面标题',
            check: '标题长度>=3',
            passed: !!(pageData.title && pageData.title.length >= 3),
            expected: '>=3 字符',
            actual: `"${(pageData.title || '').substring(0, 50)}" (${(pageData.title || '').length}字符)`
        });

        tests.push({
            agent: 'basic',
            name: '页面内容',
            check: '内容>100 字符',
            passed: !!(pageData.content && pageData.content.length > 100),
            expected: '>100 字符',
            actual: `${(pageData.content || '').length}字符`
        });

        tests.push({
            agent: 'basic',
            name: 'HTTP 状态',
            check: '200 OK',
            passed: pageData.status === 200,
            expected: '200',
            actual: String(pageData.status || '-')
        });

        // ===== 专项测试：性能 (Viktor) - 检查页面加载时间 =====
        if (matchedAgents.some(a => a.id === 'performance-core-web-vitals')) {
            tests.push({
                agent: 'performance-core-web-vitals',
                name: '页面加载性能',
                check: '加载时间 < 3s',
                passed: pageData.loadTime < 3000,
                expected: '<3000ms',
                actual: `${pageData.loadTime}ms`
            });
            tests.push({
                agent: 'performance-core-web-vitals',
                name: '首次加载性能',
                check: '加载时间 < 5s (SPA)',
                passed: pageData.loadTime < 5000,
                expected: '<5000ms',
                actual: `${pageData.loadTime}ms`
            });
        }

        // ===== 专项测试：无障碍 (Sophia) - 检查图片、导航 =====
        if (matchedAgents.some(a => a.id === 'accessibility')) {
            tests.push({
                agent: 'accessibility',
                name: '图片 Alt 属性',
                check: '图片数量检测',
                passed: features.imageCount > 0,
                expected: '有图片内容',
                actual: `${features.imageCount || 0}张图片`
            });
            tests.push({
                agent: 'accessibility',
                name: '导航可用性',
                check: '导航结构存在',
                passed: !!features.hasNavigation,
                expected: '有导航',
                actual: features.hasNavigation ? '✓' : '✗'
            });
        }

        // ===== 专项测试：安全 (Tariq) - 检查 HTTPS、控制台错误 =====
        if (matchedAgents.some(a => a.id === 'security-owasp')) {
            const isHTTPS = (pageData.url || '').startsWith('https://');
            tests.push({
                agent: 'security-owasp',
                name: 'HTTPS 加密',
                check: '使用 HTTPS',
                passed: isHTTPS,
                expected: 'HTTPS',
                actual: isHTTPS ? 'HTTPS ✓' : 'HTTP ✗'
            });
            tests.push({
                agent: 'security-owasp',
                name: '控制台错误',
                check: '无 JS 错误',
                passed: !(pageData.consoleLogs && pageData.consoleLogs.some(l => l.type === 'error')),
                expected: '无错误',
                actual: `${(pageData.consoleLogs || []).filter(l => l.type === 'error').length}个错误`
            });
        }

        // ===== 专项测试：内容 (Leila) - 检查链接完整性 =====
        if (matchedAgents.some(a => a.id === 'content')) {
            tests.push({
                agent: 'content',
                name: '内容完整性',
                check: '链接数量',
                passed: (features.linkCount || 0) > 0,
                expected: '>0 链接',
                actual: `${features.linkCount || 0}个链接`
            });
        }

        // ===== 专项测试：移动端 (Zanele) - 检查交互元素 =====
        if (matchedAgents.some(a => a.id === 'mobile')) {
            tests.push({
                agent: 'mobile',
                name: '按钮/交互元素',
                check: '有可点击元素',
                passed: (features.buttonCount || 0) > 0,
                expected: '>0 按钮',
                actual: `${features.buttonCount || 0}个按钮`
            });
        }

        // ===== 页面类型专项测试：首页 =====
        if (matchedAgents.some(a => a.id === 'homepage')) {
            tests.push({
                agent: 'homepage',
                name: '首页 Banner',
                check: 'Banner 展示',
                passed: !!features.hasBanner,
                expected: '有 Banner',
                actual: features.hasBanner ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：搜索框 =====
        if (matchedAgents.some(a => a.id === 'search-box')) {
            tests.push({
                agent: 'search-box',
                name: '搜索功能',
                check: '搜索框存在',
                passed: !!features.hasSearchBox,
                expected: '有搜索框',
                actual: features.hasSearchBox ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：表单 (Mia) =====
        if (matchedAgents.some(a => a.id === 'ui-ux-forms')) {
            tests.push({
                agent: 'ui-ux-forms',
                name: '表单存在性',
                check: '表单元素检测',
                passed: !!features.hasForms,
                expected: '有表单',
                actual: features.hasForms ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：电商（产品目录、详情） =====
        if (matchedAgents.some(a => a.id === 'product-catalog')) {
            tests.push({
                agent: 'product-catalog',
                name: '商品展示',
                check: '商品卡片存在',
                passed: !!features.hasProductCards,
                expected: '有商品卡片',
                actual: features.hasProductCards ? '✓' : '✗'
            });
        }

        if (matchedAgents.some(a => a.id === 'product-details')) {
            tests.push({
                agent: 'product-details',
                name: '加入购物车',
                check: '购买按钮存在',
                passed: !!features.hasAddToCart,
                expected: '有购买按钮',
                actual: features.hasAddToCart ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：视频 =====
        if (matchedAgents.some(a => a.id === 'video')) {
            tests.push({
                agent: 'video',
                name: '视频元素',
                check: '视频存在',
                passed: !!features.hasVideo,
                expected: '有视频',
                actual: features.hasVideo ? '✓' : '✗'
            });
        }

        // ===== 合规专项测试：Cookie/隐私 =====
        if (matchedAgents.some(a => a.id === 'privacy-cookie-consent')) {
            tests.push({
                agent: 'privacy-cookie-consent',
                name: 'Cookie 提示',
                check: 'Cookie Banner',
                passed: !!features.hasCookieBanner,
                expected: '有 Cookie 提示',
                actual: features.hasCookieBanner ? '✓' : '未检测到'
            });
        }

        // ===== 合规专项测试：控制台日志 =====
        if (matchedAgents.some(a => a.id === 'console-logs')) {
            const errors = (pageData.consoleLogs || []).filter(l => l.type === 'error');
            const warnings = (pageData.consoleLogs || []).filter(l => l.type === 'warning');
            tests.push({
                agent: 'console-logs',
                name: '控制台健康',
                check: '无严重错误',
                passed: errors.length === 0,
                expected: '0 错误',
                actual: `${errors.length}个错误, ${warnings.length}个警告`
            });
        }

        // ===== 合规专项测试：国际化 =====
        if (matchedAgents.some(a => a.id === 'i18n-localization')) {
            tests.push({
                agent: 'i18n-localization',
                name: '语言切换',
                check: '多语言支持',
                passed: !!features.hasLanguageSwitcher,
                expected: '有语言切换器',
                actual: features.hasLanguageSwitcher ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：注册/登录 =====
        if (matchedAgents.some(a => a.id === 'signup')) {
            tests.push({
                agent: 'signup',
                name: '登录/注册表单',
                check: '认证表单存在',
                passed: !!features.hasLoginForm,
                expected: '有认证表单',
                actual: features.hasLoginForm ? '✓' : '✗'
            });
        }

        // ===== 合规专项测试：系统错误 =====
        if (matchedAgents.some(a => a.id === 'system-errors')) {
            tests.push({
                agent: 'system-errors',
                name: 'HTTP 错误检测',
                check: '无 4xx/5xx 错误',
                passed: pageData.status < 400,
                expected: '状态码 < 400',
                actual: `${pageData.status}`
            });
        }

        // ===== 页面类型专项测试：新闻/文章 =====
        if (matchedAgents.some(a => a.id === 'news')) {
            tests.push({
                agent: 'news',
                name: '文章结构',
                check: 'Article 标签',
                passed: !!features.hasArticle,
                expected: '有 article 标签',
                actual: features.hasArticle ? '✓' : '✗'
            });
        }

        // ===== 页面类型专项测试：AI 聊天机器人 =====
        if (matchedAgents.some(a => a.id === 'ai-chatbots')) {
            tests.push({
                agent: 'ai-chatbots',
                name: '聊天组件',
                check: 'Chat Widget',
                passed: !!features.hasChatWidget,
                expected: '有聊天组件',
                actual: features.hasChatWidget ? '✓' : '✗'
            });
        }

        return tests;
    }

    /**
     * 多 Agent 并行分析（用于 LLM 调用）
     * 为每个匹配的 Agent 构建 prompt，返回可用于 LLM 分析的数据结构
     * @param {Object} pageData - 页面数据
     * @param {Array} [agents=null] - 指定的 Agent 列表，null 则自动识别
     * @returns {Array} 每个 Agent 的分析配置（含 prompt、页面数据子集）
     */
    async analyzeWithMultipleAgents(pageData, agents = null) {
        const selectedAgents = agents || this.classifyPage(pageData);
        const results = [];

        for (const agent of selectedAgents) {
            const prompt = this.buildPrompt(agent.id, pageData);
            if (prompt) {
                results.push({
                    agent: agent.id,
                    agentName: agent.name,
                    prompt,
                    pageData: {
                        url: pageData.url,
                        title: pageData.title,
                        features: pageData.features,
                        consoleLogs: pageData.consoleLogs
                    }
                });
            }
        }

        return results;
    }
}

module.exports = PageAnalyzer;
