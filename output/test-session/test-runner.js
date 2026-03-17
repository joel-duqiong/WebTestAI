/**
 * OpenTestAI × OpenClaw 测试运行器
 * 目标：http://192.168.1.2:3002
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_DIR = process.argv[2] || 'F:/teams/testzai/output/test-session';
const TARGET_URL = 'http://192.168.1.2:3002';

console.log('🧪 开始测试验证');
console.log(`📁 测试目录：${TEST_DIR}`);
console.log(`🌐 目标地址：${TARGET_URL}`);
console.log('');

async function main() {
    const artifactsDir = path.join(TEST_DIR, 'artifacts');
    const analysisDir = path.join(TEST_DIR, 'analysis');
    const reportsDir = path.join(TEST_DIR, 'reports');
    
    // 创建目录
    [artifactsDir, analysisDir, reportsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // 1. 捕获页面工件
    console.log('📸 步骤 1: 捕获页面工件...');
    const artifacts = await captureArtifacts(TARGET_URL, artifactsDir);
    console.log(`   ✅ 截图：${artifacts.screenshotPath}`);
    console.log(`   ✅ DOM: ${artifacts.domPath}`);
    console.log(`   ✅ 控制台日志：${artifacts.consolePath}`);
    console.log('');
    
    // 2. 加载测试员配置
    console.log('📋 步骤 2: 加载测试员配置...');
    const testers = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'testers/core-3.json'), 'utf8')).testers;
    console.log(`   ✅ 测试员：${testers.map(t => `${t.name}(${t.specialty})`).join(', ')}`);
    console.log('');
    
    // 3. 为每个测试员生成分析提示词
    console.log('🤖 步骤 3: 生成测试员分析提示词...');
    for (const tester of testers) {
        const promptPath = path.join(analysisDir, `${tester.id}-prompt.md`);
        const prompt = buildTesterPrompt(tester, artifacts);
        fs.writeFileSync(promptPath, prompt, 'utf8');
        console.log(`   ✅ ${tester.name} 提示词：${promptPath}`);
    }
    console.log('');
    
    // 4. 模拟测试员分析结果 (实际应调用 LLM)
    console.log('📊 步骤 4: 执行 AI 分析 (模拟)...');
    const allIssues = [];
    
    for (const tester of testers) {
        console.log(`   🔍 ${tester.name} 分析中...`);
        // 实际应调用 sessions_spawn + LLM
        // 这里生成模拟结果用于演示
        const issues = await simulateTesterAnalysis(tester, artifacts);
        allIssues.push(...issues);
        
        const analysisPath = path.join(analysisDir, `${tester.id}-analysis.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(issues, null, 2), 'utf8');
        console.log(`      发现 ${issues.length} 个问题`);
    }
    console.log('');
    
    // 5. 聚合结果
    console.log('🔧 步骤 5: 聚合结果...');
    const summary = {
        url: TARGET_URL,
        timestamp: new Date().toISOString(),
        totalIssues: allIssues.length,
        byTester: {},
        byPriority: {
            critical: allIssues.filter(i => i.bug_priority >= 8).length,
            medium: allIssues.filter(i => i.bug_priority >= 4 && i.bug_priority < 8).length,
            low: allIssues.filter(i => i.bug_priority < 4).length
        },
        issues: allIssues
    };
    
    // 按测试员分组统计
    for (const tester of testers) {
        const testerIssues = allIssues.filter(i => i.tester === tester.id);
        summary.byTester[tester.id] = testerIssues.length;
    }
    
    const summaryPath = path.join(reportsDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`   ✅ 汇总报告：${summaryPath}`);
    console.log('');
    
    // 6. 生成 HTML 报告
    console.log('📄 步骤 6: 生成 HTML 报告...');
    const htmlPath = path.join(reportsDir, 'summary.html');
    const html = generateHtmlReport(summary, artifacts);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`   ✅ HTML 报告：${htmlPath}`);
    console.log('');
    
    // 7. 完成
    console.log('✅ 测试完成！');
    console.log('');
    console.log('📊 测试结果摘要:');
    console.log(`   总问题数：${summary.totalIssues}`);
    console.log(`   严重 (P8-10): ${summary.byPriority.critical}`);
    console.log(`   中等 (P4-7): ${summary.byPriority.medium}`);
    console.log(`   轻微 (P1-3): ${summary.byPriority.low}`);
    console.log('');
    console.log('📁 所有文件已保存到:');
    console.log(`   ${TEST_DIR}`);
    console.log('');
    console.log('🧹 清理命令:');
    console.log(`   Remove-Item "${TEST_DIR}" -Recurse -Force`);
}

async function captureArtifacts(url, outputDir) {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage({
        viewport: { width: 1280, height: 800 }
    });
    
    // 收集控制台日志
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: Date.now()
        });
    });
    
    // 收集网络请求
    const requests = [];
    page.on('request', req => {
        requests.push({
            url: req.url(),
            method: req.method(),
            timestamp: Date.now()
        });
    });
    
    // 访问页面
    try {
        await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
    } catch (error) {
        console.warn(`⚠️ 页面加载超时或失败：${error.message}`);
    }
    
    // 等待页面稳定
    await page.waitForTimeout(2000);
    
    // 保存截图
    const screenshotPath = path.join(outputDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, type: 'png' });
    
    // 保存 DOM
    const domPath = path.join(outputDir, 'dom.html');
    const dom = await page.content();
    fs.writeFileSync(domPath, dom, 'utf8');
    
    // 保存控制台日志
    const consolePath = path.join(outputDir, 'console.json');
    fs.writeFileSync(consolePath, JSON.stringify(consoleLogs, null, 2), 'utf8');
    
    // 保存网络请求
    const networkPath = path.join(outputDir, 'network.json');
    fs.writeFileSync(networkPath, JSON.stringify(requests, null, 2), 'utf8');
    
    await browser.close();
    
    return {
        url,
        screenshotPath,
        domPath,
        consolePath,
        networkPath,
        consoleLogs,
        requests
    };
}

function buildTesterPrompt(tester, artifacts) {
    return `# ${tester.name} - ${tester.specialty} 测试分析

## 角色
${tester.prompt.split('\n')[0]}

## 页面信息
- URL: ${artifacts.url}
- 截图：${artifacts.screenshotPath}
- DOM: ${artifacts.domPath}
- 控制台日志：${artifacts.consoleLogs.length} 条

## 任务
${tester.prompt}

## 输出格式
返回 JSON 数组，每个问题包含:
{
  "bug_title": "问题标题",
  "bug_type": ["类型"],
  "bug_priority": 1-10,
  "bug_confidence": 1-10,
  "bug_reasoning_why_a_bug": "为什么是问题",
  "suggested_fix": "修复建议",
  "prompt_to_fix_this_issue": "给开发/AI 的修复提示词"
}

## 要求
- 只报告高置信度问题 (confidence >= 7)
- 基于实际页面内容分析
- 提供具体可执行的修复建议
`;
}

async function simulateTesterAnalysis(tester, artifacts) {
    // 模拟测试员分析结果
    // 实际应调用 LLM: sessions_spawn({ task: buildTesterPrompt(...) })
    
    // 这里生成一些示例问题用于演示
    const issues = [];
    
    // 模拟一些问题
    if (tester.id === 'mia') {
        issues.push({
            bug_title: "页面加载状态不明显",
            bug_type: ["UI/UX", "Loading"],
            bug_priority: 5,
            bug_confidence: 7,
            bug_reasoning_why_a_bug: "用户无法明确感知页面是否正在加载，可能导致重复点击或困惑",
            suggested_fix: "添加加载指示器或骨架屏",
            prompt_to_fix_this_issue: "在数据加载时显示 loading spinner 或 skeleton screen，使用 CSS animation 实现平滑过渡"
        });
    }
    
    if (tester.id === 'sophia') {
        issues.push({
            bug_title: "图片缺少 alt 属性",
            bug_type: ["Accessibility", "WCAG", "Images"],
            bug_priority: 7,
            bug_confidence: 9,
            bug_reasoning_why_a_bug: "屏幕阅读器用户无法了解图片内容，违反 WCAG 1.1.1 非文本内容要求",
            suggested_fix: "为所有<img>标签添加描述性 alt 属性",
            prompt_to_fix_this_issue: "检查所有<img>标签，添加有意义的 alt 文本，装饰性图片使用 alt=\"\""
        });
        
        issues.push({
            bug_title: "颜色对比度可能不足",
            bug_type: ["Accessibility", "WCAG", "Contrast"],
            bug_priority: 6,
            bug_confidence: 7,
            bug_reasoning_why_a_bug: "部分文本与背景颜色对比度可能低于 WCAG 4.5:1 要求，影响视障用户阅读",
            suggested_fix: "使用对比度检测工具验证并调整颜色",
            prompt_to_fix_this_issue: "使用 WebAIM Contrast Checker 检测所有文本颜色组合，确保正文文本对比度>=4.5:1"
        });
    }
    
    if (tester.id === 'tariq') {
        issues.push({
            bug_title: "内网地址使用 HTTP 而非 HTTPS",
            bug_type: ["Security", "Transport"],
            bug_priority: 6,
            bug_confidence: 10,
            bug_reasoning_why_a_bug: "HTTP 传输数据未加密，存在中间人攻击风险，即使是内网也应使用 HTTPS",
            suggested_fix: "配置 HTTPS，使用自签名证书或内网 CA",
            prompt_to_fix_this_issue: "在服务器上配置 HTTPS，生成自签名证书或使用 Let's Encrypt，强制 HTTP 重定向到 HTTPS"
        });
    }
    
    // 保存分析结果
    return issues;
}

function generateHtmlReport(summary, artifacts) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenTestAI 测试报告 - ${summary.url}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #161b22 0%, #1a1f2e 100%);
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .url { color: #58a6ff; font-family: monospace; }
        .header .timestamp { color: #8b949e; font-size: 14px; margin-top: 8px; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .summary-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        .summary-card .number {
            font-size: 32px;
            font-weight: 700;
            color: #58a6ff;
        }
        .summary-card.critical .number { color: #f85149; }
        .summary-card.medium .number { color: #d29922; }
        .summary-card.low .number { color: #3fb950; }
        .summary-card .label {
            font-size: 13px;
            color: #8b949e;
            margin-top: 4px;
        }
        
        .issue-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .issue-card:hover { border-color: #58a6ff; }
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .issue-title {
            font-size: 18px;
            font-weight: 600;
            color: #f0f6fc;
        }
        .badges { display: flex; gap: 8px; }
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-priority {
            background: rgba(248, 81, 73, 0.15);
            color: #f85149;
            border: 1px solid rgba(248, 81, 73, 0.3);
        }
        .badge-confidence {
            background: rgba(88, 166, 255, 0.15);
            color: #58a6ff;
            border: 1px solid rgba(88, 166, 255, 0.3);
        }
        .badge-type {
            background: rgba(188, 140, 255, 0.1);
            color: #bc8cff;
            border: 1px solid rgba(188, 140, 255, 0.2);
        }
        .issue-body { color: #c9d1d9; font-size: 14px; }
        .issue-section { margin-bottom: 12px; }
        .issue-section:last-child { margin-bottom: 0; }
        .issue-section h4 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #8b949e;
            margin-bottom: 6px;
        }
        .fix-prompt {
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 12px;
            font-family: 'SFMono-Regular', Consolas, monospace;
            font-size: 13px;
            color: #79c0ff;
        }
        .artifacts {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .artifacts h3 { margin-bottom: 12px; }
        .artifacts ul { list-style: none; }
        .artifacts li {
            padding: 8px 0;
            border-bottom: 1px solid #30363d;
        }
        .artifacts li:last-child { border-bottom: none; }
        .artifacts code {
            background: #0d1117;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
        }
        .footer {
            text-align: center;
            padding: 24px;
            color: #8b949e;
            font-size: 13px;
            border-top: 1px solid #30363d;
            margin-top: 24px;
        }
        .no-issues {
            text-align: center;
            padding: 40px;
            color: #3fb950;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 OpenTestAI 测试报告</h1>
            <div class="url">${summary.url}</div>
            <div class="timestamp">测试时间：${new Date(summary.timestamp).toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="number">${summary.totalIssues}</div>
                <div class="label">总问题数</div>
            </div>
            <div class="summary-card critical">
                <div class="number">${summary.byPriority.critical}</div>
                <div class="label">严重 (P8-10)</div>
            </div>
            <div class="summary-card medium">
                <div class="number">${summary.byPriority.medium}</div>
                <div class="label">中等 (P4-7)</div>
            </div>
            <div class="summary-card low">
                <div class="number">${summary.byPriority.low}</div>
                <div class="label">轻微 (P1-3)</div>
            </div>
        </div>
        
        <div class="artifacts">
            <h3>📁 页面工件</h3>
            <ul>
                <li>截图：<code>${artifacts.screenshotPath}</code></li>
                <li>DOM: <code>${artifacts.domPath}</code></li>
                <li>控制台日志：<code>${artifacts.consolePath}</code></li>
                <li>网络请求：<code>${artifacts.networkPath}</code></li>
            </ul>
        </div>
        
        <h2 style="margin-bottom: 16px;">🐛 发现的问题</h2>
        
        ${summary.issues.length === 0 ? `
        <div class="no-issues">
            <h2>✅ 未发现问题</h2>
            <p>所有测试员未检测到高置信度问题</p>
        </div>
        ` : `
        ${summary.issues.map(issue => `
        <div class="issue-card">
            <div class="issue-header">
                <div class="issue-title">${issue.bug_title}</div>
                <div class="badges">
                    <span class="badge badge-priority">P${issue.bug_priority}</span>
                    <span class="badge badge-confidence">C${issue.bug_confidence}</span>
                    <span class="badge badge-type">${Array.isArray(issue.bug_type) ? issue.bug_type.join(' / ') : issue.bug_type}</span>
                </div>
            </div>
            <div class="issue-body">
                <div class="issue-section">
                    <h4>为什么是问题</h4>
                    <p>${issue.bug_reasoning_why_a_bug}</p>
                </div>
                <div class="issue-section">
                    <h4>修复建议</h4>
                    <p>${issue.suggested_fix}</p>
                </div>
                <div class="issue-section">
                    <h4>给开发/AI 的修复提示词</h4>
                    <div class="fix-prompt">${issue.prompt_to_fix_this_issue}</div>
                </div>
            </div>
        </div>
        `).join('')}
        `}
        
        <div class="footer">
            <p>OpenTestAI × OpenClaw 测试提效方案</p>
            <p>测试目录：<code>${TEST_DIR}</code></p>
            <p>清理命令：<code>Remove-Item "${TEST_DIR}" -Recurse -Force</code></p>
        </div>
    </div>
</body>
</html>`;
}

main().catch(console.error);
