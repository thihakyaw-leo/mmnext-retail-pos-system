import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface StaffCreateData {
  store_id?: number | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role?: string;
  employee_id?: string | null;
  department?: string | null;
  salary?: number | null;
}

export interface StaffUpdateData extends Partial<StaffCreateData> {
  is_active?: number;
}

export class StaffService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async getStaffs(orgId: string, filters: any = {}) {
    try {
      let whereClause = 'organization_id = ? AND deleted_at IS NULL';
      let whereArgs: any[] = [orgId];

      if (filters.search) {
        whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchPattern = `%${filters.search}%`;
        whereArgs.push(searchPattern, searchPattern, searchPattern);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        whereArgs.push(Number(filters.is_active));
      }
      
      if (filters.role) {
        whereClause += ' AND role = ?';
        whereArgs.push(filters.role);
      }

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '20');
      const offset = (page - 1) * limit;

      const sql = `
        SELECT id, organization_id, store_id, email, first_name, last_name, 
               phone, avatar_url, role, permissions, employee_id, department, 
               hire_date, is_active, last_login, created_at, updated_at
        FROM users
        WHERE ${whereClause}
        ORDER BY first_name ASC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.execute({ sql, args: [...whereArgs, limit, offset] });

      const countSql = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
      const countResult = await this.db.first({ sql: countSql, args: whereArgs });

      return {
        success: true,
        data: result.results || [],
        pagination: {
          total: countResult?.total || 0,
          page,
          limit,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      };
    } catch (error: any) {
      console.error('Get Staffs Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getStaffById(orgId: string, staffId: string | number) {
    try {
      const sql = `
        SELECT id, organization_id, store_id, email, first_name, last_name, 
               phone, avatar_url, role, permissions, employee_id, department, 
               hire_date, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;
      const result = await this.db.first({ sql, args: [orgId, staffId] });
      
      if (!result) {
        return { success: false, error: 'Staff not found', status: 404 };
      }
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Get Staff Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createStaff(orgId: string, data: StaffCreateData) {
    try {
      const sql = `
        INSERT INTO users (
          organization_id, store_id, email, password_hash,
          first_name, last_name, phone, role, employee_id, department, salary,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        )
        RETURNING id
      `;

      const result = await this.db.execute({ sql, args: [
        orgId,
        data.store_id || null,
        data.email,
        data.password_hash,
        data.first_name,
        data.last_name,
        data.phone || null,
        data.role || 'cashier',
        data.employee_id || null,
        data.department || null,
        data.salary || null
      ] });

      if (!result.success || !result.results || result.results.length === 0) {
        return { success: false, error: 'Failed to create staff', status: 500 };
      }

      return { success: true, id: result.results[0].id, message: 'Staff created successfully' };
    } catch (error: any) {
      console.error('Create Staff Error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A staff member with this username or email already exists', status: 409 };
      }
      return { success: false, error: error.message, status: 500 };
    }
  }

  async updateStaff(orgId: string, staffId: string | number, data: StaffUpdateData) {
    try {
      const updates: string[] = [];
      const args: any[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          args.push(value);
        }
      }

      if (updates.length === 0) {
        return { success: false, error: 'No data provided for update', status: 400 };
      }

      updates.push("updated_at = datetime('now')");
      args.push(orgId, staffId);

      const sql = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;

      await this.db.execute({ sql, args });
      return { success: true, message: 'Staff updated successfully' };
    } catch (error: any) {
      console.error('Update Staff Error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A staff member with this username or email already exists', status: 409 };
      }
      return { success: false, error: error.message, status: 500 };
    }
  }

  async deleteStaff(orgId: string, staffId: string | number) {
    try {
      const sql = `
        UPDATE users 
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;
      
      const result = await this.db.execute({ sql, args: [orgId, staffId] });
      return { success: true, message: 'Staff deleted successfully' };
    } catch (error: any) {
      console.error('Delete Staff Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getStaffStats(orgId: string, staffId: string | number) {
    try {
      // Calculate staff sales stats dynamically from orders table instead of staff_stats
      const sql = `
        SELECT 
          COUNT(id) as total_orders,
          SUM(total_amount) as total_sales
        FROM orders
        WHERE organization_id = ? AND cashier_id = ? AND status = 'completed' AND deleted_at IS NULL
      `;
      const result = await this.db.first({ sql, args: [orgId, staffId] });
      
      return { 
        success: true, 
        data: {
          total_orders: result?.total_orders || 0,
          total_sales: result?.total_sales || 0
        }
      };
    } catch (error: any) {
      console.error('Get Staff Stats Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}
