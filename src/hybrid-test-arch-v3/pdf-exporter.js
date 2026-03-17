/**
 * PDF 报告导出模块
 * 注意：需要安装 pdfkit: npm install pdfkit
 */

class PDFExporter {
    constructor(options = {}) {
        this.outputDir = options.outputDir || './output';
    }

    /**
     * 生成 PDF 报告
     */
    async generatePDF(results, outputPath) {
        try {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 50 });
            const fs = require('fs');
            const stream = fs.createWriteStream(outputPath);

            doc.pipe(stream);

            // 标题
            doc.fontSize(24).text('混合测试报告', { align: 'center' });
            doc.moveDown();
            
            // 基本信息
            doc.fontSize(12).text(`测试 URL: ${results.baseUrl}`);
            doc.text(`测试时间：${new Date(results.timestamp).toLocaleString('zh-CN')}`);
            doc.text(`参与 Agent: ${results.agents.join(', ')}`);
            doc.moveDown(2);

            // 摘要
            doc.fontSize(16).text('测试摘要', { underline: true });
            doc.moveDown();
            doc.fontSize(12);
            doc.text(`爬取页面：${results.summary.crawledPages}`);
            doc.text(`成功页面：${results.summary.successPages}`);
            doc.text(`失败页面：${results.summary.failedPages}`);
            doc.text(`发现问题：${results.summary.totalIssues}`);
            doc.moveDown(2);

            // 页面列表
            doc.fontSize(16).text('页面测试结果', { underline: true });
            doc.moveDown();
            
            results.pages.forEach((page, index) => {
                doc.fontSize(12).text(`${index + 1}. ${page.title || '无标题'}`, { bold: true });
                doc.fontSize(10).text(`   URL: ${page.url}`);
                doc.text(`   加载时间：${page.loadTime}ms`);
                doc.text(`   测试：${page.testsPassed}/${page.testsTotal}`);
                doc.text(`   状态：${page.status === 200 ? '✅ 成功' : '❌ 失败'}`);
                doc.moveDown(0.5);
            });

            doc.moveDown(2);

            // 问题列表
            if (results.issues && results.issues.length > 0) {
                doc.fontSize(16).text('发现的问题', { underline: true });
                doc.moveDown();
                
                results.issues.forEach((issue, index) => {
                    doc.fontSize(12).text(`${index + 1}. ${issue.bug_title}`, { bold: true });
                    doc.fontSize(10).text(`   页面：${issue.page}`);
                    doc.text(`   类型：${issue.bug_type.join(', ')}`);
                    doc.text(`   优先级：${issue.bug_priority}/10`);
                    doc.text(`   置信度：${issue.bug_confidence}/10`);
                    doc.text(`   建议：${issue.suggested_fix}`);
                    doc.moveDown(0.5);
                });
            }

            // 页脚
            doc.moveDown(2);
            doc.fontSize(10).text('---', { align: 'center' });
            doc.text('Hybrid Test Architecture v2.0 | Playwright + OpenTestAI', { align: 'center' });

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            });
        } catch (error) {
            console.log('⚠️  PDF 导出失败（可能未安装 pdfkit）:', error.message);
            console.log('💡 安装命令：npm install pdfkit');
            return null;
        }
    }

    /**
     * 批量导出 PDF
     */
    async exportMultiple(results, baseOutputPath) {
        const pdfPath = baseOutputPath.replace('.html', '.pdf');
        return await this.generatePDF(results, pdfPath);
    }
}

module.exports = PDFExporter;
