import { Env } from '../types/env.js';
import { AppError } from '../utils/errorHandler.js';

export interface LogActionParams {
  userId?: string | number;
  organizationId: string | number;
  storeId?: string | number;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'report_generated';
  resourceType: string;
  resourceId?: string | number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  /**
   * Log an action to the audit_logs table
   */
  async logAction(params: LogActionParams) {
    const query = `
      INSERT INTO audit_logs (
        user_id, organization_id, store_id, action, resource_type, 
        resource_id, old_values, new_values, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.prepare(query).bind(
        params.userId || null,
        params.organizationId,
        params.storeId || null,
        params.action,
        params.resourceType,
        params.resourceId || null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.ipAddress || null,
        params.userAgent || null
      ).run();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // We don't throw an error here because audit logging should not break the main business logic flow
      return { success: false, error };
    }
  }

  /**
   * Fetch audit logs with pagination and filters
   */
  async getLogs(orgId: string | number, filters: any = {}) {
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.email 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.organization_id = ?
    `;
    const params: any[] = [orgId];

    if (filters.userId) {
      query += ` AND a.user_id = ?`;
      params.push(filters.userId);
    }

    if (filters.storeId) {
      query += ` AND a.store_id = ?`;
      params.push(filters.storeId);
    }

    if (filters.action) {
      query += ` AND a.action = ?`;
      params.push(filters.action);
    }

    if (filters.resourceType) {
      query += ` AND a.resource_type = ?`;
      params.push(filters.resourceType);
    }

    if (filters.startDate) {
      query += ` AND a.created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      // Add 1 day to end date to make it inclusive of the entire day
      query += ` AND a.created_at <= date(?, '+1 day')`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY a.created_at DESC`;

    // Pagination
    const limit = filters.limit ? parseInt(filters.limit, 10) : 50;
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await this.db.prepare(query).bind(...params).all();
    
    // Parse JSON strings back into objects
    return results.map((row: any) => {
      const parsed = { ...row };
      if (typeof parsed.old_values === 'string') {
        try { parsed.old_values = JSON.parse(parsed.old_values); } catch { /* ignore */ }
      }
      if (typeof parsed.new_values === 'string') {
        try { parsed.new_values = JSON.parse(parsed.new_values); } catch { /* ignore */ }
      }
      return parsed;
    });
  }

  /**
   * Fetch a specific log entry by ID
   */
  async getLogDetails(orgId: string | number, logId: string | number) {
    const query = `
      SELECT a.*, u.first_name, u.last_name, u.email 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ? AND a.organization_id = ?
    `;

    const { results } = await this.db.prepare(query).bind(logId, orgId).all();

    if (!results || results.length === 0) {
      throw new AppError('Audit log entry not found', 'NOT_FOUND', 404);
    }

    const parsed = { ...results[0] } as any;
    if (typeof parsed.old_values === 'string') {
      try { parsed.old_values = JSON.parse(parsed.old_values); } catch { /* ignore */ }
    }
    if (typeof parsed.new_values === 'string') {
      try { parsed.new_values = JSON.parse(parsed.new_values); } catch { /* ignore */ }
    }

    return parsed;
  }
}
