import { Env } from '../types/env.js';
import { AppError } from '../utils/errorHandler.js';

export class LoyaltyService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  // --- PROGRAM MANAGEMENT ---

  async getPrograms(orgId: string) {
    const query = `SELECT * FROM loyalty_programs WHERE organization_id = ? ORDER BY created_at DESC`;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results.map(this.parseJSONFields);
  }

  async getActiveProgram(orgId: string) {
    const query = `SELECT * FROM loyalty_programs WHERE organization_id = ? AND is_active = 1 LIMIT 1`;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results.length > 0 ? this.parseJSONFields(results[0]) : null;
  }

  async createProgram(orgId: string, data: any) {
    // If this new program is active, deactivate all others for this org
    if (data.is_active !== false) {
      await this.db.prepare(`UPDATE loyalty_programs SET is_active = 0 WHERE organization_id = ?`).bind(orgId).run();
    }

    const query = `
      INSERT INTO loyalty_programs (
        organization_id, name, description, points_per_currency, currency_per_point,
        minimum_spend, expiry_months, tier_thresholds, rules, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const params = [
      orgId,
      data.name,
      data.description || null,
      data.points_per_currency ?? 1.0,
      data.currency_per_point ?? 1.0,
      data.minimum_spend ?? 0,
      data.expiry_months ?? 12,
      JSON.stringify(data.tier_thresholds || {}),
      JSON.stringify(data.rules || {}),
      data.is_active !== false ? 1 : 0
    ];

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parseJSONFields(results[0]);
  }

  async updateProgram(orgId: string, programId: string, data: any) {
    // If setting to active, deactivate others
    if (data.is_active === true) {
      await this.db.prepare(`UPDATE loyalty_programs SET is_active = 0 WHERE organization_id = ? AND id != ?`)
        .bind(orgId, programId).run();
    }

    const updates: string[] = [];
    const params: any[] = [];

    const fields = ['name', 'description', 'points_per_currency', 'currency_per_point', 'minimum_spend', 'expiry_months'];
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

    if (data.tier_thresholds !== undefined) {
      updates.push(`tier_thresholds = ?`);
      params.push(JSON.stringify(data.tier_thresholds));
    }
    
    if (data.rules !== undefined) {
      updates.push(`rules = ?`);
      params.push(JSON.stringify(data.rules));
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 'VALIDATION_ERROR', 400);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(programId, orgId);

    const query = `
      UPDATE loyalty_programs 
      SET ${updates.join(', ')} 
      WHERE id = ? AND organization_id = ?
      RETURNING *
    `;

    const { results } = await this.db.prepare(query).bind(...params).all();
    if (!results || results.length === 0) {
      throw new AppError('Program not found', 'NOT_FOUND', 404);
    }

    return this.parseJSONFields(results[0]);
  }

  // --- POINTS TRANSACTIONS ---

  async earnPoints(orgId: string, customerId: string, orderId: string, amountSpent: number) {
    const program = await this.getActiveProgram(orgId);
    if (!program) {
      return { success: false, message: 'No active loyalty program found', pointsEarned: 0 };
    }

    if (amountSpent < program.minimum_spend) {
      return { success: false, message: `Minimum spend of ${program.minimum_spend} not met`, pointsEarned: 0 };
    }

    const pointsToEarn = Math.floor(amountSpent * program.points_per_currency);
    
    if (pointsToEarn <= 0) {
      return { success: false, message: 'No points earned for this transaction', pointsEarned: 0 };
    }

    // Insert transaction
    await this.db.prepare(`
      INSERT INTO loyalty_transactions (customer_id, order_id, transaction_type, points, description)
      VALUES (?, ?, 'earned', ?, 'Points earned from purchase')
    `).bind(customerId, orderId, pointsToEarn).run();

    // Update customer points
    await this.db.prepare(`
      UPDATE customers 
      SET loyalty_points = COALESCE(loyalty_points, 0) + ? 
      WHERE id = ? AND organization_id = ?
    `).bind(pointsToEarn, customerId, orgId).run();

    return { success: true, pointsEarned: pointsToEarn };
  }

  async redeemPoints(orgId: string, customerId: string, orderId: string, pointsToRedeem: number) {
    if (pointsToRedeem <= 0) throw new AppError('Points to redeem must be greater than 0', 'VALIDATION_ERROR', 400);

    const program = await this.getActiveProgram(orgId);
    if (!program) {
      throw new AppError('No active loyalty program found', 'VALIDATION_ERROR', 400);
    }

    // Check customer's current points safely by explicitly checking organization_id
    const customerQuery = await this.db.prepare(
      `SELECT loyalty_points FROM customers WHERE id = ? AND organization_id = ?`
    ).bind(customerId, orgId).first();

    if (!customerQuery) {
      throw new AppError('Customer not found', 'NOT_FOUND', 404);
    }

    const currentPoints = (customerQuery as any).loyalty_points || 0;

    if (currentPoints < pointsToRedeem) {
      throw new AppError(`Insufficient points. Customer only has ${currentPoints} points.`, 'VALIDATION_ERROR', 400);
    }

    const discountValue = pointsToRedeem * program.currency_per_point;

    // Insert redemption transaction
    await this.db.prepare(`
      INSERT INTO loyalty_transactions (customer_id, order_id, transaction_type, points, description)
      VALUES (?, ?, 'redeemed', ?, 'Points redeemed for discount')
    `).bind(customerId, orderId, -Math.abs(pointsToRedeem)).run();

    // Deduct points from customer
    await this.db.prepare(`
      UPDATE customers 
      SET loyalty_points = loyalty_points - ? 
      WHERE id = ? AND organization_id = ?
    `).bind(Math.abs(pointsToRedeem), customerId, orgId).run();

    return { 
      success: true, 
      pointsRedeemed: pointsToRedeem, 
      discountValue: Number(discountValue.toFixed(2)),
      remainingPoints: currentPoints - pointsToRedeem
    };
  }

  async getCustomerPointsHistory(orgId: string, customerId: string) {
    // Verify customer belongs to org
    const customerQuery = await this.db.prepare(
      `SELECT id FROM customers WHERE id = ? AND organization_id = ?`
    ).bind(customerId, orgId).first();
    
    if (!customerQuery) {
      throw new AppError('Customer not found in this organization', 'NOT_FOUND', 404);
    }

    const query = `
      SELECT * FROM loyalty_transactions 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
    `;
    const { results } = await this.db.prepare(query).bind(customerId).all();
    return results;
  }

  private parseJSONFields(record: any) {
    if (!record) return null;
    const parsed = { ...record };
    
    ['tier_thresholds', 'rules'].forEach(field => {
      if (typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch {
          parsed[field] = {};
        }
      } else if (!parsed[field]) {
        parsed[field] = {};
      }
    });

    parsed.is_active = parsed.is_active === 1 || parsed.is_active === true;
    return parsed;
  }
}
