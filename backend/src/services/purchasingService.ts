import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface SupplierData {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PurchaseOrderItem {
  product_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface PurchaseOrderData {
  store_id?: number;
  po_number: string;
  supplier_id: number;
  expected_date?: string;
  total_amount: number;
  notes?: string;
  created_by: number;
  items: PurchaseOrderItem[];
}

export class PurchasingService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  // --- Suppliers ---

  async getSuppliers() {
    try {
      const sql = `SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC`;
      const result = await this.db.execute({ sql, args: [] });
      return { success: true, data: result.results || [] };
    } catch (error: any) {
      console.error('Get Suppliers Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createSupplier(data: SupplierData) {
    try {
      const sql = `
        INSERT INTO suppliers (name, contact_name, email, phone, address)
        VALUES (?, ?, ?, ?, ?)
        RETURNING *
      `;
      const result = await this.db.execute({ sql, args: [
        data.name,
        data.contact_name || null,
        data.email || null,
        data.phone || null,
        data.address || null
      ] });
      return { success: true, data: result.results?.[0] };
    } catch (error: any) {
      console.error('Create Supplier Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  // --- Purchase Orders ---

  async getPurchaseOrders(orgId: string) {
    try {
      const sql = `
        SELECT 
          po.*,
          s.name as supplier_name,
          (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) as item_count
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.organization_id = ?
        ORDER BY po.created_at DESC
      `;
      const result = await this.db.execute({ sql, args: [orgId] });
      return { success: true, data: result.results || [] };
    } catch (error: any) {
      console.error('Get POs Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async createPurchaseOrder(orgId: string, data: PurchaseOrderData) {
    try {
      const insertPOSql = `
        INSERT INTO purchase_orders (
          organization_id, store_id, po_number, supplier_id, 
          expected_date, total_amount, notes, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `;

      const poResult = await this.db.execute({ sql: insertPOSql, args: [
        orgId,
        data.store_id || null,
        data.po_number,
        data.supplier_id,
        data.expected_date || null,
        data.total_amount,
        data.notes || null,
        data.created_by
      ] });

      if (!poResult.success || !poResult.results || poResult.results.length === 0) {
        return { success: false, error: 'Failed to create PO', status: 500 };
      }

      const poId = poResult.results[0].id;

      const itemStatements = data.items.map(item => ({
        sql: `
          INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          poId,
          item.product_id,
          item.quantity,
          item.unit_cost,
          item.total_cost
        ]
      }));

      if (itemStatements.length > 0) {
        await this.db.batch(itemStatements);
      }

      return { success: true, poId, message: 'Purchase Order created successfully' };
    } catch (error: any) {
      console.error('Create PO Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async updatePurchaseOrderStatus(orgId: string, poId: number, status: string) {
    try {
      // The trigger 'update_stock_on_po_receive' will automatically handle stock increment
      // if status changes to 'Received'.
      const sql = `
        UPDATE purchase_orders 
        SET status = ? 
        WHERE id = ? AND organization_id = ?
        RETURNING *
      `;
      const result = await this.db.execute({ sql, args: [status, poId, orgId] });
      if (!result.results || result.results.length === 0) {
         return { success: false, error: 'PO not found', status: 404 };
      }
      return { success: true, message: 'Status updated', data: result.results[0] };
    } catch (error: any) {
      console.error('Update PO Status Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}
