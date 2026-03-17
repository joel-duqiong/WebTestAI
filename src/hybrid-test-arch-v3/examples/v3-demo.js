/**
 * Hybrid Test v3.0 使用示例
 * 演示：爬取与分析分离
 */

const { createSession } = require('../skills/index.js');

async function demo() {
    console.log('='.repeat(60));
    console.log('🧪 Hybrid Test v3.0 演示');
    console.log('='.repeat(60));
    console.log('');

    // ========== Step 1: 创建会话（仅爬取）==========
    console.log('📌 Step 1: 创建测试会话（仅爬取）\n');
    
    const session = await createSession({
        url: 'https://chagee.com/zh-cn',
        maxPages: 10,
        saveDir: './test-data'
    });

    console.log('✅ 会话创建完成');
    console.log(`   会话 ID: ${session.sessionId}`);
    console.log(`   页面数：${session.pagesCount}`);
    console.log('');

    // ========== Step 2: 添加 Agent 分析（可多次）==========
    console.log('📌 Step 2: 添加 Agent 分析（可多次调用）\n');
    
    // 第一次分析：UI/UX
    console.log('🔍 分析 1: UI/UX (Mia)');
    await session.analyze(['mia']);
    
    // 第二次分析：无障碍
    console.log('\n🔍 分析 2: 无障碍 (Sophia)');
    await session.analyze(['sophia']);
    
    // 第三次分析：安全
    console.log('\n🔍 分析 3: 安全 (Tariq)');
    await session.analyze(['tariq']);
    
    console.log('');

    // ========== Step 3: 生成报告 ==========
    console.log('📌 Step 3: 生成综合报告\n');
    
    const reportPaths = await session.report({
        format: ['html', 'pdf'],
        outputDir: './reports'
    });

    console.log('');
    console.log('✅ 测试完成！');
    console.log('');
    console.log('📁 报告位置:');
    console.log(`   HTML: ${reportPaths.html || '未生成'}`);
    console.log(`   PDF: ${reportPaths.pdf || '未生成'}`);
    console.log('');
    console.log('💡 提示:');
    console.log('   - 会话数据已保存，可重复分析');
    console.log('   - 使用 session.cleanup() 清理数据');
    console.log('');

    // 可选：清理会话
    // await session.cleanup();
}

// 运行演示
demo().catch(console.error);
