# 混合测试架构 v3.0 - 爬取与分析分离

**发布时间:** 2026-03-18 00:40
**重大改进:** 爬取与分析完全分离

---

## 🎯 核心改进

### v2.0 的问题（您指出的）

```javascript
// ❌ 问题：爬取和分析绑定
const results = await hybridTest.execute({
    url: 'https://example.com',
    agents: ['mia', 'sophia'],  // 这里就固定了！
    maxPages: 30
});

// 想换 Agent？重新爬取！
// 想添加 Agent？重新爬取！
// 浪费资源！
```

### v3.0 的解决方案（正确！）

```javascript
// ✅ 正确：爬取和分析分离

// Step 1: 爬取一次（保存数据）
const session = await createSession({
    url: 'https://example.com',
    maxPages: 50
});

// Step 2: 动态添加分析（可多次）
await session.analyze(['mia']);      // 第一次
await session.analyze(['sophia']);   // 第二次
await session.analyze(['viktor']);   // 第三次

// Step 3: 生成综合报告
await session.report();
```

---

## 🏗️ 架构对比

### v2.0 架构

```
┌─────────────────────────────────┐
│  execute()                      │
│    ├─ 爬取页面                  │
│    ├─ 立即分析（固定 Agent）    │
│    └─ 生成报告                  │
└─────────────────────────────────┘

问题：
❌ Agent 在爬取时就固定
❌ 无法动态添加
❌ 重复爬取浪费资源
```

### v3.0 架构

```
┌─────────────────────────────────┐
│  createSession()                │
│    └─ 爬取页面 → 保存数据       │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  session.analyze()              │
│    └─ 动态添加 Agent（可多次）  │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  session.report()               │
│    └─ 生成综合报告              │
└─────────────────────────────────┘

优势:
✅ 爬取一次，多次分析
✅ 动态添加 Agent
✅ 节省资源
✅ 灵活组合
```

---

## 🚀 使用方式

### 示例 1: 基础使用

```javascript
const { createSession } = require('hybrid-test-arch-v3');

// 1. 创建会话（爬取）
const session = await createSession({
    url: 'https://chagee.com/zh-cn',
    maxPages: 50,
    saveDir: './test-data'
});

// 2. 添加分析（可多次）
await session.analyze(['mia', 'sophia']);

// 3. 生成报告
await session.report();
```

---

### 示例 2: 多次分析

```javascript
// 爬取一次
const session = await createSession({
    url: 'https://chagee.com/zh-cn',
    maxPages: 50
});

// 多次分析（不同组合）
await session.analyze(['mia']);           // UI/UX
await session.analyze(['sophia']);        // 无障碍
await session.analyze(['tariq']);         // 安全
await session.analyze(['viktor']);        // 性能
await session.analyze(['zanele']);        // 移动端

// 生成综合报告
await session.report();
```

---

### 示例 3: 使用 LLM

```javascript
const session = await createSession({
    url: 'https://chagee.com/zh-cn',
    maxPages: 50
});

// 使用真实 LLM 分析
await session.analyze(['mia', 'sophia'], {
    useLLM: true,
    llmProvider: 'openai',
    llmApiKey: process.env.LLM_API_KEY
});

await session.report();
```

---

### 示例 4: 加载已有会话

```javascript
const DataStorage = require('hybrid-test-arch-v3/core/storage');
const storage = new DataStorage('./test-data');

// 列出所有会话
const sessions = storage.listSessions();
console.log(sessions);

// 加载会话
const session = await storage.loadSession('sessionId');

// 继续分析
await session.analyze(['new-agent']);
```

---

## 📁 数据保存结构

```
test-data/
├── {sessionId}/
│   ├── metadata.json          # 会话元数据
│   ├── pages/
│   │   ├── page-0.json        # 页面 1 数据
│   │   ├── page-1.json        # 页面 2 数据
│   │   └── ...
│   └── analysis/
│       ├── mia-1773763xxx.json    # Mia 分析结果
│       ├── sophia-1773764xxx.json # Sophia 分析结果
│       └── ...
```

---

## 💾 页面数据格式

```json
{
  "url": "https://example.com/page1",
  "title": "页面 1",
  "loadTime": 238,
  "status": 200,
  "screenshot": "base64...",
  "html": "<html>...",
  "features": {
    "hasForm": true,
    "hasNavigation": true,
    "linkCount": 31
  },
  "consoleLogs": [],
  "links": []
}
```

---

## 🎯 核心 API

### createSession(options)

**创建测试会话（仅爬取）**

```javascript
const session = await createSession({
    url: 'https://example.com',     // 必需
    maxPages: 50,                    // 可选，默认 50
    timeout: 15000,                  // 可选，默认 15000
    viewport: {1280x800},            // 可选
    saveDir: './test-data'           // 可选，默认./test-data
});
```

**返回:**
```javascript
{
    sessionId: 'abc123',
    baseUrl: 'https://example.com',
    pagesCount: 50,
    storage: DataStorage,
    analyze: async (agents, options) => {...},
    report: async (options) => {...},
    cleanup: async () => {...}
}
```

---

### session.analyze(agents, options)

**添加 Agent 分析**

```javascript
// 基础用法
await session.analyze(['mia', 'sophia']);

// 使用 LLM
await session.analyze(['mia'], {
    useLLM: true,
    llmProvider: 'openai',
    llmApiKey: 'sk-xxx'
});
```

**可调用多次！**

---

### session.report(options)

**生成综合报告**

```javascript
const reportPaths = await session.report({
    format: ['html', 'pdf'],     // 报告格式
    outputDir: './reports'       // 输出目录
});
```

**返回:**
```javascript
{
    html: './reports/report-xxx.html',
    pdf: './reports/report-xxx.pdf'
}
```

---

### session.cleanup()

**清理会话数据**

```javascript
await session.cleanup();
// 删除会话数据
```

---

## 📊 性能对比

| 场景 | v2.0 | v3.0 | 提升 |
|------|------|------|------|
| **单次分析** | 爬取 + 分析 | 爬取 + 分析 | 相同 |
| **2 次分析** | 2 次爬取 | 1 次爬取 +2 分析 | ⬇️ 50% |
| **5 次分析** | 5 次爬取 | 1 次爬取 +5 分析 | ⬇️ 80% |
| **存储** | 不保存 | 持久化 | ✅ 可复用 |

---

## 💡 最佳实践

### 推荐工作流

```javascript
// 1. 爬取一次（早上）
const session = await createSession({
    url: 'https://example.com',
    maxPages: 100
});

// 2. 多次分析（全天）
await session.analyze(['mia']);      // 上午
await session.analyze(['sophia']);   // 下午
await session.analyze(['tariq']);    // 晚上

// 3. 生成报告（下班前）
await session.report();
```

### 团队协作

```javascript
// 成员 A: 爬取
const session = await createSession({...});

// 成员 B: UI/UX 分析
await session.analyze(['mia']);

// 成员 C: 无障碍分析
await session.analyze(['sophia']);

// 成员 D: 生成报告
await session.report();
```

---

## 🔧 文件结构

```
hybrid-test-arch-v3/
├── core/
│   ├── crawler.js           # 爬取模块
│   ├── analyzer.js          # 分析模块
│   ├── storage.js           # ⭐新增 存储模块
│   ├── html-reporter.js     # ⭐新增 HTML 报告
│   ├── pdf-exporter.js      # PDF 导出
│   ├── deduplication.js     # 结果去重
│   └── llm-integration.js   # LLM 集成
├── skills/
│   └── index.js             # ⭐更新 v3.0 API
├── examples/
│   └── v3-demo.js           # ⭐新增 v3 示例
└── prompts/
    └── ...                  # 7 个 Agent 提示词
```

---

## 🎉 您说的对！

| 您的观点 | v2.0 | v3.0 |
|----------|------|------|
| "先爬完所有页面" | ❌ 边爬边分析 | ✅ 先爬取保存 |
| "再动态添加角色" | ❌ 无法添加 | ✅ 可多次添加 |
| "角色使用会不对" | ✅ 确实有问题 | ✅ 已修复 |
| "也不起作用" | ⚠️ 能用但不灵活 | ✅ 完全灵活 |

**感谢您的反馈！v3.0 更合理！** 🫡

---

*实现：测试仔 🧪 | 全栈资深测试专家视角*
