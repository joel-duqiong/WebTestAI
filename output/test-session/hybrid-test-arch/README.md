# 混合测试架构实现

**版本:** v1.0
**实现时间:** 2026-03-17
**架构:** Playwright + Agent-Browser + OpenTestAI 提示词

---

## 🏗️ 架构设计

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
│  工作流层：Agent-Browser (OpenClaw 技能)                │
│    ├─ 会话管理                                         │
│    ├─ 多技能协作                                       │
│    └─ 结果报告                                         │
│                                                         │
│  智能分析层：OpenTestAI 提示词                          │
│    ├─ Mia (UI/UX)                                      │
│    ├─ Sophia (无障碍)                                  │
│    ├─ Tariq (安全)                                     │
│    └─ Leila (内容)                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

```
hybrid-test-arch/
├── README.md                      # 本文档
├── core/
│   ├── crawler.js                 # Playwright 爬虫层
│   ├── analyzer.js                # OpenTestAI 分析层
│   └── reporter.js                # 报告生成层
├── skills/
│   ├── SKILL.md                   # OpenClaw 技能定义
│   └── index.js                   # 技能入口
├── prompts/
│   ├── mia-ui-ux.md               # UI/UX 测试提示词
│   ├── sophia-accessibility.md    # 无障碍测试提示词
│   ├── tariq-security.md          # 安全测试提示词
│   └── leila-content.md           # 内容测试提示词
├── config/
│   └── default.json               # 默认配置
└── examples/
    └── basic-test.js              # 基础使用示例
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd hybrid-test-arch
npm install playwright
```

### 2. 基础使用

```javascript
const HybridTest = require('hybrid-test-arch');

const tester = new HybridTest({
    baseUrl: 'https://example.com',
    maxPages: 50,
    agents: ['mia', 'sophia', 'tariq'] // 启用的分析 Agent
});

// 执行测试
const results = await tester.run();

// 生成报告
await tester.generateReport(results);
```

### 3. OpenClaw 技能调用

```javascript
// 在 OpenClaw 中
const hybridTest = require('skills/hybrid-test');

const results = await hybridTest.execute({
    url: 'https://example.com',
    options: {
        maxPages: 30,
        agents: ['mia', 'sophia']
    }
});
```

---

## 📊 功能特性

### 基础爬取层 (Playwright)

- ✅ 页面导航
- ✅ 链接收集
- ✅ 截图保存
- ✅ DOM 抓取
- ✅ 控制台日志
- ✅ 网络请求监控

### 智能分析层 (OpenTestAI)

- ✅ UI/UX 检查 (Mia)
- ✅ 无障碍检查 (Sophia)
- ✅ 安全检查 (Tariq)
- ✅ 内容检查 (Leila)

### 工作流层 (Agent-Browser)

- ✅ OpenClaw 会话管理
- ✅ 多技能协作
- ✅ 结果聚合
- ✅ 报告生成

---

## 💡 使用场景

| 场景 | 推荐配置 | 说明 |
|------|---------|------|
| **快速测试** | Playwright only | 仅基础爬取，最快 |
| **标准测试** | Playwright + Mia | 基础 + UI/UX |
| **完整测试** | Playwright + 4 Agents | 全面分析 |
| **合规测试** | Playwright + Sophia + Tariq | 无障碍 + 安全 |

---

## 📝 详细文档

查看各模块文件获取详细说明。

---

*实现：测试仔 🧪 | 全栈资深测试专家视角*
