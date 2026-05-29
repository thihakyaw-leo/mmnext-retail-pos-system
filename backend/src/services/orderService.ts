import { Env } from '../types/env.js';
import { DatabaseService } from '../utils/database.js';

export interface OrderItem {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  total_amount: number;
  cost_price?: number | null;
  notes?: string | null;
}

export interface OrderCreateData {
  store_id: number;
  order_number: string;
  customer_id?: number | null;
  cashier_id: number;
  order_type?: string;
  status?: string;
  subtotal: number;
  discount_amount?: number;
  discount_type?: string | null;
  discount_reason?: string | null;
  tax_amount?: number;
  tax_rate?: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string | null;
  items: OrderItem[];
}

export class OrderService {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env.DB);
  }

  async createOrder(orgId: string, orderData: OrderCreateData) {
    try {
      // Begin transaction manually if possible, or execute batch
      // D1 supports batch execution which acts as a transaction
      
      const insertOrderSql = `
        INSERT INTO orders (
          organization_id, store_id, order_number, customer_id, cashier_id,
          order_type, status, subtotal, discount_amount, discount_type,
          discount_reason, tax_amount, tax_rate, total_amount, payment_method,
          payment_status, notes, created_at, updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, 
          ?, ?, datetime('now'), datetime('now')
        )
        RETURNING id
      `;

      const orderResult = await this.db.execute({ sql: insertOrderSql, args: [
        orgId,
        orderData.store_id,
        orderData.order_number,
        orderData.customer_id || null,
        orderData.cashier_id,
        orderData.order_type || 'sale',
        orderData.status || 'completed',
        orderData.subtotal,
        orderData.discount_amount || 0,
        orderData.discount_type || null,
        orderData.discount_reason || null,
        orderData.tax_amount || 0,
        orderData.tax_rate || 0,
        orderData.total_amount,
        orderData.payment_method || 'cash',
        orderData.payment_status || 'completed',
        orderData.notes || null
      ] });

      if (!orderResult.success || !orderResult.results || orderResult.results.length === 0) {
        return { success: false, error: 'Failed to create order', status: 500 };
      }

      const orderId = orderResult.results[0].id;

      // Prepare order items batch
      const itemStatements = orderData.items.map(item => ({
        sql: `
          INSERT INTO order_items (
            order_id, product_id, variant_id, quantity, unit_price, 
            discount_amount, total_amount, cost_price, notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          orderId,
          item.product_id,
          item.variant_id || null,
          item.quantity,
          item.unit_price,
          item.discount_amount || 0,
          item.total_amount,
          item.cost_price || null,
          item.notes || null
        ]
      }));

      if (itemStatements.length > 0) {
        await this.db.batch(itemStatements);
      }

      return { success: true, orderId, message: 'Order created successfully' };
    } catch (error: any) {
      console.error('Create Order Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getOrderById(orgId: string, orderId: string | number) {
    try {
      const orderSql = `
        SELECT 
          o.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          u.name as cashier_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.cashier_id = u.id
        WHERE o.organization_id = ? AND o.id = ? AND o.deleted_at IS NULL
      `;
      
      const orderResult = await this.db.first({ sql: orderSql, args: [orgId, orderId] });
      
      if (!orderResult) {
        return { success: false, error: 'Order not found', status: 404 };
      }

      const itemsSql = `
        SELECT 
          oi.*,
          p.name as product_name,
          p.sku as product_sku,
          p.image_url as product_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `;

      const itemsResult = await this.db.execute({ sql: itemsSql, args: [orderId] });
      
      return { 
        success: true, 
        order: orderResult, 
        items: itemsResult.results || [] 
      };
    } catch (error: any) {
      console.error('Get Order Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  async getOrders(orgId: string, filters: any = {}) {
    try {
      let whereClause = 'o.organization_id = ? AND o.deleted_at IS NULL';
      let whereArgs: any[] = [orgId];

      if (filters.customer_id) {
        whereClause += ' AND o.customer_id = ?';
        whereArgs.push(filters.customer_id);
      }
      
      if (filters.cashier_id) {
        whereClause += ' AND o.cashier_id = ?';
        whereArgs.push(filters.cashier_id);
      }

      if (filters.status) {
        whereClause += ' AND o.status = ?';
        whereArgs.push(filters.status);
      }
      
      if (filters.search) {
        whereClause += ' AND o.order_number LIKE ?';
        whereArgs.push(`%${filters.search}%`);
      }

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '20');
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          o.*,
          c.name as customer_name,
          u.name as cashier_name,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.cashier_id = u.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `;

      whereArgs.push(limit, offset);

      const result = await this.db.execute({ sql, args: whereArgs });

      // Get total count for pagination
      const countSql = `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`;
      const countResult = await this.db.first({ sql: countSql, args: whereArgs.slice(0, -2) });

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
      console.error('Get Orders Error:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}
