import { Env } from '../types/env.js';
import { AppError } from '../utils/errorHandler.js';

export class PromotionService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  async getPromotions(orgId: string, queryParams: any = {}) {
    let query = `SELECT * FROM promotions WHERE organization_id = ?`;
    const params: any[] = [orgId];

    if (queryParams.activeOnly === 'true') {
      const now = new Date().toISOString();
      query += ` AND is_active = 1 AND start_date <= ? AND (end_date >= ? OR end_date IS NULL)`;
      params.push(now, now);
    }

    query += ` ORDER BY created_at DESC`;
    
    const { results } = await this.db.prepare(query).bind(...params).all();
    
    return results.map((promo: any) => this.parsePromotionJSON(promo));
  }

  async getPromotion(orgId: string, promoId: string) {
    const query = `SELECT * FROM promotions WHERE id = ? AND organization_id = ?`;
    const { results } = await this.db.prepare(query).bind(promoId, orgId).all();
    
    if (!results || results.length === 0) {
      throw new AppError('Promotion not found', 'NOT_FOUND', 404);
    }

    return this.parsePromotionJSON(results[0]);
  }

  async createPromotion(orgId: string, data: any) {
    const query = `
      INSERT INTO promotions (
        organization_id, name, description, type, value, 
        minimum_amount, maximum_discount, usage_limit, customer_usage_limit, 
        applicable_products, applicable_categories, customer_groups, 
        start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const params = [
      orgId,
      data.name,
      data.description || null,
      data.type,
      data.value,
      data.minimum_amount || null,
      data.maximum_discount || null,
      data.usage_limit || null,
      data.customer_usage_limit || 1,
      JSON.stringify(data.applicable_products || []),
      JSON.stringify(data.applicable_categories || []),
      JSON.stringify(data.customer_groups || []),
      data.start_date,
      data.end_date,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    ];

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parsePromotionJSON(results[0]);
  }

  async updatePromotion(orgId: string, promoId: string, data: any) {
    // First verify it exists
    await this.getPromotion(orgId, promoId);

    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      'name', 'description', 'type', 'value', 'minimum_amount', 
      'maximum_discount', 'usage_limit', 'customer_usage_limit', 
      'start_date', 'end_date'
    ];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    });

    if (data.is_active !== undefined) {
      updates.push(`is_active = ?`);
      params.push(data.is_active ? 1 : 0);
    }

    const jsonFields = ['applicable_products', 'applicable_categories', 'customer_groups'];
    jsonFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(JSON.stringify(data[field]));
      }
    });

    if (updates.length === 0) {
      return this.getPromotion(orgId, promoId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(promoId, orgId);

    const query = `
      UPDATE promotions 
      SET ${updates.join(', ')} 
      WHERE id = ? AND organization_id = ?
      RETURNING *
    `;

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parsePromotionJSON(results[0]);
  }

  async deletePromotion(orgId: string, promoId: string) {
    // Check if usage exists
    const usageCheck = await this.db.prepare(
      `SELECT count(*) as count FROM promotion_usage WHERE promotion_id = ?`
    ).bind(promoId).first();
    
    if (usageCheck && (usageCheck as any).count > 0) {
      // Soft delete if used
      await this.db.prepare(
        `UPDATE promotions SET is_active = 0 WHERE id = ? AND organization_id = ?`
      ).bind(promoId, orgId).run();
      return { success: true, message: 'Promotion deactivated because it has usage history' };
    } else {
      // Hard delete if unused
      await this.db.prepare(
        `DELETE FROM promotions WHERE id = ? AND organization_id = ?`
      ).bind(promoId, orgId).run();
      return { success: true, message: 'Promotion deleted' };
    }
  }

  async validateAndCalculateDiscount(orgId: string, identifier: string, cartTotal: number, customerId?: string) {
    // Identifier can be ID or Name
    const isId = !isNaN(Number(identifier));
    const query = isId 
      ? `SELECT * FROM promotions WHERE id = ? AND organization_id = ?`
      : `SELECT * FROM promotions WHERE name = ? AND organization_id = ? COLLATE NOCASE`;
    
    const { results } = await this.db.prepare(query).bind(identifier, orgId).all();
    
    if (!results || results.length === 0) {
      throw new AppError('Invalid promotion code or ID', 'VALIDATION_ERROR', 400);
    }

    const promo: any = this.parsePromotionJSON(results[0]);
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);

    // 1. Check if active and within date range
    if (!promo.is_active || now < startDate || now > endDate) {
      throw new AppError('This promotion is expired or inactive', 'VALIDATION_ERROR', 400);
    }

    // 2. Check minimum amount
    if (promo.minimum_amount && cartTotal < promo.minimum_amount) {
      throw new AppError(`Minimum purchase amount of ${promo.minimum_amount} required`, 'VALIDATION_ERROR', 400);
    }

    // 3. Check global usage limit
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      throw new AppError('This promotion has reached its maximum usage limit', 'VALIDATION_ERROR', 400);
    }

    // 4. Check customer specific usage limit
    if (customerId && promo.customer_usage_limit) {
      const { results: usageResults } = await this.db.prepare(
        `SELECT COUNT(*) as count FROM promotion_usage WHERE promotion_id = ? AND customer_id = ?`
      ).bind(promo.id, customerId).all();
      
      const customerUses = (usageResults[0] as any).count || 0;
      if (customerUses >= promo.customer_usage_limit) {
        throw new AppError('You have already reached the usage limit for this promotion', 'VALIDATION_ERROR', 400);
      }
    } else if (!customerId && promo.customer_usage_limit) {
      // If customer limit exists but no customer provided, we might still allow it or warn.
      // Usually POS can apply general discounts to walk-ins. We'll allow it for walk-ins, relying on global usage limit.
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.type === 'percentage') {
      discountAmount = (cartTotal * promo.value) / 100;
      if (promo.maximum_discount && discountAmount > promo.maximum_discount) {
        discountAmount = promo.maximum_discount;
      }
    } else if (promo.type === 'fixed_amount') {
      discountAmount = promo.value;
    }
    
    // Discount cannot exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return {
      valid: true,
      promotion: promo,
      discount_amount: Number(discountAmount.toFixed(2)),
      new_total: Number((cartTotal - discountAmount).toFixed(2))
    };
  }

  async recordPromotionUsage(orgId: string, promoId: string | number, orderId: string | number, customerId?: string | number, discountAmount?: number) {
    // Insert into usage table
    await this.db.prepare(`
      INSERT INTO promotion_usage (promotion_id, order_id, customer_id, discount_amount)
      VALUES (?, ?, ?, ?)
    `).bind(promoId, orderId, customerId || null, discountAmount || 0).run();

    // Increment global usage count
    await this.db.prepare(`
      UPDATE promotions 
      SET usage_count = usage_count + 1 
      WHERE id = ? AND organization_id = ?
    `).bind(promoId, orgId).run();

    return true;
  }

  private parsePromotionJSON(promo: any) {
    if (!promo) return null;
    
    const parsed = { ...promo };
    
    // Safe JSON parse for arrays
    const arrayFields = ['applicable_products', 'applicable_categories', 'customer_groups'];
    arrayFields.forEach(field => {
      if (typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          parsed[field] = [];
        }
      } else if (!parsed[field]) {
        parsed[field] = [];
      }
    });

    // Convert booleans
    parsed.is_active = parsed.is_active === 1 || parsed.is_active === true;
    
    return parsed;
  }
}
