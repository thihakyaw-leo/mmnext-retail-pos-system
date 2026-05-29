import { Context } from 'hono';
import { z } from 'zod';
import { DiscountService } from '../services/discountService.js';
import { Bindings } from '../types/env.js';

const promotionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percent', 'fixed', 'bogo', 'Percentage Off', 'Fixed Amount', 'BOGO']),
  value: z.number().min(0),
  start_date: z.string(),
  end_date: z.string(),
});

const couponSchema = z.object({
  code: z.string().min(3).max(50),
  type: z.enum(['percent', 'fixed', 'Percentage Off', 'Fixed Amount']),
  value: z.number().min(0),
  usage_limit: z.number().nullable().optional(),
});

export class DiscountController {
  
  static async getPromotions(c: Context<Bindings>) {
    const orgId = c.get('orgId') as string;
    const service = new DiscountService(c.env);
    const result = await service.getPromotions(orgId);
    return c.json(result);
  }

  static async createPromotion(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      const body = await c.req.json();
      const data = promotionSchema.parse(body);
      const service = new DiscountService(c.env);
      const result = await service.createPromotion(orgId, data, user.id);
      return c.json(result, result.success ? 201 : result.status);
    } catch (e: any) {
      return c.json({ success: false, error: e.message || 'Invalid data' }, 400);
    }
  }

  static async getCoupons(c: Context<Bindings>) {
    const orgId = c.get('orgId') as string;
    const service = new DiscountService(c.env);
    const result = await service.getCoupons(orgId);
    return c.json(result);
  }

  static async createCoupon(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      const body = await c.req.json();
      const data = couponSchema.parse(body);
      const service = new DiscountService(c.env);
      const result = await service.createCoupon(orgId, data, user.id);
      return c.json(result, result.success ? 201 : result.status);
    } catch (e: any) {
      return c.json({ success: false, error: e.message || 'Invalid data' }, 400);
    }
  }
}
