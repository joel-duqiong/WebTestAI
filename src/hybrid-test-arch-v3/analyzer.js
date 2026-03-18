/**
 * 混合测试架构 v3.1 - 智能分析层
 * 改进：支持 33 个 OpenTestAI Agent，动态匹配页面类型
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PageClassifier = require('./page-classifier');

class PageAnalyzer {
    constructor(options = {}) {
        this.promptsDir = options.promptsDir || path.join(__dirname, 'prompts');
        this.classifier = new PageClassifier();
        this.prompts = {};
        this.loadAllPrompts();
    }

    /**
     * 加载所有 prompt 文件
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
     * 获取 Agent 的 prompt
     */
    getPrompt(agentId) {
        return this.prompts[agentId] || null;
    }

    /**
     * 识别页面类型，返回匹配的 Agent 列表
     */
    classifyPage(pageData) {
        return this.classifier.classify(pageData);
    }

    /**
     * 构建 LLM 分析 prompt
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
     * 根据匹配的 Agent 数量和类型动态生成
     */
    generateTestCases(pageData, matchedAgents) {
        const tests = [];
        const features = pageData.features || {};

        // ===== 基础测试（所有页面必测）=====
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

        // ===== 性能测试 (Viktor) =====
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

        // ===== 无障碍测试 (Sophia) =====
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

        // ===== 安全测试 (Tariq) =====
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

        // ===== 内容测试 (Leila) =====
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

        // ===== 移动端测试 (Zanele) =====
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

        // ===== 首页专项测试 =====
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

        // ===== 搜索框测试 =====
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

        // ===== 表单测试 (Mia) =====
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

        // ===== 电商测试 =====
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

        // ===== 视频测试 =====
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

        // ===== Cookie/隐私测试 =====
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

        // ===== 控制台日志测试 =====
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

        // ===== 国际化测试 =====
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

        // ===== 注册/登录测试 =====
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

        // ===== 系统错误测试 =====
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

        // ===== 新闻/文章测试 =====
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

        // ===== AI 聊天机器人测试 =====
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
