# 全栈自动化测试流程文档

**版本:** v4.0  
**最后更新:** 2026-03-17  
**适用项目:** Web 网站自动化测试  
**测试框架:** OpenClaw × OpenTestAI

---

## 📋 目录

1. [测试流程概述](#1-测试流程概述)
2. [测试前准备](#2-测试前准备)
3. [测试执行流程](#3-测试执行流程)
4. [测试检查项](#4-测试检查项)
5. [问题管理](#5-问题管理)
6. [报告输出](#6-报告输出)
7. [清理与归档](#7-清理与归档)

---

## 1. 测试流程概述

### 1.1 测试目标

- ✅ 检测网站功能问题（包括 404 页面）
- ✅ 验证页面加载性能
- ✅ 检查页面内容和 SEO
- ✅ 生成可视化测试报告
- ✅ 提供问题复现步骤和修复建议

### 1.2 测试范围

| 测试类型 | 覆盖内容 |
|----------|---------|
| **页面测试** | 首页、产品页、购物车、结算页、登录页等 |
| **功能检查** | 标题、内容、链接、加载性能 |
| **错误检测** | 404 页面、加载失败、JS 错误 |
| **性能测试** | 页面加载时间（目标<3 秒） |

### 1.3 测试工具

- **运行环境:** Node.js v24+
- **浏览器自动化:** Playwright
- **测试框架:** OpenClaw
- **报告格式:** HTML (内嵌截图) + JSON

---

## 2. 测试前准备

### 2.1 环境检查

```bash
# 检查 Node.js 版本
node --version  # 需要 v24+

# 检查 Playwright 是否安装
npm list playwright  # 需要已安装

# 检查测试脚本是否存在
ls output/test-session/full-stack-test-v4-fix.js
```

### 2.2 配置测试参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `TEST_DIR` | 测试结果保存目录 | `output/test-chagee-v4-YYYYMMDD-HHMMSS` |
| `BASE_URL` | 被测网站基础 URL | `https://chagee.com/zh-cn` |
| `TIMEOUT` | 页面加载超时时间 | `10000ms (10 秒)` |
| `VIEWPORT` | 浏览器窗口大小 | `1280x800` |

### 2.3 定义测试页面

在测试脚本中配置要测试的页面列表：

```javascript
const PAGES_TO_TEST = [
    { 
        path: '/', 
        name: '首页', 
        priority: 'P0',
        checks: ['title', 'content', 'links', 'performance']
    },
    { 
        path: '/product', 
        name: '产品列表页', 
        priority: 'P0',
        checks: ['title', 'content', 'links', 'performance']
    },
    // ... 更多页面
];
```

**优先级说明:**
- **P0:** 核心页面（首页、产品页）
- **P1:** 重要页面（登录、注册）
- **P2:** 次要页面（关于、帮助）

---

## 3. 测试执行流程

### 3.1 完整流程图

```
开始
  ↓
初始化浏览器 (Playwright)
  ↓
创建浏览器上下文
  ↓
┌─────────────────────────────────┐
│  遍历每个测试页面               │
│                                 │
│  1. 导航到页面 URL              │
│  2. 检查 HTTP 状态码 (404 检测)  │
│  3. 等待页面加载完成            │
│  4. 执行页面检查项              │
│  5. 截图保存                    │
│  6. 保存 DOM 快照               │
│  7. 记录测试结果                │
└─────────────────────────────────┘
  ↓
关闭浏览器
  ↓
生成 HTML 报告
  ↓
生成 JSON 报告
  ↓
自动打开 HTML 报告
  ↓
结束
```

### 3.2 详细执行步骤

#### 步骤 1: 启动浏览器

```javascript
const browser = await chromium.launch({ 
    headless: true,  // 无头模式
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
    ]
});
```

#### 步骤 2: 创建测试上下文

```javascript
const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
});
```

#### 步骤 3: 页面测试循环

对每个配置的页面执行：

```javascript
for (const pageConfig of PAGES_TO_TEST) {
    const page = await context.newPage();
    
    // 3.1 导航到页面
    const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
    });
    
    // 3.2 检查 404
    if (response.status() === 404) {
        // 记录 404 错误
        continue;
    }
    
    // 3.3 等待页面稳定
    await page.waitForTimeout(1000);
    
    // 3.4 执行检查项
    const checks = await executeChecks(page);
    
    // 3.5 截图
    await page.screenshot({ path: 'screenshot.png' });
    
    // 3.6 保存 DOM
    fs.writeFileSync('dom.html', await page.content());
    
    // 3.7 记录结果
    results.push({ pageConfig, checks, status: 'success' });
    
    await page.close();
}
```

#### 步骤 4: 执行页面检查

```javascript
async function executeChecks(page) {
    const checks = [];
    
    // 检查 1: 页面标题
    const title = await page.title();
    checks.push({
        name: '页面标题',
        passed: title && title.length >= 3,
        expected: '标题长度>=3 字符',
        actual: `"${title}" (${title.length}字符)`
    });
    
    // 检查 2: 页面内容
    const bodyText = await page.textContent('body');
    checks.push({
        name: '页面内容',
        passed: bodyText.length > 100,
        expected: '内容>100 字符',
        actual: `${bodyText.length}字符`
    });
    
    // 检查 3: 链接检查（抽样）
    // ...
    
    // 检查 4: 加载性能
    checks.push({
        name: '加载性能',
        passed: loadTime < 3000,
        expected: '<3 秒',
        actual: `${loadTime}ms`
    });
    
    return checks;
}
```

#### 步骤 5: 生成报告

```javascript
// JSON 报告
fs.writeFileSync('summary.json', JSON.stringify(summary, null, 2));

// HTML 报告（内嵌截图 Base64）
const html = generateHtmlReport(summary);
fs.writeFileSync('report.html', html);

// 自动打开
require('child_process').exec(`start "report.html" "report.html"`);
```

---

## 4. 测试检查项

### 4.1 页面标题检查

| 检查项 | 说明 | 通过标准 |
|--------|------|---------|
| 标题存在 | `<title>` 标签存在 | 是 |
| 标题长度 | 标题字符数 | >= 3 字符 |
| 标题内容 | 包含品牌名或页面名 | 是 |

**失败示例:**
```
预期：标题长度>=3 字符
实际："" (0 字符)
```

### 4.2 页面内容检查

| 检查项 | 说明 | 通过标准 |
|--------|------|---------|
| 内容存在 | `<body>` 标签有内容 | 是 |
| 内容长度 | 文本字符数 | > 100 字符 |
| 内容质量 | 无乱码或空白 | 是 |

**失败示例:**
```
预期：内容>100 字符
实际：内容过少或为空
```

### 4.3 链接检查

| 检查项 | 说明 | 通过标准 |
|--------|------|---------|
| 链接存在 | 页面有 `<a>` 标签 | 是 |
| 链接有效 | 无 404 链接（抽样） | 是 |
| 链接描述 | 链接有文本或 aria-label | 是 |

### 4.4 加载性能检查

| 检查项 | 说明 | 通过标准 |
|--------|------|---------|
| 加载时间 | DOMContentLoaded 时间 | < 3000ms |
| 资源加载 | 主要资源加载完成 | 是 |
| 无阻塞 | 无长时间阻塞 | 是 |

**性能等级:**
- 🟢 优秀：< 1 秒
- 🟡 良好：1-3 秒
- 🔴 需优化：> 3 秒

### 4.5 404 检测

| 检查项 | 说明 | 通过标准 |
|--------|------|---------|
| HTTP 状态 | 响应状态码 | 200 OK |
| 错误页面 | 非自定义 404 页 | 是 |

**404 处理:**
```
状态：404
优先级：P0 页面 → P9 问题
优先级：P1 页面 → P7 问题
复现：访问 URL → 观察状态码
```

---

## 5. 问题管理

### 5.1 问题分级

| 级别 | 优先级 | 说明 | 响应时间 |
|------|--------|------|---------|
| **P9** | 紧急 | 核心功能 404 | 立即 |
| **P8** | 严重 | 核心功能失败 | 24 小时 |
| **P7** | 重要 | 重要页面 404 | 3 天 |
| **P6** | 一般 | 性能问题 | 1 周 |
| **P5** | 轻微 | SEO 问题 | 2 周 |

### 5.2 问题报告格式

每个问题包含以下信息：

```json
{
  "page": "购物车页",
  "bug_title": "页面 404 错误",
  "bug_type": ["Functional", "404"],
  "bug_priority": 9,
  "bug_confidence": 10,
  "reproduction_steps": "1. 访问 URL\n2. 观察 HTTP 状态码",
  "expected_result": "HTTP 200 OK",
  "actual_result": "HTTP 404 Not Found",
  "suggested_fix": "检查路由配置或创建该页面"
}
```

### 5.3 问题跟踪流程

```
发现 → 记录 → 分级 → 分配 → 修复 → 验证 → 关闭
```

---

## 6. 报告输出

### 6.1 HTML 报告

**特点:**
- ✅ 在线可视化
- ✅ 截图内嵌（Base64）
- ✅ 响应式设计
- ✅ 深色模式
- ✅ 问题复现步骤
- ✅ 修复建议

**文件位置:**
```
{TEST_DIR}/reports/report.html
```

**打开方式:**
```bash
# 自动打开（测试完成后）
start "report.html" "report.html"

# 或手动打开
file://{TEST_DIR}/reports/report.html
```

### 6.2 JSON 报告

**用途:**
- 数据分析
- 问题导入（Jira 等）
- 历史对比
- CI/CD 集成

**文件位置:**
```
{TEST_DIR}/reports/summary.json
```

**结构:**
```json
{
  "testType": "full-stack-fix",
  "version": "4.0",
  "timestamp": "2026-03-17T13:09:12.930Z",
  "baseUrl": "https://chagee.com/zh-cn",
  "summary": {
    "pagesTested": 7,
    "pagesSuccess": 4,
    "pages404": 3,
    "totalIssues": 3
  },
  "pages": [...],
  "issues": [...]
}
```

### 6.3 报告解读

**摘要部分:**
- 页面总数
- 成功数量
- 404 数量
- 失败数量
- 问题总数

**详细部分:**
- 每个页面的检查结果
- 每个问题的详细信息
- 截图证据

---

## 7. 清理与归档

### 7.1 测试目录清理

```powershell
# 删除单个测试目录
Remove-Item "F:\teams\testzai\output\test-chagee-v4-20260317-210911" -Recurse -Force

# 删除所有 v4 测试
Remove-Item "F:\teams\testzai\output\test-chagee-v4-*" -Recurse -Force
```

### 7.2 报告归档

**建议保留:**
- ✅ 最终版报告
- ✅ 有重大问题的报告
- ✅ 版本发布前的报告

**可以删除:**
- ❌ 测试过程中的临时报告
- ❌ 重复测试的报告
- ❌ 超过 3 个月的日常报告

### 7.3 历史对比

将 JSON 报告按版本归档，用于：
- 问题趋势分析
- 质量改进追踪
- 回归测试对比

---

## 附录

### A. 快速启动命令

```bash
# 1. 进入测试脚本目录
cd F:\teams\testzai\output\test-session

# 2. 执行测试（自动生成时间戳目录）
$testDir = "F:\teams\testzai\output\test-chagee-v4-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node full-stack-test-v4-fix.js $testDir "https://chagee.com/zh-cn"

# 3. 查看报告
# 报告会自动打开，或手动访问：
# file://{testDir}/reports/report.html

# 4. 清理（可选）
Remove-Item $testDir -Recurse -Force
```

### B. 常见问题

**Q1: 测试超时怎么办？**
- 检查网络连接
- 增加 timeout 值（默认 10 秒）
- 检查服务器状态

**Q2: 截图失败怎么办？**
- 检查目录权限
- 确保磁盘空间充足
- 使用 safeScreenshot 降级处理

**Q3: 如何添加新的测试页面？**
- 编辑 `PAGES_TO_TEST` 数组
- 添加页面配置
- 重新运行测试

### C. 最佳实践

1. **定期测试:** 每天/每周自动执行
2. **版本对比:** 每次发布前测试
3. **问题跟踪:** 所有问题录入跟踪系统
4. **报告归档:** 保留重要版本报告
5. **持续改进:** 根据测试结果优化网站

---

**文档版本:** v4.0  
**维护者:** 测试仔 (Testzai)  
**最后更新:** 2026-03-17

*OpenTestAI × OpenClaw 全栈测试方案*
