import NodeCache from 'node-cache';
import { IQueryOptions, IQueryResponse } from '../../domain/interfaces/queryService.js';

export default class MessageCache {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600, maxKeys: 1000 });
  }

  public getQueryResult(query: string, options: IQueryOptions): IQueryResponse | undefined {
    const cacheKey = this.createCacheKey(query, options);
    return this.cache.get(cacheKey);
  }

  public setQueryResult(query: string, options: IQueryOptions, result: IQueryResponse): void {
    const cacheKey = this.createCacheKey(query, options);
    this.cache.set(cacheKey, result);
  }

  public getLastConversation(userId: string): any {
    return this.cache.get(`lastConversation:${userId}`);
  }

  public setLastConversation(userId: string, conversation: any): void {
    this.cache.set(`lastConversation:${userId}`, conversation, 86400);
  }

  private createCacheKey(query: string, options: any): string {
    return `${query}:${JSON.stringify(options)}`;
  }
}
