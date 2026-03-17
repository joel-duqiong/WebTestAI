/**
 * 结果去重和聚合模块
 */

const crypto = require('crypto');

class ResultDeduplicator {
    constructor(options = {}) {
        this.similarityThreshold = options.similarityThreshold || 0.8;
    }

    /**
     * 去重所有问题
     */
    deduplicate(allIssues) {
        const issuesMap = new Map();
        
        for (const issue of allIssues) {
            const normalizedTitle = this.normalizeTitle(issue.bug_title);
            const existingKey = this.findSimilarIssue(issuesMap, normalizedTitle);
            
            if (existingKey) {
                // 保留置信度更高的问题
                const existing = issuesMap.get(existingKey);
                if (issue.bug_confidence > existing.bug_confidence) {
                    issuesMap.set(existingKey, issue);
                }
            } else {
                issuesMap.set(normalizedTitle, issue);
            }
        }
        
        return Array.from(issuesMap.values());
    }

    /**
     * 标准化标题
     */
    normalizeTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 查找相似问题
     */
    findSimilarIssue(issuesMap, normalizedTitle) {
        for (const [key] of issuesMap.entries()) {
            const similarity = this.calculateSimilarity(normalizedTitle, key);
            if (similarity >= this.similarityThreshold) {
                return key;
            }
        }
        return null;
    }

    /**
     * 计算相似度（Jaccard）
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.includes(str2) || str2.includes(str1)) return 0.8;
        
        const words1 = new Set(str1.split(' '));
        const words2 = new Set(str2.split(' '));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * 按页面聚合问题
     */
    groupByPage(allIssues) {
        const grouped = {};
        
        for (const issue of allIssues) {
            const page = issue.page || 'Unknown';
            if (!grouped[page]) {
                grouped[page] = [];
            }
            grouped[page].push(issue);
        }
        
        return grouped;
    }

    /**
     * 按类型聚合问题
     */
    groupByType(allIssues) {
        const grouped = {};
        
        for (const issue of allIssues) {
            const types = issue.bug_type || ['Unknown'];
            for (const type of types) {
                if (!grouped[type]) {
                    grouped[type] = [];
                }
                grouped[type].push(issue);
            }
        }
        
        return grouped;
    }

    /**
     * 按优先级排序
     */
    sortByPriority(issues) {
        return issues.sort((a, b) => b.bug_priority - a.bug_priority);
    }

    /**
     * 生成统计信息
     */
    generateStats(allIssues) {
        const grouped = this.groupByType(allIssues);
        
        return {
            total: allIssues.length,
            byType: Object.keys(grouped).map(type => ({
                type,
                count: grouped[type].length
            })),
            byPriority: {
                critical: allIssues.filter(i => i.bug_priority >= 8).length,
                medium: allIssues.filter(i => i.bug_priority >= 4 && i.bug_priority < 8).length,
                low: allIssues.filter(i => i.bug_priority < 4).length
            }
        };
    }
}

module.exports = ResultDeduplicator;
