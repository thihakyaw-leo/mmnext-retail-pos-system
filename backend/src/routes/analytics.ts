import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { validateQuery } from '../middleware/validation.js';
import { AnalyticsController } from '../controllers/analyticsController.js';

const analytics = new Hono();

// Optional query parameters for date filtering
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const dashboardSchema = z.object({
  period: z.enum(['1d', '7d', '30d', '90d', '1y']).optional(),
});

const salesSchema = dateRangeSchema.extend({
  groupBy: z.enum(['hour', 'day', 'week', 'month', 'staff']).optional(),
  staffId: z.string().optional(),
  customerId: z.string().optional(),
  productId: z.string().optional(),
});

const productsSchema = dateRangeSchema.extend({
  categoryId: z.string().optional(),
  sortBy: z.enum(['revenue', 'quantity', 'profit', 'margin']).optional(),
  limit: z.string().optional(),
});

const customersSchema = dateRangeSchema.extend({
  segment: z.string().optional(),
  limit: z.string().optional(),
});

const staffSchema = dateRangeSchema.extend({
  staffId: z.string().optional(),
  department: z.string().optional(),
  metric: z.string().optional(),
});

const chartSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).optional(),
  type: z.enum(['top-selling', 'top-revenue', 'categories']).optional(),
});

// Protect all analytics routes - Admin and Manager only
analytics.use('*', auth, rbac(['admin', 'manager']));

analytics.get('/dashboard', validateQuery(dashboardSchema), AnalyticsController.getDashboard);
analytics.get('/sales', validateQuery(salesSchema), AnalyticsController.getSales);
analytics.get('/products', validateQuery(productsSchema), AnalyticsController.getProducts);
analytics.get('/customers', validateQuery(customersSchema), AnalyticsController.getCustomers);
analytics.get('/staff', validateQuery(staffSchema), AnalyticsController.getStaff);
analytics.get('/revenue-chart', validateQuery(chartSchema), AnalyticsController.getRevenueChart);
analytics.get('/product-chart', validateQuery(chartSchema), AnalyticsController.getProductChart);
analytics.get('/realtime', AnalyticsController.getRealtime);
analytics.get('/export/:type', AnalyticsController.exportReport);

export default analytics;
