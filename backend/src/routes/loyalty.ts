import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { zValidator } from '@hono/zod-validator';
import { LoyaltyController } from '../controllers/loyaltyController.js';

const loyalty = new Hono();

const programSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  points_per_currency: z.number().min(0).default(1.0),
  currency_per_point: z.number().min(0).default(1.0),
  minimum_spend: z.number().min(0).default(0),
  expiry_months: z.number().min(1).default(12),
  tier_thresholds: z.record(z.string(), z.any()).optional(),
  rules: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().default(true)
});

const earnPointsSchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  orderId: z.union([z.string(), z.number()]),
  amountSpent: z.number().min(0, 'Amount spent cannot be negative')
});

const redeemPointsSchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  orderId: z.union([z.string(), z.number()]),
  pointsToRedeem: z.number().min(1, 'Points to redeem must be at least 1')
});

// Protect all routes
loyalty.use('*', auth);

// --- Admin/Manager: Program Settings ---
loyalty.get('/programs', rbac(['admin', 'manager']), LoyaltyController.getPrograms);
loyalty.post('/programs', rbac(['admin', 'manager']), zValidator('json', programSchema), LoyaltyController.createProgram);
loyalty.put('/programs/:id', rbac(['admin', 'manager']), zValidator('json', programSchema.partial()), LoyaltyController.updateProgram);

// --- Cashier/Admin/Manager: Points Transactions ---
loyalty.post('/transactions/earn', rbac(['admin', 'manager', 'cashier']), zValidator('json', earnPointsSchema), LoyaltyController.earnPoints);
loyalty.post('/transactions/redeem', rbac(['admin', 'manager', 'cashier']), zValidator('json', redeemPointsSchema), LoyaltyController.redeemPoints);
loyalty.get('/customers/:customerId/history', rbac(['admin', 'manager', 'cashier']), LoyaltyController.getHistory);

export default loyalty;
