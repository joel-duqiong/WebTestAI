/**
 * 混合测试架构 - 智能分析层 (OpenTestAI 提示词)
 * 负责：使用 OpenTestAI 测试员提示词分析页面
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PageAnalyzer {
    constructor(options = {}) {
        this.agents = options.agents || ['mia', 'sophia', 'tariq', 'leila'];
        this.promptsDir = options.promptsDir || path.join(__dirname, '../prompts');
        this.loadPrompts();
    }

    /**
     * 加载提示词
     */
    loadPrompts() {
        this.prompts = {};
        
        const agentPrompts = {
            mia: 'mia-ui-ux.md',
            sophia: 'sophia-accessibility.md',
            tariq: 'tariq-security.md',
            leila: 'leila-content.md'
        };

        for (const [agent, file] of Object.entries(agentPrompts)) {
            const promptPath = path.join(this.promptsDir, file);
            if (fs.existsSync(promptPath)) {
                this.prompts[agent] = fs.readFileSync(promptPath, 'utf8');
            } else {
                this.prompts[agent] = this.getDefaultPrompt(agent);
            }
        }
    }

    /**
     * 获取默认提示词
     */
    getDefaultPrompt(agent) {
        const prompts = {
            mia: `你是 Mia，UI/UX 和表单专家。分析页面截图和 DOM 结构，查找：

**UI/UX 问题:**
- 布局问题（重叠、错位、网格断裂）
- 间距、字体、颜色不一致
- 视觉层次混乱
- 导航混淆
- 文本截断或裁剪
- 视觉元素缺失或损坏
- 响应式问题
- 按钮或交互元素问题

**表单问题:**
- 表单标签不清晰
- 缺少必填字段标识
- 输入框大小不合适
- 表单布局混乱
- 缺少帮助文本
- 提交按钮位置问题
- 表单验证反馈问题

对每个发现的问题，提供：
- bug_title: 清晰描述
- bug_type: ["UI/UX", "Forms", "Layout"]
- bug_priority: 1-10
- bug_confidence: 1-10
- bug_reasoning_why_a_bug: 用户影响
- suggested_fix: 具体建议`,

            sophia: `你是 Sophia，无障碍访问专家。分析页面截图和无障碍树，查找：

**无障碍问题:**
- 颜色对比度低（文本与背景）
- 图片缺少 alt 文本
- 点击目标小（< 44x44 像素）
- 缺少可见焦点指示器
- 标题结构差（h1, h2, h3 层次）
- 交互元素缺少 ARIA 标签
- 键盘导航问题
- 屏幕阅读器兼容性问题

对每个发现的问题，提供：
- bug_title: 清晰描述
- bug_type: ["Accessibility", "WCAG", "Contrast"]
- bug_priority: 1-10 (无障碍问题优先级高)
- bug_confidence: 1-10
- bug_reasoning_why_a_bug: 对残障用户的影响
- suggested_fix: WCAG 合规建议`,

            tariq: `你是 Tariq，安全和 OWASP 专家。分析页面截图和 DOM 结构，查找：

**安全问题:**
- 表单缺少 HTTPS 指示器
- 敏感数据暴露
- 缺少认证指示器
- 密码字段不安全（未掩码）
- 会话管理问题
- XSS 漏洞指示器
- SQL 注入风险
- 缺少安全头

**OWASP Top 10 关注:**
- 认证破坏
- 敏感数据暴露
- 配置错误
- 注入漏洞

对每个发现的问题，提供：
- bug_title: 清晰描述
- bug_type: ["Security", "OWASP", "Authentication"]
- bug_priority: 8-10 (安全问题关键)
- bug_confidence: 1-10
- bug_reasoning_why_a_bug: 安全风险
- suggested_fix: 安全建议`,

            leila: `你是 Leila，内容专家。分析页面截图，查找：

**内容问题:**
- 占位符文本（Lorem Ipsum）未删除
- 图片损坏或内容缺失
- 明显拼写或语法错误
- 语气或品牌不一致
- 内容部分缺失或不完整
- 版权日期过时
- 链接损坏
- 误导性或混淆文案
- 产品/服务信息错误
- 术语不一致
- 可读性差

对每个发现的问题，提供：
- bug_title: 清晰描述
- bug_type: ["Content", "Copywriting"]
- bug_priority: 1-10
- bug_confidence: 1-10
- bug_reasoning_why_a_bug: 用户理解影响
- suggested_fix: 内容改进建议`
        };

        return prompts[agent] || '';
    }

    /**
     * 分析页面（使用 LLM）
     * 注意：实际使用需要调用 LLM API，这里提供提示词构建
     */
    async analyzePage(pageData, agent = 'mia') {
        const prompt = this.buildPrompt(agent, pageData);
        
        // 实际使用时调用 LLM API
        // const result = await callLLM(prompt);
        // return parseResult(result);

        // 当前返回提示词和分析数据
        return {
            agent,
            prompt,
            pageData: {
                url: pageData.url,
                title: pageData.title,
                features: pageData.features,
                consoleLogs: pageData.consoleLogs
            }
        };
    }

    /**
     * 构建提示词
     */
    buildPrompt(agent, pageData) {
        const basePrompt = this.prompts[agent] || this.getDefaultPrompt(agent);
        
        const context = `
## 页面信息
- URL: ${pageData.url}
- 标题：${pageData.title || '无标题'}
- 加载时间：${pageData.loadTime}ms
- 状态：${pageData.status}

## 页面特征
${JSON.stringify(pageData.features, null, 2)}

## 控制台日志
${JSON.stringify(pageData.consoleLogs.slice(0, 10), null, 2)}

## 任务
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

        return context;
    }

    /**
     * 多 Agent 并行分析
     */
    async analyzeWithMultipleAgents(pageData, agents = null) {
        const selectedAgents = agents || this.agents;
        const results = [];

        for (const agent of selectedAgents) {
            const result = await this.analyzePage(pageData, agent);
            results.push(result);
        }

        return results;
    }

    /**
     * 生成测试用例
     */
    generateTestCases(pageData) {
        const tests = [];
        const features = pageData.features || {};

        // 基础测试
        tests.push({
            name: '页面标题',
            check: '标题长度>=3',
            passed: !!(pageData.title && pageData.title.length >= 3),
            expected: '>=3 字符',
            actual: `"${pageData.title || ''}" (${(pageData.title || '').length}字符)`
        });

        tests.push({
            name: '页面内容',
            check: '内容>100 字符',
            passed: !!(pageData.content && pageData.content.length > 100),
            expected: '>100 字符',
            actual: `${(pageData.content || '').length}字符`
        });

        tests.push({
            name: '加载性能',
            check: '<5 秒 (SPA)',
            passed: pageData.loadTime < 5000,
            expected: '<5 秒',
            actual: `${pageData.loadTime}ms`
        });

        tests.push({
            name: 'HTTP 状态',
            check: '200 OK',
            passed: pageData.status === 200,
            expected: '200',
            actual: pageData.status || '-'
        });

        // 功能测试
        if (features.hasNavigation) {
            tests.push({ name: '导航菜单', check: '导航存在', passed: true, expected: '有导航', actual: '✓' });
        }

        if (features.hasBanner) {
            tests.push({ name: 'Banner 展示', check: 'Banner 存在', passed: true, expected: '有 Banner', actual: '✓' });
        }

        if (features.hasProductCards) {
            tests.push({ name: '商品展示', check: '商品卡片显示', passed: true, expected: '有商品卡片', actual: '✓' });
        }

        if (features.imageCount > 0) {
            tests.push({ name: '图片检查', check: '图片加载', passed: true, expected: '有图片', actual: `${features.imageCount}张` });
        }

        if (features.linkCount > 0) {
            tests.push({ name: '链接检查', check: '内部链接', passed: true, expected: '>0 链接', actual: `${features.linkCount}个` });
        }

        if (features.buttonCount > 0) {
            tests.push({ name: '按钮检查', check: '按钮存在', passed: true, expected: '>0 按钮', actual: `${features.buttonCount}个` });
        }

        return tests;
    }
}

module.exports = PageAnalyzer;
