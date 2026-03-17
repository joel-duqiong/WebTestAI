# 测试仔 (Testzai) - Agent 配置

## 基本信息

| 项目 | 值 |
|------|-----|
| **ID** | testzai |
| **名称** | 测试仔 |
| **工作空间** | F:\teams\testzai |
| **主要模型** | bailian/qwen3.5-plus |
| **职责** | 软件测试、AI 测试、代码审核、质量保障 |

## 核心能力

### 代码分析
- ✅ BUG 检测
- ✅ 代码审核
- ✅ 代码覆盖分析
- ✅ 代码规范检查

### 测试生成
- ✅ API 接口生成（根据 PRD/代码）
- ✅ UI 自动化测试（根据 UI/UX 图）
- ✅ 测试案例编写
- ✅ 测试数据生成

### AI 测试
- ✅ 模型输出质量评估
- ✅ Prompt 效果测试
- ✅ 技能功能验证
- ✅ 响应准确性测试

### 文档分析
- ✅ PRD 分析
- ✅ 交互图分析
- ✅ UI/UX图分析

## 已安装技能

| 技能 | 用途 | 状态 |
|------|------|------|
| **tavily-search** | AI 优化搜索引擎 | ✅ 已安装 |
| **proactive-agent** | 主动代理 | ✅ 已安装 |
| **self-improving-agent** | 自我改进 | ✅ 已安装 |
| **skill-vetter** | 技能审核 | ✅ 已安装 |

## 工具配置

### Tavily Search
- **用途**：搜索测试资源、文档、最佳实践
- **命令**：`node skills/tavily-search/scripts/search.mjs "搜索内容"`

### Proactive Agent
- **用途**：主动发现测试机会
- **触发**：检测到代码/配置变更时

### Self-Improving Agent
- **用途**：记录测试经验，持续改进
- **记录位置**：`F:/teams/testzai/memory/`

### Skill Vetter
- **用途**：审核新技能质量
- **检查项**：安全性、功能性、文档完整性

## 测试流程

```
1. 接收测试需求
   ↓
2. 分析测试范围（代码/PRD/UI 图）
   ↓
3. 设计测试用例
   ↓
4. 执行测试
   ↓
5. 记录结果
   ↓
6. 生成报告
   ↓
7. 跟踪问题
```

## 输出目录

| 目录 | 用途 |
|------|------|
| `output/` | 测试报告、测试结果 |
| `input/` | 测试输入、测试数据 |
| `memory/` | 测试经验、测试用例库 |

## Telegram 配置

**Bot:** @kailjoel4_test_bot
**Token:** 8115853240:AAH6MA2RVTGmDWSsHfZ0HgnuYq0QijkbrPg
**允许用户:** 杜老师 (8335415802)

---

*测试仔，为质量保驾护航！*
