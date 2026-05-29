import { Hono } from 'hono';
import { Bindings } from '../types/env.js';
import { DiscountController } from '../controllers/discountController.js';
import { authMiddleware } from '../middleware/auth.js';

const discounts = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware
discounts.use('*', authMiddleware);

// Promotions
discounts.get('/promotions', DiscountController.getPromotions);
discounts.post('/promotions', DiscountController.createPromotion);

// Coupons
discounts.get('/coupons', DiscountController.getCoupons);
discounts.post('/coupons', DiscountController.createCoupon);

export default discounts;
