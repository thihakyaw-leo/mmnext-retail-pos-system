import { Env } from '../types/env.js';
import { AppError } from '../utils/errorHandler.js';

export class OrganizationService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  // --- ORGANIZATION SETTINGS ---

  async getOrganization(orgId: string) {
    const query = `SELECT * FROM organizations WHERE id = ?`;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    
    if (!results || results.length === 0) {
      throw new AppError('Organization not found', 'NOT_FOUND', 404);
    }
    
    return this.parseJSONFields(results[0]);
  }

  async updateOrganization(orgId: string, data: any) {
    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      'name', 'description', 'logo_url', 'website', 'phone', 'email',
      'address', 'city', 'state', 'country', 'postal_code', 'timezone',
      'currency', 'tax_rate', 'business_type', 'license_number'
    ];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    });

    if (data.settings !== undefined) {
      updates.push(`settings = ?`);
      params.push(JSON.stringify(data.settings));
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 'VALIDATION_ERROR', 400);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(orgId);

    const query = `
      UPDATE organizations 
      SET ${updates.join(', ')} 
      WHERE id = ?
      RETURNING *
    `;

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parseJSONFields(results[0]);
  }

  // --- STORE MANAGEMENT ---

  async getStores(orgId: string) {
    const query = `SELECT * FROM stores WHERE organization_id = ? ORDER BY created_at DESC`;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results.map(this.parseJSONFields);
  }

  async getStore(orgId: string, storeId: string) {
    const query = `SELECT * FROM stores WHERE id = ? AND organization_id = ?`;
    const { results } = await this.db.prepare(query).bind(storeId, orgId).all();
    
    if (!results || results.length === 0) {
      throw new AppError('Store not found', 'NOT_FOUND', 404);
    }

    return this.parseJSONFields(results[0]);
  }

  async createStore(orgId: string, data: any) {
    // Check if code is unique within org
    const existing = await this.db.prepare(
      `SELECT id FROM stores WHERE code = ? AND organization_id = ?`
    ).bind(data.code, orgId).first();

    if (existing) {
      throw new AppError('Store code must be unique', 'VALIDATION_ERROR', 400);
    }

    const query = `
      INSERT INTO stores (
        organization_id, name, code, description, phone, email,
        address, city, state, postal_code, latitude, longitude,
        manager_id, opening_hours, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const params = [
      orgId,
      data.name,
      data.code,
      data.description || null,
      data.phone || null,
      data.email || null,
      data.address,
      data.city,
      data.state || null,
      data.postal_code || null,
      data.latitude || null,
      data.longitude || null,
      data.manager_id || null,
      JSON.stringify(data.opening_hours || {}),
      data.is_active !== false ? 1 : 0
    ];

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parseJSONFields(results[0]);
  }

  async updateStore(orgId: string, storeId: string, data: any) {
    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      'name', 'code', 'description', 'phone', 'email',
      'address', 'city', 'state', 'postal_code', 
      'latitude', 'longitude', 'manager_id'
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

    if (data.opening_hours !== undefined) {
      updates.push(`opening_hours = ?`);
      params.push(JSON.stringify(data.opening_hours));
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 'VALIDATION_ERROR', 400);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(storeId, orgId);

    // If updating code, ensure uniqueness
    if (data.code !== undefined) {
      const existing = await this.db.prepare(
        `SELECT id FROM stores WHERE code = ? AND organization_id = ? AND id != ?`
      ).bind(data.code, orgId, storeId).first();
  
      if (existing) {
        throw new AppError('Store code must be unique', 'VALIDATION_ERROR', 400);
      }
    }

    const query = `
      UPDATE stores 
      SET ${updates.join(', ')} 
      WHERE id = ? AND organization_id = ?
      RETURNING *
    `;

    const { results } = await this.db.prepare(query).bind(...params).all();
    
    if (!results || results.length === 0) {
      throw new AppError('Store not found', 'NOT_FOUND', 404);
    }
    
    return this.parseJSONFields(results[0]);
  }

  async deleteStore(orgId: string, storeId: string) {
    // We soft-delete the store to preserve historical references like orders
    const { results } = await this.db.prepare(
      `UPDATE stores SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ? RETURNING *`
    ).bind(storeId, orgId).all();

    if (!results || results.length === 0) {
      throw new AppError('Store not found', 'NOT_FOUND', 404);
    }

    return { success: true, message: 'Store deactivated successfully' };
  }

  private parseJSONFields(record: any) {
    if (!record) return null;
    const parsed = { ...record };
    
    ['settings', 'opening_hours'].forEach(field => {
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

    if (parsed.is_active !== undefined) {
      parsed.is_active = parsed.is_active === 1 || parsed.is_active === true;
    }
    
    return parsed;
  }
}
