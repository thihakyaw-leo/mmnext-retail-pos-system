import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export class SupplierService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async getAllSuppliers(orgId: string | number, filters: any = {}) {
    try {
      const { search, is_active, page = 1, limit = 20 } = filters;
      
      let whereClause = 'organization_id = ?';
      const whereArgs: any[] = [orgId];

      if (is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        whereArgs.push(Number(is_active));
      }

      if (search) {
        whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        whereArgs.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const offset = (Number(page) - 1) * Number(limit);

      const result = await this.db.execute({
        sql: `
          SELECT * FROM suppliers
          WHERE ${whereClause}
          ORDER BY name ASC
          LIMIT ? OFFSET ?
        `,
        args: [...whereArgs, Number(limit), offset]
      });

      const totalResult = await this.db.execute({
        sql: `SELECT COUNT(*) as count FROM suppliers WHERE ${whereClause}`,
        args: whereArgs
      });

      return {
        success: true,
        data: result.results || [],
        pagination: {
          total: totalResult.results?.[0]?.count || 0,
          page: Number(page),
          limit: Number(limit)
        }
      };
    } catch (error: any) {
      console.error('SupplierService.getAllSuppliers error:', error);
      return { success: false, status: 500, error: 'Failed to fetch suppliers' };
    }
  }

  async getSupplierById(orgId: string | number, supplierId: string | number) {
    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM suppliers WHERE organization_id = ? AND id = ?`,
        args: [orgId, supplierId]
      });

      if (!result.results || result.results.length === 0) {
        return { success: false, status: 404, error: 'Supplier not found' };
      }

      return { success: true, data: result.results[0] };
    } catch (error: any) {
      console.error('SupplierService.getSupplierById error:', error);
      return { success: false, status: 500, error: 'Failed to fetch supplier details' };
    }
  }

  async createSupplier(orgId: string | number, data: any) {
    try {
      const {
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_number,
        payment_terms,
        notes,
        is_active = 1
      } = data;

      const result = await this.db.execute({
        sql: `
          INSERT INTO suppliers (
            organization_id, name, contact_person, email, phone, 
            address, city, country, tax_number, payment_terms, notes, is_active, 
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          RETURNING id
        `,
        args: [
          orgId, name, contact_person || null, email || null, phone || null,
          address || null, city || null, country || null, tax_number || null, 
          payment_terms || null, notes || null, is_active
        ]
      });

      const supplierId = result.results?.[0]?.id || result.meta?.last_row_id;

      return {
        success: true,
        message: 'Supplier created successfully',
        data: { id: supplierId }
      };
    } catch (error: any) {
      console.error('SupplierService.createSupplier error:', error);
      return { success: false, status: 500, error: 'Failed to create supplier' };
    }
  }

  async updateSupplier(orgId: string | number, supplierId: string | number, data: any) {
    try {
      // First check if exists
      const check = await this.getSupplierById(orgId, supplierId);
      if (!check.success) return check;

      const updateFields: string[] = [];
      const updateArgs: any[] = [];

      const allowedFields = [
        'name', 'contact_person', 'email', 'phone', 'address',
        'city', 'country', 'tax_number', 'payment_terms', 'notes', 'is_active'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateArgs.push(data[field]);
        }
      }

      if (updateFields.length === 0) {
        return { success: false, status: 400, error: 'No valid fields to update' };
      }

      updateFields.push(`updated_at = datetime('now')`);
      
      await this.db.execute({
        sql: `UPDATE suppliers SET ${updateFields.join(', ')} WHERE organization_id = ? AND id = ?`,
        args: [...updateArgs, orgId, supplierId]
      });

      return {
        success: true,
        message: 'Supplier updated successfully'
      };
    } catch (error: any) {
      console.error('SupplierService.updateSupplier error:', error);
      return { success: false, status: 500, error: 'Failed to update supplier' };
    }
  }

  async deleteSupplier(orgId: string | number, supplierId: string | number) {
    try {
      const check = await this.getSupplierById(orgId, supplierId);
      if (!check.success) return check;

      // Soft delete
      await this.db.execute({
        sql: `UPDATE suppliers SET is_active = 0, updated_at = datetime('now') WHERE organization_id = ? AND id = ?`,
        args: [orgId, supplierId]
      });

      return {
        success: true,
        message: 'Supplier deactivated successfully'
      };
    } catch (error: any) {
      console.error('SupplierService.deleteSupplier error:', error);
      return { success: false, status: 500, error: 'Failed to delete supplier' };
    }
  }
}
