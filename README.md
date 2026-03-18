# WebTestAI 🧪

**基于 Playwright + 33 个动态 Agent 的智能 Web 测试平台**

> 版本：v5.4 | 架构：Hybrid Test Arch v3.1

---

## 📖 项目简介

WebTestAI 是一个智能化的 Web 应用测试平台，核心思路是：**爬取页面 → 识别页面类型 → 动态匹配 Agent → 生成专项测试 → 输出可视化报告**。

系统内置 33 个测试 Agent，每个 Agent 拥有独立的测试提示词和匹配规则。当爬取到一个页面时，系统会自动提取 DOM 特征（表单、导航、视频、商品卡片等），根据特征动态匹配最合适的 Agent 组合，然后执行基础测试和专项测试。

---

## 🚀 核心功能

### 1. 智能爬取
- 基于 Playwright 自动爬取网站页面
- 支持 SPA 单页应用（Next.js、Nuxt.js、React/Vue）
- 智能链接发现与去重
- 可配置最大页面数和爬取深度
- 自动截图和 DOM 特征提取

### 2. 动态 Agent 匹配
- **33 个测试 Agent**，覆盖 20 种页面类型 + 7 个通用维度 + 6 个合规/专项维度
- 基于 URL 模式、DOM 特征、页面内容自动识别页面类型
- 每个页面匹配多个 Agent，同时执行基础测试和专项测试
- 通用 Agent（无障碍、安全、性能、内容、移动端）对所有页面生效

### 3. 基础测试 + 专项测试
- **基础测试**：页面标题、内容完整性、HTTP 状态码
- **专项测试**：根据匹配的 Agent 动态生成（如首页 Banner 检测、表单校验、商品卡片检测等）
- 支持 LLM 深度分析（可选）：将页面数据 + Agent 提示词发送给大模型，获取更深入的问题分析

### 4. HTML 报告
- 可视化 HTML 报告，包含每页截图和问题卡片
- 测试通过/失败统计、Agent 匹配详情
- 问题优先级排序
- 支持 PDF 导出（可选）

---

## 🤖 33 个 Agent 角色表

### 页面类型 Agent（20 个）

根据 URL 和 DOM 特征自动匹配对应页面类型：

| # | Agent ID | 角色名称 | 匹配条件 |
|---|----------|----------|----------|
| 1 | `homepage` | 首页测试员 | 路径为 `/`、`/home`、`/index.html` 等 |
| 2 | `about-pages` | 关于页面测试员 | URL 含 `/about`、`/关于`、`/our-story` 等 |
| 3 | `contact-pages` | 联系页面测试员 | URL 含 `/contact` 或页面有联系表单 |
| 4 | `pricing-pages` | 定价页面测试员 | URL 含 `/pricing` 或内容含定价关键词 |
| 5 | `landing-pages` | 落地页测试员 | URL 含 `/lp`、`/landing` 或有 CTA + Banner |
| 6 | `product-catalog` | 产品目录测试员 | URL 含 `/products`、`/shop` 或有商品卡片 |
| 7 | `product-details` | 产品详情测试员 | URL 含 `/product/xxx` 或有加购按钮 |
| 8 | `shopping-cart` | 购物车测试员 | URL 含 `/cart`、`/basket` |
| 9 | `checkout` | 结账流程测试员 | URL 含 `/checkout`、`/payment` |
| 10 | `signup` | 注册流程测试员 | URL 含 `/signup`、`/login` 或有密码输入框 |
| 11 | `search-box` | 搜索框测试员 | 页面存在搜索输入框 |
| 12 | `search-results` | 搜索结果测试员 | URL 含 `?q=`、`/search` |
| 13 | `news` | 新闻页面测试员 | URL 含 `/news`、`/blog` 或有 `<article>` 标签 |
| 14 | `video` | 视频测试员 | 页面有 `<video>` 或 YouTube/Bilibili 嵌入 |
| 15 | `social-feed` | 社交动态测试员 | URL 含 `/feed`、`/timeline` |
| 16 | `social-profiles` | 社交资料测试员 | URL 含 `/profile`、`/user` 或有头像元素 |
| 17 | `ai-chatbots` | AI 聊天机器人测试员 | 页面有 Chat Widget（Intercom/Crisp 等） |
| 18 | `javascript-booking-flows` | 预订流程测试员 | URL 含 `/booking` 或有日期选择器 |
| 19 | `error-messages-careers-pages` | 错误消息/招聘页测试员 | URL 含 `/careers`、`/jobs` 或 HTTP 4xx/5xx |
| 20 | `genai-code` | 生成式 AI 代码测试员 | 内容含 AI 代码生成相关关键词 |

### 通用 Agent（7 个）

对所有页面生效或按条件触发：

| # | Agent ID | 角色名称 | 触发条件 |
|---|----------|----------|----------|
| 21 | `ui-ux-forms` | UI/UX 表单测试员 (Mia) | 页面有表单或输入框 |
| 22 | `accessibility` | 无障碍测试员 (Sophia) | ✅ 所有页面 |
| 23 | `security-owasp` | 安全测试员 (Tariq) | ✅ 所有页面 |
| 24 | `content` | 内容测试员 (Leila) | ✅ 所有页面 |
| 25 | `performance-core-web-vitals` | 性能测试员 (Viktor) | ✅ 所有页面 |
| 26 | `mobile` | 移动端测试员 (Zanele) | ✅ 所有页面 |
| 27 | `console-logs` | 控制台日志测试员 | 页面有控制台日志输出 |

### 合规/专项 Agent（6 个）

按页面特征条件触发：

| # | Agent ID | 角色名称 | 触发条件 |
|---|----------|----------|----------|
| 28 | `privacy-cookie-consent` | 隐私/Cookie 测试员 | 页面有 Cookie Banner 或隐私相关内容 |
| 29 | `gdpr-compliance` | GDPR 合规测试员 | 内容含 GDPR/隐私政策关键词 |
| 30 | `wcag-compliance` | WCAG 合规测试员 | 手动指定时启用 |
| 31 | `i18n-localization` | 国际化测试员 | 页面有语言切换器或 URL 含语言代码 |
| 32 | `networking-connectivity` | 网络连接测试员 | 手动指定时启用 |
| 33 | `system-errors` | 系统错误测试员 | HTTP 4xx/5xx 或控制台有 error 日志 |

---

## ⚡ 快速开始

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
node scripts/full-stack-test-v5.3-report.js <输出目录> <目标URL> [最大页面数] [爬取深度]
```

**示例：**

```bash
# 测试 example.com，爬取 20 页，深度 3 层
node scripts/full-stack-test-v5.3-report.js output/test-example https://example.com 20 3

# 测试本地服务，默认 50 页
node scripts/full-stack-test-v5.3-report.js output/test-local http://localhost:3000
```

测试完成后，在输出目录中查看 `report.html` 报告文件。

---

## 📦 项目结构

```
WebTestAI/
├── README.md                              # 项目说明
├── package.json                           # 依赖配置（Playwright）
├── scripts/                               # 测试执行脚本
│   ├── full-stack-test-v5.3-report.js     # 主测试执行器 v5.4（爬取→动态Agent→报告）
│   ├── test-runner.js                     # 基础测试运行器
│   ├── compare-reports.js                 # 报告对比工具
│   └── full-stack-test-v5.2-fix.js        # v5.2 旧版（保留兼容）
├── src/                                   # 核心源代码
│   └── hybrid-test-arch-v3/               # 混合测试架构 v3
│       ├── page-classifier.js             # 页面类型识别器（33个Agent匹配规则）
│       ├── analyzer.js                    # 智能分析层（动态测试用例生成）
│       ├── crawler.js                     # Playwright 页面爬取器
│       ├── html-reporter.js               # HTML 报告生成器（截图+问题卡片）
│       ├── llm-integration.js             # LLM 大模型集成（多厂商支持）
│       ├── deduplication.js               # 测试结果去重与聚合
│       ├── pdf-exporter.js                # PDF 报告导出
│       ├── storage.js                     # 测试数据持久化存储
│       ├── skills/                        # OpenClaw 技能集成
│       │   └── index.js                   # 技能入口（编排爬取→分析→报告流程）
│       ├── prompts/                       # 33个Agent的测试提示词
│       │   ├── homepage.md                # 首页测试提示词
│       │   ├── accessibility.md           # 无障碍测试提示词
│       │   ├── security-owasp.md          # 安全测试提示词
│       │   ├── content.md                 # 内容测试提示词
│       │   ├── mobile.md                  # 移动端测试提示词
│       │   └── ...                        # 共 33+ 个 prompt 文件
│       └── examples/                      # 使用示例
│           └── v3-demo.js                 # 架构演示脚本
└── output/                                # 测试报告输出目录
    └── test-xxx/                          # 按次生成的测试结果
        ├── report.html                    # HTML 可视化报告
        ├── screenshots/                   # 页面截图
        └── data.json                      # 原始测试数据
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Node.js** | 运行环境 |
| **Playwright** | 浏览器自动化、页面爬取��截图 |
| **LLM 集成**（可选） | 深度页面分析，支持 Qwen3.5+/GPT-4o/Claude |

### LLM 配置（可选）

如需启用 LLM 深度分析，设置环境变量：

```bash
# 阿里云百炼（推荐，中文支持好）
LLM_PROVIDER=bailian
LLM_API_KEY=your_api_key

# OpenAI
LLM_PROVIDER=openai
LLM_API_KEY=your_api_key

# Anthropic Claude
LLM_PROVIDER=anthropic
LLM_API_KEY=your_api_key
```

---

## 📊 架构原理流程图

```
用户输入 URL
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 1: 智能爬取 (crawler.js + Playwright)            │
│                                                         │
│  URL → 启动浏览器 → 逐页访问 → 每页获取：               │
│  · HTTP 状态码 / 加载时间 / 页面标题                     │
│  · 页面截图 (base64)                                    │
│  · DOM 特征提取 (20+ 维度)                               │
│    ├─ 表单? 搜索框? 视频? 登录框?                        │
│    ├─ 购物车? 产品卡片? Cookie 提示?                     │
│    └─ 导航结构? Banner? CTA? 语言切换?                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 2: 动态 Agent 匹配 (page-classifier.js)          │
│                                                         │
│  每个页面的 URL + DOM 特征 → 规则匹配引擎                │
│                                                         │
│  33 个 Agent，3 类匹配策略：                             │
│                                                         │
│  ① 页面类型 Agent (20个) — 按 URL + 内容匹配            │
│     /product → 产品目录测试员                            │
│     /about   → 关于页面测试员                            │
│     /cart    → 购物车测试员  ...                         │
│                                                         │
│  ② 通用 Agent (7个) — 每个页面都参与                     │
│     Sophia(无障碍) Tariq(安全) Leila(内容)               │
│     Viktor(性能)   Zanele(移动端) ...                    │
│                                                         │
│  ③ 条件 Agent (6个) — 检测到特征才激活                   │
│     有 Cookie → 隐私测试员                               │
│     有多语言 → 国际化测试员                               │
│     有 JS 错误 → 控制台日志测试员  ...                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 3: 测试执行 (analyzer.js)                        │
│                                                         │
│  每个页面生成两类测试用例：                               │
│                                                         │
│  基础测试 (8项固定)           动态测试 (按 Agent 生成)    │
│  ├─ HTTPS 检查               ├─ 图片 Alt 属性           │
│  ├─ 加载时间 < 10s           ├─ 导航可用性               │
│  ├─ 页面标题存在             ├─ 控制台错误               │
│  ├─ 内部链接检查             ├─ 商品卡片展示             │
│  ├─ 截图成功                 ├─ Cookie 提示              │
│  ├─ HTTP 状态正常            ├─ 语言切换器               │
│  ├─ 页面内容存在             ├─ 首页 Banner              │
│  └─ viewport 正确            └─ 视频元素 ...             │
│                                                         │
│  合并 → 每页 17~21 个测试用例                            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 4: 问题收集                                      │
│                                                         │
│  HTTP 错误 (404/500) ───→ 自动生成问题卡片               │
│  页面加载失败 ───────────→ 自动生成问题卡片               │
│  测试用例未通过 ─────────→ 自动生成问题卡片               │
│  LLM 深度分析 (可选) ───→ AI 发现的问题卡片              │
│                                                         │
│  每张卡片包含：                                          │
│  · 问题标题 + 优先级 (P1-P10) + 置信度                   │
│  · 为什么是问题 + 修复建议                                │
│  · 复现步骤 + 给开发/AI 的修复提示词                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 5: 报告生成 (html-reporter.js)                   │
│                                                         │
│  ┌────────────────────────────────────────────┐         │
│  │  HTML 可视化报告                            │         │
│  │  ├─ 📊 概览 (页面数/通过率/问题数)           │         │
│  │  ├─ 🤖 Agent 角色卡片 (名称/覆盖页/测试数)   │         │
│  │  ├─ 📑 页面测试结果表                        │         │
│  │  │   ├─ 📸 每页截图                          │         │
│  │  │   └─ 📋 测试用例详情 (通过/失败)           │         │
│  │  └─ ⚠️ 发现的问题 (卡片式展示)               │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**核心创新：** 不是预先指定测试什么，而是根据页面实际内容 **动态决定** 需要哪些 Agent。
比如电商页面自动派出产品目录+购物车测试员，新闻页面自动派出内容+文章结构测试员。

---

## ⚠️ 注意事项

1. **爬取礼貌** — 设置合理的 `maxPages` 和爬取深度，避免对目标服务器造成压力
2. **API 成本** — 启用 LLM 分析会产生 API 费用，建议先不启用 LLM 做基础测试
3. **隐私保护** — 不要爬取需要登录的敏感页面
4. **环境变量** — API Key 等敏感信息请放入 `.env` 文件，不要提交到 Git

---

## 📄 许可证

ISC

---

*WebTestAI v5.4 — 质量是测试出来的，不是保证出来的 🧪*
