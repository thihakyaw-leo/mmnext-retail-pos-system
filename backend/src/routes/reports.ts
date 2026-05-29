import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { validateQuery } from '../middleware/validation.js';
import { ReportController } from '../controllers/reportController.js';

const reports = new Hono();

const salesSummaryQuerySchema = z.object({
  startDate: z.string().min(10, 'Start date is required in YYYY-MM-DD format'),
  endDate: z.string().min(10, 'End date is required in YYYY-MM-DD format'),
  storeId: z.string().optional() // received as string from query params
});

const inventoryValuationQuerySchema = z.object({
  storeId: z.string().optional()
});

const endOfDayQuerySchema = z.object({
  date: z.string().min(10, 'Date is required in YYYY-MM-DD format'),
  storeId: z.string().optional()
});

// Protect all report routes - Admin and Manager only
reports.use('*', auth, rbac(['admin', 'manager']));

// GET /api/reports/sales-summary
reports.get('/sales-summary', validateQuery(salesSummaryQuerySchema), ReportController.getSalesSummary);

// GET /api/reports/inventory-valuation
reports.get('/inventory-valuation', validateQuery(inventoryValuationQuerySchema), ReportController.getInventoryValuation);

// GET /api/reports/end-of-day
reports.get('/end-of-day', validateQuery(endOfDayQuerySchema), ReportController.getEndOfDay);

export default reports;
