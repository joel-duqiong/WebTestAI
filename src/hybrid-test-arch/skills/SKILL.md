---
name: hybrid-test
description: 混合测试架构 - 结合 Playwright 爬取 + OpenTestAI 智能分析。支持大规模页面爬取、多 Agent 智能分析、生成专业测试报告。
metadata: { "openclaw": { "emoji": "🧪", "requires": { "tools": ["node", "playwright"] } } }
---

# Hybrid Test - 混合测试技能

结合 Playwright 基础爬取和 OpenTestAI 智能分析的混合测试架构。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│              混合测试架构                               │
├─────────────────────────────────────────────────────────┤
│  基础爬取层：Playwright                                │
│    ├─ 页面导航                                         │
│    ├─ 截图/DOM 抓取                                    │
│    ├─ 链接收集                                         │
│    └─ 数据提取                                         │
│                                                         │
│  智能分析层：OpenTestAI 提示词                          │
│    ├─ Mia (UI/UX)                                      │
│    ├─ Sophia (无障碍)                                  │
│    ├─ Tariq (安全)                                     │
│    └─ Leila (内容)                                     │
│                                                         │
│  工作流层：OpenClaw                                     │
│    ├─ 会话管理                                         │
│    ├─ 多技能协作                                       │
│    └─ 报告生成                                         │
└─────────────────────────────────────────────────────────┘
```

## 用法

### 基础使用

```javascript
const hybridTest = require('skills/hybrid-test');

// 执行测试
const results = await hybridTest.execute({
    url: 'https://example.com',
    options: {
        maxPages: 30,
        agents: ['mia', 'sophia', 'tariq']
    }
});

// 生成报告
await hybridTest.generateReport(results);
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | string | 必需 | 测试起始 URL |
| `maxPages` | number | 50 | 最大爬取页面数 |
| `agents` | array | ['mia','sophia','tariq','leila','viktor','zanele'] | 启用的分析 Agent |
| `timeout` | number | 15000 | 页面加载超时 (ms) |
| `viewport` | object | {1280x800} | 浏览器窗口大小 |
| `useLLM` | boolean | false | 是否使用真实 LLM API |
| `llmProvider` | string | 'openai' | LLM 提供商 (openai/anthropic/bailian) |
| `llmApiKey` | string | process.env.LLM_API_KEY | LLM API Key |
| `exportPDF` | boolean | true | 是否导出 PDF 报告 |

### 返回结果

```json
{
  "summary": {
    "crawledPages": 30,
    "successPages": 28,
    "failedPages": 2,
    "totalIssues": 5
  },
  "pages": [...],
  "issues": [...]
}
```

## 参与测试的 Agent

| Agent | 专长 | 检查项 |
|-------|------|--------|
| **Mia** | UI/UX | 布局、表单、视觉层次 |
| **Sophia** | 无障碍 | WCAG 合规、对比度、键盘导航 |
| **Tariq** | 安全 | HTTPS、表单安全、XSS |
| **Leila** | 内容 | 拼写、品牌一致性、可读性 |

## 示例

### 快速测试

```javascript
// 仅基础爬取（最快）
const results = await hybridTest.execute({
    url: 'https://example.com',
    options: { agents: [] }
});
```

### 标准测试

```javascript
// 基础 + UI/UX 分析
const results = await hybridTest.execute({
    url: 'https://example.com',
    options: { agents: ['mia'] }
});
```

### 完整测试

```javascript
// 全面分析
const results = await hybridTest.execute({
    url: 'https://example.com',
    options: { 
        maxPages: 50,
        agents: ['mia', 'sophia', 'tariq', 'leila']
    }
});
```

## 依赖

- Node.js v16+
- Playwright (`npm install playwright`)

## 清理

测试完成后清理临时文件：

```javascript
await hybridTest.cleanup();
```

---

*实现：测试仔 🧪 | 全栈资深测试专家视角*
