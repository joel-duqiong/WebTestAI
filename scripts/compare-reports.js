/**
 * 报告对比工具 - 截图新旧两个版本的报告，找差异
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OLD_REPORT = process.argv[2] || 'F:/teams/testzai/output/report-1773839190480.html';
const NEW_REPORT = process.argv[3] || 'F:/teams/testzai/output/test-chagee-v54/reports/report-1773842126088.html';
const OUTPUT_DIR = 'F:/teams/testzai/output/compare';

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

    // 截图旧版报告
    console.log('📸 截图旧版报告 (v3.1)...');
    const oldPage = await context.newPage();
    await oldPage.goto(`file:///${OLD_REPORT.replace(/\\/g, '/')}`, { waitUntil: 'load' });
    await oldPage.waitForTimeout(1000);

    await oldPage.screenshot({ path: path.join(OUTPUT_DIR, 'old-full.png'), fullPage: true });
    console.log('   ✅ old-full.png');

    // 截图旧版"发现的问题"
    const oldIssueSection = await oldPage.$('text=发现的问题');
    if (oldIssueSection) {
        const oldIssueParent = await oldIssueSection.evaluateHandle(el => el.closest('.section') || el.parentElement);
        await oldIssueParent.screenshot({ path: path.join(OUTPUT_DIR, 'old-issues.png') });
        console.log('   ✅ old-issues.png');
    } else {
        console.log('   ⚠️ 旧版无"发现的问题"区域');
    }

    // 截图旧版第一个页面详情（展开）
    const oldDetailsBtn = await oldPage.$('.details-btn');
    if (oldDetailsBtn) {
        await oldDetailsBtn.click();
        await oldPage.waitForTimeout(500);
        const oldDetailsRow = await oldPage.$('.details-row[style*="table-row"], .details-row:not([style*="none"])');
        if (oldDetailsRow) {
            await oldDetailsRow.screenshot({ path: path.join(OUTPUT_DIR, 'old-details.png') });
            console.log('   ✅ old-details.png');
        }
    }

    // 截图新版报告
    console.log('\n📸 截图新版报告 (v5.4)...');
    const newPage = await context.newPage();
    await newPage.goto(`file:///${NEW_REPORT.replace(/\\/g, '/')}`, { waitUntil: 'load' });
    await newPage.waitForTimeout(1000);

    await newPage.screenshot({ path: path.join(OUTPUT_DIR, 'new-full.png'), fullPage: true });
    console.log('   ✅ new-full.png');

    // 截���新版"发现的问题"
    const newIssueSection = await newPage.$('text=发现的问题');
    if (newIssueSection) {
        const newIssueParent = await newIssueSection.evaluateHandle(el => el.closest('.section') || el.parentElement);
        await newIssueParent.screenshot({ path: path.join(OUTPUT_DIR, 'new-issues.png') });
        console.log('   ✅ new-issues.png');
    } else {
        console.log('   ⚠️ 新版无"发现的问题"区域');
    }

    // 截图新版第一个页面详情（展开）
    const newDetailsBtn = await newPage.$('.details-btn');
    if (newDetailsBtn) {
        await newDetailsBtn.click();
        await newPage.waitForTimeout(500);
        const newDetailsRow = await newPage.$('.details-row[style*="table-row"], .details-row:not([style*="none"])');
        if (newDetailsRow) {
            await newDetailsRow.screenshot({ path: path.join(OUTPUT_DIR, 'new-details.png') });
            console.log('   ✅ new-details.png');
        }
    }

    // 对比 HTML 结构差异
    console.log('\n🔍 对比 HTML 结构...');
    const oldHtml = fs.readFileSync(OLD_REPORT, 'utf8');
    const newHtml = fs.readFileSync(NEW_REPORT, 'utf8');

    // 检查截图
    const oldScreenshots = (oldHtml.match(/data:image\/png;base64/g) || []).length;
    const newScreenshots = (newHtml.match(/data:image\/png;base64/g) || []).length;
    console.log(`   📸 截图数量: 旧=${oldScreenshots}, 新=${newScreenshots}`);

    // 检查 issue-card
    const oldIssueCards = (oldHtml.match(/issue-card/g) || []).length;
    const newIssueCards = (newHtml.match(/issue-card/g) || []).length;
    console.log(`   🐛 issue-card 数量: 旧=${oldIssueCards}, 新=${newIssueCards}`);

    // 检查测试用例样式
    const oldTestItems = (oldHtml.match(/test-item/g) || []).length;
    const newTestItems = (newHtml.match(/test-item/g) || []).length;
    console.log(`   📋 test-item 数量: 旧=${oldTestItems}, 新=${newTestItems}`);

    // 检查 details-row 样式
    const oldDetailsStyle = oldHtml.match(/details-row.*?<\/tr>/s);
    const newDetailsStyle = newHtml.match(/details-row.*?<\/tr>/s);

    // 检查 CSS 差异
    const oldCSS = oldHtml.match(/<style>(.*?)<\/style>/s)?.[1] || '';
    const newCSS = newHtml.match(/<style>(.*?)<\/style>/s)?.[1] || '';
    console.log(`   🎨 CSS 长度: 旧=${oldCSS.length}字符, 新=${newCSS.length}字符`);

    // 检查版本标识
    const oldVersion = oldHtml.match(/v3\.\d/)?.[0] || '未知';
    const newVersion = newHtml.match(/v3\.\d/)?.[0] || '未知';
    console.log(`   📌 版本: 旧=${oldVersion}, 新=${newVersion}`);

    // 检查 test-item 样式差异
    const oldTestItemCSS = oldCSS.match(/\.test-item\s*\{[^}]+\}/)?.[0] || '';
    const newTestItemCSS = newCSS.match(/\.test-item\s*\{[^}]+\}/)?.[0] || '';
    if (oldTestItemCSS !== newTestItemCSS) {
        console.log('\n   ⚠️ test-item 样式不同:');
        console.log(`      旧: ${oldTestItemCSS.substring(0, 120)}...`);
        console.log(`      新: ${newTestItemCSS.substring(0, 120)}...`);
    }

    // 输出完整对比
    console.log('\n✅ 截图已保存到 output/compare/');

    await browser.close();
}

main().catch(console.error);
