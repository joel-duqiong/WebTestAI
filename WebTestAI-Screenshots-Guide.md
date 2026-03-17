# 📸 WebTestAI 截图指南

## 📁 目录结构

```
docs/images/
├── screenshot-report-overview.png     # 报告总览（README 首图）
├── screenshot-agent-roles.png         # Agent 角色
├── screenshot-test-cases.png          # 测试用例详情
├── screenshot-issues.png              # 问题列表
├── screenshot-statistics.png          # 统计分析
├── screenshot-installation.png        # 安装过程
└── screenshot-usage.png               # 使用示例
```

## 🎯 截图规格

### 技术要求

- **格式:** PNG（无损压缩）
- **尺寸:** 
  - 首图：1920x1080 (16:9)
  - 功能图：1200x800 (3:2)
  - 细节图：800x600 (4:3)
- **质量:** 高清，文字清晰
- **大小:** 每图 < 500KB（优化后）

### 内容要求

✅ **必须包含:**
- 完整的 UI 界面
- 清晰的文字内容
- 真实的数据（脱敏后）
- 深色模式（更专业）

❌ **避免:**
- 敏感信息（API Key、密码等）
- 个人隐私数据
- 过小的文字（看不清）
- 杂乱的背景

## 📷 截图步骤

### 步骤 1: 生成测试报告

```bash
cd F:\teams\testzai\output\test-session\hybrid-test-arch-v3
node -e "const { createSession } = require('./skills/index.js'); (async () => { const session = await createSession({url: 'https://en.wikipedia.org/wiki/Main_Page', maxPages: 5}); await session.analyze(['mia', 'sophia', 'tariq']); await session.report({format: ['html'], outputDir: './reports-webtestai'}); })().catch(console.error);"
```

### 步骤 2: 打开报告

报告会自动在浏览器中打开，或手动访问：
```
file:///F:/teams/testzai/output/test-session/hybrid-test-arch-v3/reports-webtestai/report-xxxxx.html
```

### 步骤 3: 调整视图

**报告总览图:**
1. 滚动到页面顶部
2. 确保显示：标题、摘要卡片、Agent 角色
3. 缩放至 100%

**Agent 角色图:**
1. 滚动到 Agent 信息部分
2. 确保 7 个 Agent 卡片都可见
3. 缩放至 100%

**测试用例图:**
1. 点击任意页面的"📸 查看"按钮
2. 展开测试用例详情
3. 确保截图和测试列表可见

**问题列表图:**
1. 滚动到问题部分
2. 确保问题卡片清晰可见
3. 显示优先级标签

**统计面板图:**
1. 滚动到统计部分
2. 确保优先级和类型统计可见
3. 缩放至 100%

### 步骤 4: 截图

**Windows:**
```
Win + Shift + S  →  选择区域  →  保存
```

**macOS:**
```
Cmd + Shift + 4  →  选择区域  →  保存
```

**Linux:**
```
PrintScreen  或  Flameshot
```

### 步骤 5: 优化图片

**在线工具:**
- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/

**命令行:**
```bash
npm install -g imagemin-cli
imagemin screenshot.png --out-dir=optimized/
```

### 步骤 6: 重命名并保存

```bash
mv screenshot.png docs/images/screenshot-report-overview.png
mv screenshot-agent.png docs/images/screenshot-agent-roles.png
mv screenshot-tests.png docs/images/screenshot-test-cases.png
mv screenshot-issues.png docs/images/screenshot-issues.png
mv screenshot-stats.png docs/images/screenshot-statistics.png
```

## ✅ 截图检查清单

- [ ] 所有图片已压缩（< 500KB）
- [ ] 所有敏感信息已脱敏
- [ ] 文字清晰可读
- [ ] 使用示例网站（Wikipedia）
- [ ] 深色模式显示
- [ ] 尺寸符合规范
- [ ] 文件名规范命名

## 🎨 截图示例

### 报告总览图

```
┌─────────────────────────────────────────┐
│  🧪 混合测试报告 v3.0                    │
│  https://en.wikipedia.org/wiki/...      │
│                                         │
│  ┌────┬────┬────┬────┐                 │
│  │ 5  │ 5  │ 0  │ 0  │                 │
│  │页面│成功│失败│问题│                 │
│  └────┴────┴────┴────┘                 │
│                                         │
│  🤖 参与测试：mia, sophia, tariq        │
│  ┌────────┬────────┬────────┐          │
│  │👁️ Mia │♿ Sophia│🔒 Tariq│          │
│  └────────┴────────┴────────┘          │
└─────────────────────────────────────────┘
```

### Agent 角色图

```
┌─────────────────────────────────────────┐
│  🤖 参与测试的 Agent 角色                │
│                                         │
│  ┌──────────┬──────────┬──────────┐    │
│  │👁️ Mia   │♿ Sophia │🔒 Tariq │    │
│  │UI/UX    │无障碍    │安全     │    │
│  └──────────┴──────────┴──────────┘    │
└─────────────────────────────────────────┘
```

### 测试用例图

```
┌─────────────────────────────────────────┐
│  📄 页面测试结果 (5)                     │
│                                         │
│  #  页面  测试  状态  详情              │
│  1  Wiki  8/8  ✅   📸 查看  ← 点击展开  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📸 页面截图 - Wikipedia          │   │
│  │ [截图内容]                      │   │
│  │                                 │   │
│  │ 📋 测试用例详情                 │   │
│  │ ✅ 页面标题：>=3 字符           │   │
│  │ ✅ 页面内容：>100 字符          │   │
│  │ ✅ 加载性能：<5 秒              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📝 注意事项

1. **使用示例网站** - Wikipedia、example.org 等
2. **避免真实品牌** - 不要使用商业网站截图
3. **脱敏处理** - 确保无敏感信息
4. **统一风格** - 所有截图使用深色模式
5. **文字清晰** - 确保小字也能看清

## 🎯 最终检查

在提交 README 前，确认：

- [ ] 5 张核心截图已准备
- [ ] 所有截图已优化（< 500KB）
- [ ] 文件名规范命名
- [ ] 放在 `docs/images/` 目录
- [ ] README 中图片链接正确
