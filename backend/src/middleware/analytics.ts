import { Context, Next } from 'hono';
import { Bindings } from '../types/env.js';

/**
 * Analytics Middleware
 * 
 * Intercepts every API request and records metrics to Cloudflare Workers Analytics Engine.
 * This is non-blocking and executes incredibly fast with no database overhead.
 */
export const analyticsMiddleware = async (c: Context<Bindings>, next: Next) => {
  const start = Date.now();
  const url = new URL(c.req.url);

  // 1. Let the request proceed
  await next();

  // 2. Measure latency after the response is ready
  const latency = Date.now() - start;

  // 3. Try to extract User ID if authenticated (from our auth middleware)
  let userId = 'anonymous';
  try {
    const user = c.get('user');
    if (user && user.id) {
      userId = user.id.toString();
    }
  } catch (e) {
    // Ignore if not present
  }

  // 4. Send telemetry to Cloudflare Analytics Engine
  try {
    if (c.env.POS_EVENTS) {
      c.env.POS_EVENTS.writeDataPoint({
        // Blobs are strings: we store Method, Path, Environment
        blobs: [c.req.method, url.pathname, c.env.ENVIRONMENT || 'development'],
        
        // Doubles are numbers: we store Latency (ms) and HTTP Status Code
        doubles: [latency, c.res.status],
        
        // Indexes help group and filter data efficiently (max 32 bytes string)
        indexes: [userId]
      });
    }
  } catch (error) {
    // Do not fail the request if analytics logging fails
    console.error('Failed to write analytics data point:', error);
  }
};
