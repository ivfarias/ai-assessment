import NodeCache from 'node-cache';
export default class MessageCache {
    cache;
    constructor() {
        this.cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });
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