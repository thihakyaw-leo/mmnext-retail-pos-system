import { cors } from 'hono/cors';

export const corsMiddleware = () => {
  return cors({
    origin: (origin) => {
      // Allow all origins in development
      if (!origin) return '';
      
      // Production allowed origins
      const allowedOrigins = [
        'https://enterprise-pos-frontend.pages.dev',
        'https://*.pages.dev' // Cloudflare Pages domains
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return allowed === origin;
      });

      // Allow any localhost or 127.0.0.1 port in development
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      return isAllowed || isLocalhost ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ],
    exposeHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Rate-Limit-Remaining',
      'X-Response-Time'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  });
};
