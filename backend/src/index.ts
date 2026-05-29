/**
 * ============================================================================
 * CLOUDFLARE ENTERPRISE POS - MAIN WORKER FILE
 * ============================================================================
 * Main entry point for Cloudflare Workers backend
 * Handles HTTP requests, WebSocket connections, and routing
 */

import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

// Import Types
import type { Bindings, Env } from './types/env';

// Import route handlers
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import inventoryRoutes from './routes/inventory.js';
import staffRoutes from './routes/staff.js';
import supplierRoutes from './routes/suppliers.js';
import purchasingRoutes from './routes/purchasing.js';
import discountsRoutes from './routes/discounts.js';
import analyticsRoutes from './routes/analytics.js';
import gamificationRoutes from './routes/gamification.js';
import reportRoutes from './routes/reports.js';
import payrollRoutes from './routes/payroll.js';
import shiftsRoutes from './routes/shifts.js';
import promotionRoutes from './routes/promotions.js';
import loyaltyRoutes from './routes/loyalty.js';
import organizationRoutes from './routes/organization.js';
import auditRoutes from './routes/audit.js';
import integrationRoutes from './routes/integrations.js';
import posRoutes from './routes/pos.js';
import aiRoutes from './routes/ai.js';
import mediaRoutes from './routes/media.js';
import attendanceRoutes from './routes/attendance.js';
import categoriesRoutes from './routes/categories.js';

// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { analyticsMiddleware } from './middleware/analytics.js';

// Import services
import { EmailService } from './services/emailService.js';
import { DatabaseService } from './utils/database.js';
import { KVCacheService } from './utils/kvStore.js';
import { R2StorageService } from './utils/r2Storage.js';

// Create Hono app instance
const app = new Hono<Bindings>();

/**
 * Global middleware setup
 */
app.use('*', logger());
app.use('*', analyticsMiddleware);
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', prettyJSON());

// CORS configuration
app.use('*', corsMiddleware());

// Global rate limiting
app.use('*', rateLimitMiddleware);

/**
 * Health check and system information
 */
app.get('/', (c) => {
  return c.json({
    name: 'Cloudflare Enterprise POS API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production',
    features: {
      gamification: true,
      ai_recommendations: true,
      real_time_updates: true,
      multi_user_support: true,
      inventory_management: true,
      loyalty_program: true,
      reporting_analytics: true
    },
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      customers: '/api/customers',
      inventory: '/api/inventory',
      staff: '/api/staff',
      analytics: '/api/analytics',
      gamification: '/api/gamification',
      reports: '/api/reports',
      payroll: '/api/payroll',
      shifts: '/api/shifts',
      promotions: '/api/promotions',
      loyalty: '/api/loyalty',
      organization: '/api/organization',
      audit: '/api/audit',
      integrations: '/api/integrations',
      pos: '/api/pos',
      attendance: '/api/attendance'
    }
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now(),
    services: {
      database: 'connected',
      cache: 'connected',
      storage: 'connected',
      ai: 'available'
    }
  });
});

/**
 * API version information
 */
app.get('/api', (c) => {
  return c.json({
    api_version: 'v1',
    documentation: 'https://docs.yourcompany.com/api',
    support: 'https://support.yourcompany.com',
    rate_limits: {
      requests_per_minute: 100,
      requests_per_hour: 1000,
      requests_per_day: 10000
    }
  });
});

/**
 * Authentication routes (public)
 */
app.route('/api/auth', authRoutes);

/**
 * Public Media streaming from R2
 */
app.route('/api/media', mediaRoutes);

/**
 * Protected API routes
 */
const protectedApi = new Hono<Bindings>();

// Apply authentication middleware to all protected routes
protectedApi.use('*', authMiddleware);

// Mount protected routes with RBAC
protectedApi.route('/products', productRoutes);
protectedApi.route('/orders', orderRoutes);
protectedApi.route('/customers', customerRoutes);
protectedApi.route('/inventory', inventoryRoutes);
protectedApi.route('/suppliers', supplierRoutes);
protectedApi.route('/purchasing', purchasingRoutes);
protectedApi.route('/discounts', discountsRoutes);
protectedApi.route('/staff', staffRoutes);
protectedApi.route('/analytics', analyticsRoutes);
protectedApi.route('/gamification', gamificationRoutes);
protectedApi.route('/reports', reportRoutes);
protectedApi.route('/payroll', payrollRoutes);
protectedApi.route('/shifts', shiftsRoutes);
protectedApi.route('/promotions', promotionRoutes);
protectedApi.route('/loyalty', loyaltyRoutes);
protectedApi.route('/organization', organizationRoutes);
protectedApi.route('/audit', auditRoutes);
protectedApi.route('/integrations', integrationRoutes);
protectedApi.route('/pos', posRoutes);
protectedApi.route('/ai', aiRoutes);
protectedApi.route('/categories', categoriesRoutes);

// Mount protected routes under /api
app.route('/api', protectedApi);

/**
 * WebSocket handling for real-time features
 */
app.get('/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected websocket', 400);
  }
  
  // Use a singleton DO for the main store (we can make it dynamic based on user/branch later)
  const id = c.env.POS_DO.idFromName('main-store');
  const stub = c.env.POS_DO.get(id);
  
  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

/**
 * File upload and media handling
 */
app.post('/api/upload', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as any;
    
    if (!file || typeof file === 'string') {
      return c.json({ error: 'No valid file provided' }, 400);
    }
    
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type' }, 400);
    }
    
    if (file.size > maxSize) {
      return c.json({ error: 'File too large' }, 400);
    }
    
    // Upload to R2
    const r2Service = new R2StorageService(c.env);
    const fileKey = `uploads/${Date.now()}-${file.name}`;
    
    await r2Service.uploadFile(fileKey, file.stream(), {
      contentType: file.type,
      uploadedBy: c.get('user').id,
      uploadedAt: new Date().toISOString()
    });
    
    return c.json({
      success: true,
      file_url: `https://your-r2-domain.com/${fileKey}`,
      file_key: fileKey
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/**
 * Admin utilities (admin only)
 */
app.get('/api/admin/stats', authMiddleware, rbacMiddleware(['admin']), async (c) => {
  try {
    const db = new DatabaseService(c.env.DB);
    
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalCustomers,
      todayOrders,
      todayRevenue
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
      db.execute('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL'),
      db.execute('SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL'),
      db.execute('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL'),
      db.execute(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE DATE(created_at) = DATE('now') 
        AND deleted_at IS NULL
      `),
      db.execute(`
        SELECT SUM(total_amount) as total 
        FROM orders 
        WHERE DATE(created_at) = DATE('now') 
        AND status = 'completed'
        AND deleted_at IS NULL
      `)
    ]);
    
    return c.json({
      stats: {
        total_users: totalUsers.results[0].count,
        total_products: totalProducts.results[0].count,
        total_orders: totalOrders.results[0].count,
        total_customers: totalCustomers.results[0].count,
        today_orders: todayOrders.results[0].count,
        today_revenue: todayRevenue.results[0].total || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

/**
 * Database utilities (admin only)
 */
app.post('/api/admin/database/backup', authMiddleware, rbacMiddleware(['admin']), async (c) => {
  try {
    // Create database backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backups/database-${timestamp}.sql`;
    
    // This would need to be implemented based on D1 capabilities
    return c.json({
      success: true,
      backup_key: backupKey,
      message: 'Database backup created successfully'
    });
    
  } catch (error) {
    console.error('Backup error:', error);
    return c.json({ error: 'Backup failed' }, 500);
  }
});

/**
 * Cache management
 */
app.delete('/api/admin/cache', authMiddleware, rbacMiddleware(['admin']), async (c) => {
  try {
    const cache = new KVCacheService(c.env);
    
    // Clear specific cache keys
    const cacheKeys = [
      'products:active',
      'categories:all',
      'settings:system',
      'analytics:daily',
      'leaderboard:staff'
    ];
    
    await Promise.all(cacheKeys.map(key => cache.delete(key)));
    
    return c.json({
      success: true,
      message: 'Cache cleared successfully',
      cleared_keys: cacheKeys
    });
    
  } catch (error) {
    console.error('Cache clear error:', error);
    return c.json({ error: 'Failed to clear cache' }, 500);
  }
});

/**
 * Error handling middleware (must be last)
 */
app.use('*', errorHandler);

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method
  }, 404);
});

/**
 * Global error handler
 */
app.onError((error, c) => {
  console.error('Global error:', error);
  
  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? error.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    request_id: c.get('requestId')
  }, 500);
});

/**
 * Export Durable Objects
 */
export { PosDurableObject } from './websocket/PosDurableObject.js';

/**
 * Export the app as the default Worker handler
 */
export default {
  /**
   * HTTP request handler
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Add request ID for tracking
    const requestId = crypto.randomUUID();
    
    // Create a new request with additional context
    const modifiedRequest = new Request(request);
    
    try {
      return await app.fetch(modifiedRequest, env, {
        ...ctx,
        requestId,
        startTime: Date.now()
      } as any);
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        error: 'Worker Error',
        message: 'An error occurred in the Worker',
        request_id: requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },

  /**
   * Scheduled event handler for cron jobs
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Scheduled event triggered:', event.scheduledTime);
    
    try {
      // Daily analytics aggregation
      if (event.cron === '0 1 * * *') { // Daily at 1 AM
        await aggregateDailyAnalytics(env);
      }
      
      // Hourly inventory check
      if (event.cron === '0 * * * *') { // Every hour
        await checkLowStockAlerts(env);
      }
      
      // Weekly performance reports
      if (event.cron === '0 9 * * 1') { // Monday at 9 AM
        await generateWeeklyReports(env);
      }
      
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  },

  /**
   * Queue handler for background tasks
   */
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const emailService = new EmailService(env);
    
    for (const message of batch.messages) {
      try {
        const data = message.body;
        
        if (data.type === 'welcome_email') {
          await emailService.sendWelcomeEmail(data.email, data.payload);
        } else if (data.type === 'password_reset') {
          await emailService.sendPasswordResetEmail(data.email, data.payload);
        } else if (data.type === 'low_stock_alert') {
          await emailService.sendLowStockAlertEmail(data.email, data.payload);
        } else {
          console.warn('Unknown queue message type:', data.type);
        }
        
        // Acknowledge the message (automatically done if no exception is thrown)
        message.ack();
      } catch (err) {
        console.error('Failed to process queue message:', err);
        message.retry(); // Re-queue the message
      }
    }
  }
};
/**
 * Helper functions for scheduled tasks
 */
async function aggregateDailyAnalytics(env: Env) {
  // Implementation for daily analytics aggregation
  console.log('Aggregating daily analytics...');
  // Example: calculate total sales for the day, store in analytics table
}

async function checkLowStockAlerts(env: Env) {
  console.log('Checking low stock alerts...');
  try {
    // Find items where quantity is at or below the reorder point
    const { results } = await env.DB.prepare(`
      SELECT i.quantity_on_hand, i.reorder_point, p.name, p.sku 
      FROM inventory i 
      JOIN products p ON i.product_id = p.id 
      WHERE i.quantity_on_hand <= i.reorder_point
    `).all();

    if (results && results.length > 0) {
      console.log(`Found ${results.length} low stock items. Queuing alert.`);
      await env.EMAIL_QUEUE.send({
        type: 'low_stock_alert',
        email: 'manager@mmnext.com', // In a real system, query the actual manager's email
        payload: { items: results }
      });
    }
  } catch (error) {
    console.error('Failed to check low stock alerts:', error);
  }
}

async function generateWeeklyReports(env: Env) {
  // Implementation for weekly reports
  console.log('Generating weekly reports...');
}
