# 测试会话目录

**目标地址:** http://192.168.1.2:3002
**测试时间:** 2026-03-17 20:13
**测试工具:** OpenClaw + Playwright + OpenTestAI 提示词

---

## 目录结构

```
test-YYYYMMDD-HHmmss/
├── artifacts/          # 页面工件
│   ├── screenshot.png  # 页面截图
│   ├── dom.html        # DOM 快照
│   └── console.json    # 控制台日志
├── analysis/           # AI 分析结果
│   ├── ui-ux.json      # UI/UX 分析 (Mia)
│   ├── accessibility.json # 无障碍分析 (Sophia)
│   └── security.json   # 安全分析 (Tariq)
├── reports/            # 测试报告
│   ├── summary.json    # 汇总报告
│   └── summary.html    # HTML 可视化报告
└── README.md           # 本文件
```

---

## 清理方式

```bash
# PowerShell
Remove-Item "F:\teams\testzai\output\test-*" -Recurse -Force

# 或手动删除整个 test-* 目录
```

---

## 测试流程

1. 捕获页面工件 (截图/DOM/日志)
2. AI 测试员分析 (Mia/Sophia/Tariq)
3. 聚合结果生成报告
4. 输出 HTML 可视化报告
