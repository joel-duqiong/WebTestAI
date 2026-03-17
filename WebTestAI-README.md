# WebTestAI 🧪

**智能 Web 测试平台** - 基于 Playwright + 多 Agent 协作的混合测试架构

---

## 📖 项目简介

WebTestAI 是一个智能化的 Web 应用测试平台，结合了：

- **Playwright** - 可靠的浏览器自动化和页面爬取
- **多 Agent 智能分析** - 6 个专业测试 Agent 协作（UI/UX、无障碍、安全、内容等）
- **OpenClaw 技能系统** - 模块化、可扩展的测试工作流
- **大模型集成** - 支持 OpenAI GPT-4o、Claude 3.5、阿里云 Qwen3.5+

---

## 🚀 核心功能

### 1. 智能页面爬取
- 自动发现并爬取网站页面
- 支持 SPA 单页应用
- 智能去重和链接过滤
- 可配置最大爬取深度

### 2. 多 Agent 分析
| Agent | 专长 | 检查项 |
|-------|------|--------|
| **Mia** | UI/UX | 布局、表单、视觉层次、交互体验 |
| **Sophia** | 无障碍 | WCAG 合规、对比度、键盘导航、屏幕阅读器 |
| **Tariq** | 安全 | HTTPS、表单安全、XSS、CSP |
| **Leila** | 内容 | 拼写、品牌一致性、可读性 |
| **Viktor** | 性能 | 加载时间、资源优化、缓存策略 |
| **Zanele** | 移动端 | 响应式布局、触摸交互、移动适配 |

### 3. 测试报告
- HTML 可视化报告（带截图）
- PDF 导出（可选）
- JSON 数据导出
- 问题优先级排序

---

## 📦 项目结构

```
webtestai/
├── hybrid-test-arch/          # 混合测试架构 v1
│   ├── core/                  # 核心模块
│   │   ├── crawler.js         # 页面爬取器
│   │   ├── analyzer.js        # 测试分析器
│   │   ├── llm-integration.js # LLM API 集成
│   │   └── ...
│   ├── prompts/               # AI 提示词模板
│   ├── skills/                # OpenClaw 技能
│   └── examples/              # 示例脚本
│
├── hybrid-test-arch-v3/       # 混合测试架构 v3 (最新版)
│   ├── core/
│   ├── prompts/
│   └── examples/
│
├── full-stack-test*.js        # 全栈测试脚本 (多个版本)
├── package.json               # 依赖配置
└── README.md                  # 项目说明
```

---

## 🛠️ 安装

### 前置要求

- Node.js v16+
- npm 或 yarn

### 安装依赖

```bash
cd webtestai
npm install
```

### 环境变量配置

创建 `.env` 文件（可选，如需使用 LLM 分析）：

```bash
# LLM API Key (任选其一)
LLM_API_KEY=your_openai_key_here
LLM_PROVIDER=openai

# 或使用阿里云百炼
# LLM_API_KEY=your_bailian_key_here
# LLM_PROVIDER=bailian

# 或使用 Anthropic Claude
# LLM_API_KEY=your_anthropic_key_here
# LLM_PROVIDER=anthropic
```

---

## 📖 使用方法

### 快速开始

```javascript
const hybridTest = require('./hybrid-test-arch-v3/skills');

// 执行测试
const results = await hybridTest.execute({
    url: 'https://example.com',
    maxPages: 30,
    agents: ['mia', 'sophia', 'tariq']
});

// 生成报告
await hybridTest.generateReport(results);
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | string | 必需 | 测试起始 URL |
| `maxPages` | number | 50 | 最大爬取页面数 |
| `agents` | array | 全部启用 | 启用的分析 Agent |
| `timeout` | number | 15000 | 页面加载超时 (ms) |
| `viewport` | object | {1280x800} | 浏览器窗口大小 |
| `useLLM` | boolean | false | 是否使用真实 LLM API |
| `llmProvider` | string | 'openai' | LLM 提供商 |
| `llmApiKey` | string | 环境变量 | LLM API Key |
| `exportPDF` | boolean | true | 是否导出 PDF 报告 |

### 运行示例

```bash
# 仅基础爬取（最快，不调用 LLM）
node examples/basic-test.js

# 标准测试（含 UI/UX 分析）
node examples/standard-test.js

# 完整测试（全部 Agent）
node examples/full-test.js
```

---

## 🤖 使用的大模型

本项目支持多种大模型作为分析引擎：

| 提供商 | 模型 | 适用场景 |
|--------|------|----------|
| **阿里云百炼** | Qwen3.5-Plus | 默认推荐，中文支持好 |
| **OpenAI** | GPT-4o | 英文场景，全球可用 |
| **Anthropic** | Claude 3.5 Sonnet | 长文本分析，安全性高 |

**默认配置：** `bailian/qwen3.5-plus`（通义千问 3.5 Plus）

### 切换模型

```javascript
const llm = new LLMIntegration({
    provider: 'bailian',  // openai | anthropic | bailian
    apiKey: process.env.LLM_API_KEY,
    model: 'qwen3.5-plus'
});
```

---

## 📊 输出示例

### 测试结果结构

```json
{
  "timestamp": "2026-03-18T01:55:00.000Z",
  "baseUrl": "https://example.com",
  "summary": {
    "crawledPages": 30,
    "successPages": 28,
    "failedPages": 2,
    "totalIssues": 15
  },
  "issues": [
    {
      "agent": "sophia",
      "bug_title": "对比度不足",
      "bug_type": ["Accessibility"],
      "bug_priority": 6,
      "bug_confidence": 8,
      "suggested_fix": "将文字颜色加深至 #333"
    }
  ]
}
```

### HTML 报告

报告包含：
- 测试概览（爬取页面数、成功率、问题数）
- 每页测试结果和截图
- 问题列表和优先级
- Agent 分析详情

---

## 🧪 OpenClaw 技能

本项目包含一个 OpenClaw 技能：**hybrid-test**

### 技能信息

- **名称：** hybrid-test
- **描述：** 混合测试架构 - 结合 Playwright 爬取 + OpenTestAI 智能分析
- **依赖工具：** Node.js, Playwright
- **表情符号：** 🧪

### 技能安装

```bash
# 使用 clawhub 安装
clawhub install webtestai/hybrid-test

# 或手动复制
cp -r skills/hybrid-test ~/.openclaw/skills/
```

### 技能使用

在 OpenClaw 会话中：

```
请对 https://example.com 执行混合测试，使用 mia 和 sophia agent
```

---

## 📝 文档

- [WebTestAI-README.md](./WebTestAI-README.md) - 项目详细说明
- [WebTestAI-Screenshots-Guide.md](./WebTestAI-Screenshots-Guide.md) - 截图功能指南
- [hybrid-test-arch/README.md](./hybrid-test-arch/README.md) - 架构文档

---

## 🔧 开发

### 添加新 Agent

1. 在 `prompts/` 目录创建提示词文件
2. 在 `core/analyzer.js` 注册 Agent
3. 更新文档

### 调试模式

```javascript
const results = await hybridTest.execute({
    url: 'https://example.com',
    useLLM: false,  // 关闭 LLM 调用，节省成本
    maxPages: 5     // 限制页面数，快速测试
});
```

---

## ⚠️ 注意事项

1. **API 成本** - 使用 LLM 分析会产生 API 费用，建议先用 `useLLM: false` 测试
2. **爬取礼貌** - 设置合理的 `maxPages` 和延迟，避免对目标服务器造成压力
3. **隐私保护** - 不要爬取需要登录的敏感页面
4. **环境变量** - API Key 等敏感信息请放入 `.env` 文件，不要提交到 Git

---

## 📄 许可证

ISC

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

*实现：测试仔 🧪 | 质量是测试出来的，不是保证出来的*
