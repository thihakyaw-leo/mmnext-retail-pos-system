import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface CustomerCreateData {
  customer_number?: string | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  customer_group?: string;
  notes?: string | null;
  company_name?: string | null;
  loyalty_member?: boolean;
}

export interface CustomerUpdateData extends Partial<CustomerCreateData> {
  is_active?: number;
}

export class CustomerService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async getCustomers(orgId: string, filters: any = {}) {
    try {
      let whereClause = 'organization_id = ? AND deleted_at IS NULL';
      let whereArgs: any[] = [orgId];

      if (filters.search) {
        whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchPattern = `%${filters.search}%`;
        whereArgs.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        whereArgs.push(Number(filters.is_active));
      }

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '20');
      const offset = (page - 1) * limit;

      const sql = `
        SELECT * FROM customers
        WHERE ${whereClause}
        ORDER BY first_name ASC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.execute({ sql, args: [...whereArgs, limit, offset] });

      const countSql = `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`;
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
      console.error('Get Customers Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getCustomerById(orgId: string, customerId: string | number) {
    try {
      const sql = `
        SELECT * FROM customers 
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;
      const result = await this.db.first({ sql, args: [orgId, customerId] });
      
      if (!result) {
        return { success: false, error: 'Customer not found', status: 404 };
      }
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Get Customer Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createCustomer(orgId: string, data: CustomerCreateData) {
    try {
      const customerCode = data.customer_number || `CUST${Date.now()}`;
      const sql = `
        INSERT INTO customers (
          organization_id, customer_code, first_name, last_name,
          email, phone, date_of_birth, gender, address_line_1, city, state,
          zip_code, country, customer_segment, notes, company_name, loyalty_member, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        )
        RETURNING id
      `;

      const result = await this.db.execute({ sql, args: [
        orgId,
        customerCode,
        data.first_name,
        data.last_name,
        data.email || null,
        data.phone || null,
        data.date_of_birth || null,
        data.gender || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.postal_code || null,
        data.country || 'VN',
        data.customer_group || 'regular',
        data.notes || null,
        data.company_name || null,
        data.loyalty_member ? 1 : 0
      ] });

      if (!result.success || !result.results || result.results.length === 0) {
        return { success: false, error: 'Failed to create customer', status: 500 };
      }

      return { success: true, id: result.results[0].id, message: 'Customer created successfully' };
    } catch (error: any) {
      console.error('Create Customer Error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A customer with this email or number already exists', status: 409 };
      }
      return { success: false, error: error.message, status: 500 };
    }
  }

  async updateCustomer(orgId: string, customerId: string | number, data: CustomerUpdateData) {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const args: any[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          let dbKey = key;
          if (key === 'address') dbKey = 'address_line_1';
          if (key === 'postal_code') dbKey = 'zip_code';
          if (key === 'customer_number') dbKey = 'customer_code';
          if (key === 'customer_group') dbKey = 'customer_segment';
          
          let dbValue = value;
          if (key === 'loyalty_member') dbValue = value ? 1 : 0;
          
          updates.push(`${dbKey} = ?`);
          args.push(dbValue);
        }
      }

      if (updates.length === 0) {
        return { success: false, error: 'No data provided for update', status: 400 };
      }

      updates.push("updated_at = datetime('now')");
      args.push(orgId, customerId);

      const sql = `
        UPDATE customers 
        SET ${updates.join(', ')}
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;

      await this.db.execute({ sql, args });
      return { success: true, message: 'Customer updated successfully' };
    } catch (error: any) {
      console.error('Update Customer Error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'A customer with this email or number already exists', status: 409 };
      }
      return { success: false, error: error.message, status: 500 };
    }
  }

  async deleteCustomer(orgId: string, customerId: string | number) {
    try {
      const sql = `
        UPDATE customers 
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE organization_id = ? AND id = ? AND deleted_at IS NULL
      `;
      
      const result = await this.db.execute({ sql, args: [orgId, customerId] });
      return { success: true, message: 'Customer deleted successfully' };
    } catch (error: any) {
      console.error('Delete Customer Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}
