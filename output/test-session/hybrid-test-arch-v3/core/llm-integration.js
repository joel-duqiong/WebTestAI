/**
 * LLM API 集成模块
 * 支持多种 LLM 提供商
 */

class LLMIntegration {
    constructor(options = {}) {
        this.provider = options.provider || 'openai'; // openai, anthropic, bailian
        this.apiKey = options.apiKey || process.env.LLM_API_KEY;
        this.model = options.model || this.getDefaultModel();
        this.baseUrl = options.baseUrl || this.getDefaultBaseUrl();
    }

    /**
     * 获取默认模型
     */
    getDefaultModel() {
        const models = {
            openai: 'gpt-4o',
            anthropic: 'claude-3-5-sonnet-20241022',
            bailian: 'qwen3.5-plus'
        };
        return models[this.provider] || 'gpt-4o';
    }

    /**
     * 获取默认 API 地址
     */
    getDefaultBaseUrl() {
        const urls = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com',
            bailian: 'https://dashscope.aliyuncs.com/api/v1'
        };
        return urls[this.provider] || 'https://api.openai.com/v1';
    }

    /**
     * 调用 LLM
     */
    async call(prompt, options = {}) {
        const {
            maxTokens = 2000,
            temperature = 0.3,
            jsonMode = true
        } = options;

        try {
            let response;
            
            switch (this.provider) {
                case 'anthropic':
                    response = await this.callAnthropic(prompt, maxTokens, temperature);
                    break;
                case 'bailian':
                    response = await this.callBailian(prompt, maxTokens, temperature);
                    break;
                case 'openai':
                default:
                    response = await this.callOpenAI(prompt, maxTokens, temperature, jsonMode);
                    break;
            }

            return this.parseResponse(response, jsonMode);
        } catch (error) {
            console.error('❌ LLM 调用失败:', error.message);
            return null;
        }
    }

    /**
     * 调用 OpenAI
     */
    async callOpenAI(prompt, maxTokens, temperature, jsonMode) {
        const fetch = require('node-fetch');
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的测试专家。请分析页面并返回 JSON 格式的问题列表。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: maxTokens,
                temperature: temperature,
                response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }

        return await response.json();
    }

    /**
     * 调用 Anthropic (Claude)
     */
    async callAnthropic(prompt, maxTokens, temperature) {
        const fetch = require('node-fetch');
        
        const response = await fetch(`${this.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: maxTokens,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${error}`);
        }

        return await response.json();
    }

    /**
     * 调用阿里云百炼
     */
    async callBailian(prompt, maxTokens, temperature) {
        const fetch = require('node-fetch');
        
        const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                parameters: {
                    max_tokens: maxTokens,
                    temperature: temperature
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Bailian API error: ${error}`);
        }

        return await response.json();
    }

    /**
     * 解析响应
     */
    parseResponse(response, jsonMode) {
        try {
            let content;
            
            switch (this.provider) {
                case 'anthropic':
                    content = response.content[0].text;
                    break;
                case 'bailian':
                    content = response.output.text;
                    break;
                case 'openai':
                default:
                    content = response.choices[0].message.content;
                    break;
            }

            if (jsonMode) {
                return JSON.parse(content);
            }
            
            return content;
        } catch (error) {
            console.error('❌ 解析 LLM 响应失败:', error.message);
            return null;
        }
    }

    /**
     * 分析页面问题
     */
    async analyzePage(agent, prompt) {
        console.log(`   🤖 调用 ${agent} Agent...`);
        const result = await this.call(prompt, { jsonMode: true });
        
        if (result && Array.isArray(result)) {
            return result.map(issue => ({
                ...issue,
                agent,
                timestamp: new Date().toISOString()
            }));
        }
        
        return [];
    }

    /**
     * 批量分析（并行）
     */
    async analyzeMultipleAgents(pageData, agents, prompts) {
        const allResults = [];
        
        for (const agent of agents) {
            const prompt = prompts[agent] || prompts['mia'];
            const fullPrompt = this.buildPrompt(agent, prompt, pageData);
            const results = await this.analyzePage(agent, fullPrompt);
            allResults.push(...results);
        }
        
        return allResults;
    }

    /**
     * 构建提示词
     */
    buildPrompt(agent, basePrompt, pageData) {
        return `
## 页面信息
- URL: ${pageData.url}
- 标题：${pageData.title || '无标题'}
- 加载时间：${pageData.loadTime}ms
- 状态：${pageData.status}

## 页面特征
${JSON.stringify(pageData.features, null, 2)}

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
    }
}

module.exports = LLMIntegration;
