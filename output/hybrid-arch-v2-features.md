# 混合测试架构 v2.0 - 新功能说明

**更新时间:** 2026-03-18 00:11
**版本:** v2.0

---

## 🎉 新增四大核心功能

### 1️⃣ 添加更多 Agent 角色

**新增 3 个专业测试员：**

| Agent | 专长 | 检查项 | 提示词文件 |
|-------|------|--------|-----------|
| **Viktor** | 性能优化 | Core Web Vitals、LCP、CLS、INP | viktor-performance.md |
| **Zanele** | 移动端 | 响应式、触摸交互、视口 | zanele-mobile.md |
| **Pete** | AI 聊天 | 聊天机器人功能、交互 | pete-chatbot.md |

**现有 Agent：**
- Mia (UI/UX)
- Sophia (无障碍)
- Tariq (安全)
- Leila (内容)

**使用方式：**
```javascript
await hybridTest.execute({
    url: 'https://example.com',
    options: {
        agents: [
            'mia',      // UI/UX
            'sophia',   // 无障碍
            'tariq',    // 安全
            'leila',    // 内容
            'viktor',   // 性能 ⭐新增
            'zanele'    // 移动端 ⭐新增
        ]
    }
});
```

---

### 2️⃣ 集成真实 LLM API 调用

**支持 3 大 LLM 提供商：**

| 提供商 | 模型 | API 地址 |
|--------|------|---------|
| **OpenAI** | gpt-4o | https://api.openai.com/v1 |
| **Anthropic** | claude-3-5-sonnet | https://api.anthropic.com |
| **阿里云百炼** | qwen3.5-plus | https://dashscope.aliyuncs.com |

**使用方式：**
```javascript
await hybridTest.execute({
    url: 'https://example.com',
    options: {
        useLLM: true,              // 启用真实 LLM
        llmProvider: 'openai',     // 或 'anthropic', 'bailian'
        llmApiKey: 'sk-xxx'        // 或使用环境变量 LLM_API_KEY
    }
});
```

**环境变量配置：**
```bash
# Linux/Mac
export LLM_API_KEY='your-api-key'

# Windows PowerShell
$env:LLM_API_KEY='your-api-key'
```

**LLM 分析流程：**
```
1. 构建提示词（页面信息 + Agent 提示词）
2. 调用 LLM API
3. 解析 JSON 响应
4. 提取问题列表
5. 去重和聚合
```

**成本估算：**
- OpenAI GPT-4o: ~$0.01-0.03/页面
- Claude 3.5 Sonnet: ~$0.01-0.03/页面
- Qwen3.5-Plus: ~¥0.01-0.03/页面

---

### 3️⃣ 添加 PDF 报告导出

**功能：**
- ✅ 自动生成 PDF 报告
- ✅ 包含所有测试结果
- ✅ 格式化排版
- ✅ 可与 HTML 报告同时生成

**依赖安装：**
```bash
npm install pdfkit
```

**使用方式：**
```javascript
await hybridTest.execute({
    url: 'https://example.com',
    options: {
        exportPDF: true  // 启用 PDF 导出
    }
});

const reportPaths = await hybridTest.generateReport(results, outputDir, {
    exportPDF: true
});

console.log(reportPaths.htmlPath); // HTML 报告路径
console.log(reportPaths.pdfPath);  // PDF 报告路径
```

**PDF 内容：**
- 测试摘要（页面数、成功率、问题数）
- 页面列表（标题、URL、加载时间、测试结果）
- 问题列表（按优先级排序）
- 页脚信息

---

### 4️⃣ 实现结果聚合和去重

**去重模块：** `core/deduplication.js`

**功能：**
- ✅ 问题标题相似度计算（Jaccard 相似度）
- ✅ 保留置信度更高的问题
- ✅ 按页面聚合问题
- ✅ 按类型聚合问题
- ✅ 生成统计信息

**相似度算法：**
```javascript
// Jaccard 相似度
similarity = |A ∩ B| / |A ∪ B|

// 示例：
"颜色对比度不足" vs "对比度不够"
→ 标准化后比较
→ 相似度 >= 0.8 判定为重复
```

**使用方式：**
```javascript
const deduplicator = new ResultDeduplicator({
    similarityThreshold: 0.8  // 相似度阈值
});

const dedupedIssues = deduplicator.deduplicate(allIssues);

// 按页面分组
const groupedByPage = deduplicator.groupByPage(dedupedIssues);

// 按类型分组
const groupedByType = deduplicator.groupByType(dedupedIssues);

// 生成统计
const stats = deduplicator.generateStats(dedupedIssues);
/*
{
  total: 10,
  byType: [
    { type: 'UI/UX', count: 4 },
    { type: 'Accessibility', count: 3 }
  ],
  byPriority: {
    critical: 2,  // P8-10
    medium: 5,    // P4-7
    low: 3        // P1-3
  }
}
*/
```

**去重效果：**
```
去重前：50 个问题
  - 颜色对比度问题 × 5
  - 图片缺少 alt × 3
  - 导航问题 × 2
  
去重后：35 个问题
  - 颜色对比度问题 × 1 (保留置信度最高的)
  - 图片缺少 alt × 1
  - 导航问题 × 1
```

---

## 📊 完整使用示例

### 示例 1: 基础测试（无 LLM）

```javascript
const hybridTest = require('skills/hybrid-test');

const results = await hybridTest.execute({
    url: 'https://chagee.com/zh-cn',
    maxPages: 30,
    agents: ['mia', 'sophia'],
    exportPDF: true
});

await hybridTest.generateReport(results, 'F:/teams/testzai/output');
```

---

### 示例 2: 完整测试（使用 LLM）

```javascript
const results = await hybridTest.execute({
    url: 'https://chagee.com/zh-cn',
    maxPages: 50,
    agents: ['mia', 'sophia', 'tariq', 'leila', 'viktor', 'zanele'],
    useLLM: true,
    llmProvider: 'openai',
    llmApiKey: process.env.LLM_API_KEY,
    exportPDF: true
});

const reportPaths = await hybridTest.generateReport(results, 'F:/teams/testzai/output', {
    exportPDF: true
});

console.log('HTML 报告:', reportPaths.htmlPath);
console.log('PDF 报告:', reportPaths.pdfPath);
```

---

### 示例 3: 性能专项测试

```javascript
const results = await hybridTest.execute({
    url: 'https://chagee.com/zh-cn',
    agents: ['viktor', 'zanele'],  // 仅性能 + 移动端
    maxPages: 20
});
```

---

### 示例 4: 安全合规测试

```javascript
const results = await hybridTest.execute({
    url: 'https://chagee.com/zh-cn',
    agents: ['tariq', 'sophia'],  // 安全 + 无障碍
    useLLM: true,
    llmProvider: 'anthropic'
});
```

---

## 📁 文件结构

```
hybrid-test-arch/
├── core/
│   ├── crawler.js                 # Playwright 爬虫
│   ├── analyzer.js                # OpenTestAI 分析
│   ├── deduplication.js           # ⭐新增 去重模块
│   ├── pdf-exporter.js            # ⭐新增 PDF 导出
│   └── llm-integration.js         # ⭐新增 LLM 集成
├── prompts/
│   ├── mia-ui-ux.md
│   ├── sophia-accessibility.md
│   ├── tariq-security.md
│   ├── leila-content.md
│   ├── viktor-performance.md      # ⭐新增
│   ├── zanele-mobile.md           # ⭐新增
│   └── pete-chatbot.md            # ⭐新增
├── skills/
│   ├── SKILL.md                   # 更新 v2.0 文档
│   └── index.js                   # 更新 v2.0 实现
└── examples/
    └── basic-test.js
```

---

## 🎯 功能对比

| 功能 | v1.0 | v2.0 |
|------|------|------|
| **Agent 角色** | 4 个 | 7 个 (+3) |
| **LLM 集成** | ❌ | ✅ (3 提供商) |
| **PDF 导出** | ❌ | ✅ |
| **结果去重** | ❌ | ✅ (Jaccard 相似度) |
| **统计信息** | 基础 | 详细（按类型/优先级） |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd hybrid-test-arch
npm install playwright pdfkit node-fetch
```

### 2. 配置环境变量（可选）

```bash
export LLM_API_KEY='your-api-key'
```

### 3. 运行测试

```bash
# 基础测试
node examples/basic-test.js

# 完整测试（代码中配置）
node -e "
const hybrid = require('./skills/index.js');
hybrid.execute({
    url: 'https://example.com',
    agents: ['mia', 'sophia', 'viktor'],
    exportPDF: true
});
"
```

---

## 📈 性能影响

| 功能 | 时间影响 | 成本影响 |
|------|---------|---------|
| 基础爬取 | - | $0 |
| + 提示词分析 | +1-2 秒/页 | $0 |
| + LLM 分析 | +3-5 秒/页 | $0.01-0.03/页 |
| + PDF 导出 | +1-2 秒 | $0 |
| + 去重 | +0.1 秒 | $0 |

---

## 💡 最佳实践

### 推荐配置

**日常测试：**
```javascript
{
    agents: ['mia', 'sophia'],
    useLLM: false,
    exportPDF: false
}
```

**发布前测试：**
```javascript
{
    agents: ['mia', 'sophia', 'tariq', 'leila'],
    useLLM: false,
    exportPDF: true
}
```

**合规审计：**
```javascript
{
    agents: ['sophia', 'tariq'],
    useLLM: true,
    llmProvider: 'anthropic',
    exportPDF: true
}
```

**性能优化：**
```javascript
{
    agents: ['viktor', 'zanele'],
    useLLM: false,
    exportPDF: false
}
```

---

## 🔧 故障排除

### PDF 导出失败

```
⚠️  PDF 导出失败，请安装 pdfkit: npm install pdfkit
```

**解决：**
```bash
npm install pdfkit
```

### LLM API 调用失败

```
❌ LLM 调用失败：Invalid API key
```

**解决：**
- 检查 API Key 是否正确
- 检查网络连接
- 检查账户余额

### 去重效果不佳

```javascript
// 调整相似度阈值
const deduplicator = new ResultDeduplicator({
    similarityThreshold: 0.7  // 降低阈值（更严格）
});
```

---

*实现：测试仔 🧪 | 全栈资深测试专家视角*
