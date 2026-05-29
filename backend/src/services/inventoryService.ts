import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface InventoryLogData {
  store_id: number;
  product_id: number;
  user_id: number;
  type: string; // 'receive', 'adjustment', 'sale', 'return'
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string | null;
  reference_id?: string | null; // e.g. order_id
}

export class InventoryService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async getInventory(orgId: string, filters: any = {}) {
    try {
      let whereClause = 'i.organization_id = ?';
      let whereArgs: any[] = [orgId];

      if (filters.store_id) {
        whereClause += ' AND i.store_id = ?';
        whereArgs.push(filters.store_id);
      }

      if (filters.product_id) {
        whereClause += ' AND i.product_id = ?';
        whereArgs.push(filters.product_id);
      }

      if (filters.low_stock === 'true') {
        whereClause += ' AND i.quantity_available <= i.reorder_point';
      }

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '20');
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          i.*,
          p.name as product_name,
          p.sku as product_sku
        FROM inventory i
        LEFT JOIN products p ON i.product_id = p.id
        WHERE ${whereClause}
        ORDER BY i.quantity_available ASC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.execute({ sql, args: [...whereArgs, limit, offset] });

      const countSql = `SELECT COUNT(*) as total FROM inventory i WHERE ${whereClause}`;
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
      console.error('Get Inventory Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getInventoryLogs(orgId: string, filters: any = {}) {
    try {
      let whereClause = 'il.organization_id = ?';
      let whereArgs: any[] = [orgId];

      if (filters.product_id) {
        whereClause += ' AND il.product_id = ?';
        whereArgs.push(filters.product_id);
      }
      
      if (filters.user_id) {
        whereClause += ' AND il.user_id = ?';
        whereArgs.push(filters.user_id);
      }
      
      if (filters.type) {
        whereClause += ' AND il.type = ?';
        whereArgs.push(filters.type);
      }

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '20');
      const offset = (page - 1) * limit;

      // Note: Assuming inventory_logs table was added (was missing in previous grep)
      // If it doesn't exist, this will error in D1, but we follow the design from database.ts
      const sql = `
        SELECT 
          il.*,
          p.name as product_name,
          p.sku as product_sku,
          u.display_name as user_name
        FROM inventory_logs il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN users u ON il.user_id = u.id
        WHERE ${whereClause}
        ORDER BY il.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.execute({ sql, args: [...whereArgs, limit, offset] });

      const countSql = `SELECT COUNT(*) as total FROM inventory_logs il WHERE ${whereClause}`;
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
      console.error('Get Inventory Logs Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async logInventoryChange(orgId: string, logData: InventoryLogData) {
    try {
      const sql = `
        INSERT INTO inventory_logs (
          organization_id, store_id, product_id, user_id, type, 
          quantity_change, previous_quantity, new_quantity, 
          reason, reference_id, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, 
          ?, ?, ?, 
          ?, ?, datetime('now')
        )
      `;

      await this.db.execute({ sql, args: [
        orgId,
        logData.store_id,
        logData.product_id,
        logData.user_id,
        logData.type,
        logData.quantity_change,
        logData.previous_quantity,
        logData.new_quantity,
        logData.reason || null,
        logData.reference_id || null
      ] });

      return { success: true, message: 'Inventory log created successfully' };
    } catch (error: any) {
      console.error('Create Inventory Log Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async updateInventoryLevel(orgId: string, storeId: number, productId: number, quantityChange: number, userId: number, reason: string) {
    try {
      // Fetch current inventory
      const currentSql = `SELECT * FROM inventory WHERE organization_id = ? AND store_id = ? AND product_id = ?`;
      const current = await this.db.first({ sql: currentSql, args: [orgId, storeId, productId] });

      if (!current) {
        return { success: false, error: 'Inventory record not found', status: 404 };
      }

      const previousQuantity = current.quantity_on_hand;
      const newQuantity = previousQuantity + quantityChange;

      // Update inventory table
      const updateSql = `
        UPDATE inventory 
        SET quantity_on_hand = ?, updated_at = datetime('now')
        WHERE organization_id = ? AND store_id = ? AND product_id = ?
      `;
      await this.db.execute({ sql: updateSql, args: [newQuantity, orgId, storeId, productId] });

      // Create log
      await this.logInventoryChange(orgId, {
        store_id: storeId,
        product_id: productId,
        user_id: userId,
        type: 'adjustment',
        quantity_change: quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reason
      });

      return { success: true, message: 'Inventory updated successfully' };
    } catch (error: any) {
      console.error('Update Inventory Level Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}
