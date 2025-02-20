import NodeCache from 'node-cache';
export default class MessageCache {
    cache;
    messageCache;
    constructor() {
        this.cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });
        this.messageCache = new NodeCache({ stdTTL: 300, maxKeys: 10000 });
    }
    isDuplicateMessage(messageId) {
        return !!this.messageCache.get(messageId);
    }
    markMessageAsProcessed(messageId) {
        this.messageCache.set(messageId, true);
    }
    getQueryResult(query, options) {
        const cacheKey = this.createCacheKey(query, options);
        return this.cache.get(cacheKey);
    }
    setQueryResult(query, options, result) {
        const cacheKey = this.createCacheKey(query, options);
        this.cache.set(cacheKey, result);
    }
    getLastConversation(userId) {
        return this.cache.get(`lastConversation:${userId}`);
    }
    setLastConversation(userId, conversation) {
        this.cache.set(`lastConversation:${userId}`, conversation, 86400);
    }
    createCacheKey(query, options) {
        return `${query}:${JSON.stringify(options)}`;
    }
}
//# sourceMappingURL=MessageCache.js.map