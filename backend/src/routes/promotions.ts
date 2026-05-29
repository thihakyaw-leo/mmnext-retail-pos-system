import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { zValidator } from '@hono/zod-validator';
import { PromotionController } from '../controllers/promotionController.js';

const promotions = new Hono();

const promotionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']),
  value: z.number().min(0, 'Value must be positive'),
  minimum_amount: z.number().optional().nullable(),
  maximum_discount: z.number().optional().nullable(),
  usage_limit: z.number().optional().nullable(),
  customer_usage_limit: z.number().default(1),
  applicable_products: z.array(z.string()).optional(),
  applicable_categories: z.array(z.string()).optional(),
  customer_groups: z.array(z.string()).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_active: z.boolean().default(true)
});

const validateSchema = z.object({
  code: z.string().min(1, 'Promotion code or ID is required'),
  cartTotal: z.number().min(0),
  customerId: z.string().optional()
});

// Protect all routes
promotions.use('*', auth);

// Cashiers can validate and fetch active promotions, but only admin/managers can edit them.
promotions.post('/validate', rbac(['admin', 'manager', 'cashier']), zValidator('json', validateSchema), PromotionController.validatePromotion);
promotions.get('/', rbac(['admin', 'manager', 'cashier']), PromotionController.getPromotions);
promotions.get('/:id', rbac(['admin', 'manager', 'cashier']), PromotionController.getPromotion);

// Admin/Manager only routes
promotions.post('/', rbac(['admin', 'manager']), zValidator('json', promotionSchema), PromotionController.createPromotion);
promotions.put('/:id', rbac(['admin', 'manager']), zValidator('json', promotionSchema.partial()), PromotionController.updatePromotion);
promotions.delete('/:id', rbac(['admin', 'manager']), PromotionController.deletePromotion);

export default promotions;
