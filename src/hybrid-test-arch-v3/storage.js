/**
 * 数据存储模块 - v3.0
 * 负责：页面数据持久化保存和加载
 */

const fs = require('fs');
const path = require('path');

class DataStorage {
    constructor(baseDir = './test-data') {
        this.baseDir = baseDir;
        this.ensureDir(baseDir);
    }

    /**
     * 确保目录存在
     */
    ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * 保存会话数据
     */
    async saveSession(sessionData) {
        const sessionDir = path.join(this.baseDir, sessionData.id);
        this.ensureDir(sessionDir);

        // 保存会话元数据
        const metadataPath = path.join(sessionDir, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
            id: sessionData.id,
            baseUrl: sessionData.baseUrl,
            timestamp: sessionData.timestamp,
            maxPages: sessionData.maxPages,
            totalPages: sessionData.pages.length
        }, null, 2));

        // 保存页面数据（分开保存避免文件过大）
        const pagesDir = path.join(sessionDir, 'pages');
        this.ensureDir(pagesDir);

        for (const [index, page] of sessionData.pages.entries()) {
            const pagePath = path.join(pagesDir, `page-${index}.json`);
            fs.writeFileSync(pagePath, JSON.stringify({
                url: page.url,
                title: page.title,
                loadTime: page.loadTime,
                status: page.status,
                content: page.content,
                features: page.features,
                consoleLogs: page.consoleLogs,
                links: page.links,
                screenshot: page.screenshot ? page.screenshot.toString('base64') : null,
                html: page.html,
                tests: page.tests,
                testsPassed: page.testsPassed,
                testsTotal: page.testsTotal
            }, null, 2));
        }

        console.log(`💾 会话数据已保存：${sessionDir}`);
        return sessionDir;
    }

    /**
     * 加载会话数据
     */
    async loadSession(sessionId) {
        const sessionDir = path.join(this.baseDir, sessionId);
        
        if (!fs.existsSync(sessionDir)) {
            throw new Error(`会话不存在：${sessionId}`);
        }

        // 加载元数据
        const metadataPath = path.join(sessionDir, 'metadata.json');
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        // 加载页面数据
        const pagesDir = path.join(sessionDir, 'pages');
        const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        
        const pages = [];
        for (const file of pageFiles.sort()) {
            const pagePath = path.join(pagesDir, file);
            const pageData = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
            
            // 恢复 Buffer
            if (pageData.screenshot) {
                pageData.screenshot = Buffer.from(pageData.screenshot, 'base64');
            }
            
            pages.push(pageData);
        }

        return {
            ...metadata,
            pages
        };
    }

    /**
     * 列出所有会话
     */
    listSessions() {
        if (!fs.existsSync(this.baseDir)) {
            return [];
        }

        return fs.readdirSync(this.baseDir)
            .filter(dir => fs.existsSync(path.join(this.baseDir, dir, 'metadata.json')))
            .map(sessionId => {
                const metadataPath = path.join(this.baseDir, sessionId, 'metadata.json');
                return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            });
    }

    /**
     * 删除会话
     */
    deleteSession(sessionId) {
        const sessionDir = path.join(this.baseDir, sessionId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true });
            console.log(`🗑️ 会话已删除：${sessionId}`);
        }
    }

    /**
     * 保存分析结果
     */
    async saveAnalysis(sessionId, agentName, results) {
        const sessionDir = path.join(this.baseDir, sessionId);
        const analysisDir = path.join(sessionDir, 'analysis');
        this.ensureDir(analysisDir);

        const analysisPath = path.join(analysisDir, `${agentName}-${Date.now()}.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(results, null, 2));
        
        return analysisPath;
    }

    /**
     * 加载分析结果
     */
    async loadAnalysis(sessionId) {
        const sessionDir = path.join(this.baseDir, sessionId);
        const analysisDir = path.join(sessionDir, 'analysis');
        
        if (!fs.existsSync(analysisDir)) {
            return [];
        }

        const analysisFiles = fs.readdirSync(analysisDir)
            .filter(f => f.endsWith('.json'))
            .sort();

        const results = [];
        for (const file of analysisFiles) {
            const analysisPath = path.join(analysisDir, file);
            results.push(JSON.parse(fs.readFileSync(analysisPath, 'utf8')));
        }

        return results;
    }
}

module.exports = DataStorage;
