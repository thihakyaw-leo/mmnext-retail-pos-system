import { Context, Next } from 'hono';
import { KVCacheService } from '../utils/kvStore.js';

/**
 * Edge Caching Middleware
 * Caches successful GET responses in Cloudflare KV for extremely fast subsequent reads.
 * 
 * @param ttlSeconds The time-to-live for the cache in seconds
 * @param customPrefix Optional prefix for specific routes (e.g., 'products', 'customers')
 */
export const edgeCacheMiddleware = (ttlSeconds: number = 60, customPrefix?: string) => {
  return async (c: Context, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return await next();
    }

    // Allow clients to bypass cache if requested (e.g., hard refresh)
    if (c.req.query('no_cache') === 'true' || c.req.header('Cache-Control') === 'no-cache') {
      c.header('X-Cache', 'BYPASS');
      return await next();
    }

    const url = new URL(c.req.url);
    const user = c.get('user');
    
    // Multi-tenant isolation for cache
    const orgId = user?.orgId || user?.organization_id || 'global';
    const storeId = c.req.query('storeId') || 'all';
    
    // Key format: edge_cache:{orgId}:{prefix_or_path}:{search_params}
    const prefix = customPrefix ? customPrefix : url.pathname.replace(/\//g, '_');
    const cacheKey = `edge_cache:${orgId}:${storeId}:${prefix}${url.search}`;
    
    const cache = new KVCacheService(c.env);

    try {
      // 1. Try to serve from KV Cache
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        c.header('X-Cache', 'HIT');
        return c.json(cachedResponse);
      }
    } catch (error) {
      console.warn('Edge Cache Read Error:', error);
      // Fallback to database if KV fails
    }

    // 2. If not in cache, proceed to the actual route handler
    await next();

    // 3. Cache the response if it was successful (200 OK)
    if (c.res.status === 200) {
      try {
        // We must clone the response to read its body without consuming it for the client
        const responseClone = c.res.clone();
        
        // Ensure it's a JSON response before caching
        const contentType = responseClone.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await responseClone.json();
          
          // Use waitUntil so the user doesn't wait for the KV write
          c.executionCtx.waitUntil(
            cache.set(cacheKey, body, ttlSeconds)
          );
          
          c.header('X-Cache', 'MISS');
        }
      } catch (error) {
        console.warn('Edge Cache Write Error:', error);
      }
    }
  };
};
