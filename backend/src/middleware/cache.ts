import { Context, Next } from 'hono';

/**
 * Edge Caching Middleware
 * Caches successful GET responses in Cloudflare KV for extremely fast subsequent reads.
 * 
 * @param ttlSeconds The time-to-live for the cache in seconds (minimum 60s for KV in some cases, though any number works, KV guarantees are eventual)
 */
export const edgeCacheMiddleware = (ttlSeconds: number = 60) => {
  return async (c: Context, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return await next();
    }

    const url = new URL(c.req.url);
    
    // Create a unique cache key based on the path, query parameters, and potentially organization/user
    // If you implement strict multi-tenancy later, you should append the org_id to this key
    const cacheKey = `edge_cache:${url.pathname}${url.search}`;
    const kv = c.env.CACHE; 

    try {
      // 1. Try to serve from KV Cache
      const cachedResponse = await kv.get(cacheKey, 'json');
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
            kv.put(cacheKey, JSON.stringify(body), { expirationTtl: Math.max(60, ttlSeconds) })
          );
          
          c.header('X-Cache', 'MISS');
        }
      } catch (error) {
        console.warn('Edge Cache Write Error:', error);
      }
    }
  };
};
