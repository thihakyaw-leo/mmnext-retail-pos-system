import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface PromotionData {
  name: string;
  type: string;
  value: number;
  start_date: string;
  end_date: string;
}

export interface CouponData {
  code: string;
  type: string;
  value: number;
  usage_limit?: number;
}

export class DiscountService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  // --- Promotions ---

  async getPromotions(orgId: string) {
    try {
      const sql = `
        SELECT 
          *,
          CASE 
            WHEN date('now') < start_date THEN 'Scheduled'
            WHEN date('now') > end_date THEN 'Expired'
            WHEN is_active = 0 THEN 'Inactive'
            ELSE 'Active'
          END as status
        FROM promotions 
        WHERE organization_id = ? 
        ORDER BY start_date DESC
      `;
      const result = await this.db.execute({ sql, args: [orgId] });
      return { success: true, data: result.results || [] };
    } catch (error: any) {
      console.error('Get Promotions Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createPromotion(orgId: string, data: PromotionData, userId: number) {
    try {
      const sql = `
        INSERT INTO promotions (organization_id, name, type, value, start_date, end_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `;
      const result = await this.db.execute({ sql, args: [
        orgId,
        data.name,
        data.type,
        data.value,
        data.start_date,
        data.end_date,
        userId
      ] });
      return { success: true, data: result.results?.[0] };
    } catch (error: any) {
      console.error('Create Promotion Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  // --- Coupons ---

  async getCoupons(orgId: string) {
    try {
      const sql = `
        SELECT 
          *,
          CASE 
            WHEN is_active = 0 THEN 'Inactive'
            WHEN usage_limit IS NOT NULL AND used_count >= usage_limit THEN 'Depleted'
            ELSE 'Active'
          END as status
        FROM coupons 
        WHERE organization_id = ? 
        ORDER BY created_at DESC
      `;
      const result = await this.db.execute({ sql, args: [orgId] });
      return { success: true, data: result.results || [] };
    } catch (error: any) {
      console.error('Get Coupons Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createCoupon(orgId: string, data: CouponData, userId: number) {
    try {
      const sql = `
        INSERT INTO coupons (organization_id, code, type, value, usage_limit, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `;
      const result = await this.db.execute({ sql, args: [
        orgId,
        data.code.toUpperCase(),
        data.type,
        data.value,
        data.usage_limit || null,
        userId
      ] });
      return { success: true, data: result.results?.[0] };
    } catch (error: any) {
      console.error('Create Coupon Error:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
         return { success: false, error: 'Coupon code already exists', status: 400 };
      }
      return { success: false, error: error.message, status: 500 };
    }
  }
}
