// @ts-nocheck
// KV Store utility - Cloudflare KV operations for caching 

export class KVCacheService { 
  private kv: any;

  constructor(env: any) {
    this.kv = env.CACHE;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.kv) return null;
    try {
      const data = await this.kv.get(key, 'json');
      return data as T;
    } catch (error) {
      console.warn(`KV Get Error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.kv) return;
    try {
      const options = ttlSeconds ? { expirationTtl: Math.max(60, ttlSeconds) } : {};
      await this.kv.put(key, JSON.stringify(value), options);
    } catch (error) {
      console.warn(`KV Set Error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) return;
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.warn(`KV Delete Error for key ${key}:`, error);
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.kv) return;
    try {
      let cursor: string | undefined;
      do {
        const list = await this.kv.list({ prefix, cursor });
        for (const key of list.keys) {
          await this.kv.delete(key.name);
        }
        cursor = list.cursor;
      } while (cursor);
    } catch (error) {
      console.warn(`KV Invalidate Prefix Error for prefix ${prefix}:`, error);
    }
  }
}
