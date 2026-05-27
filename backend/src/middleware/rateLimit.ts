import { Context, Next } from 'hono';
import { Bindings } from '../types/env.js';

/**
 * Rate Limiting Middleware
 * 
 * Protects the API from brute-force attacks and abuse by limiting the number of 
 * requests a specific IP can make within a 1-minute window.
 */
export const rateLimitMiddleware = async (c: Context<Bindings>, next: Next) => {
  // Extract client IP (provided by Cloudflare)
  const ip = c.req.header('cf-connecting-ip') || 
             c.req.header('x-forwarded-for') || 
             'unknown';
             
  if (ip === 'unknown') {
    // If we can't identify the client, let them pass or apply a global restrict.
    // For safety, we just pass.
    await next();
    return;
  }

  // Determine limits based on the route
  const isAuthRoute = c.req.path.startsWith('/api/auth');
  
  // Strict limit for auth routes (e.g. 5 requests per minute)
  // Relaxed limit for standard API calls (e.g. 100 requests per minute)
  const limit = isAuthRoute ? 5 : 100;
  
  // Create a unique cache key for this IP and route type
  const routeType = isAuthRoute ? 'auth' : 'api';
  const key = `ratelimit:${routeType}:${ip}`;

  try {
    const currentVal = await c.env.CACHE.get(key);
    const count = currentVal ? parseInt(currentVal, 10) : 0;

    if (count >= limit) {
      return c.json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      }, 429);
    }

    // Update the counter
    // Cloudflare KV requires expirationTtl to be at least 60 seconds.
    await c.env.CACHE.put(key, (count + 1).toString(), { expirationTtl: 60 });
    
  } catch (err) {
    // If KV fails, we log the error but allow the request to proceed 
    // so we don't completely lock out users during a KV outage.
    console.error('Rate Limiter KV Error:', err);
  }

  await next();
};
