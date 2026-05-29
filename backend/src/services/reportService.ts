import { Env } from '../types/env.js';

export class ReportService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async getSalesSummaryReport(orgId: string, startDate: string, endDate: string, storeId?: number) {
    let sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(id) as total_transactions,
        SUM(subtotal) as gross_sales,
        SUM(discount_amount) as total_discounts,
        SUM(tax_amount) as total_tax,
        SUM(total_amount) as net_sales,
        payment_method
      FROM orders
      WHERE organization_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
        AND status = 'completed'
    `;
    const args: any[] = [orgId, startDate, endDate];

    if (storeId) {
      sql += ` AND store_id = ?`;
      args.push(storeId);
    }

    sql += ` GROUP BY DATE(created_at), payment_method ORDER BY date DESC`;

    const result = await this.db.prepare(sql).bind(...args).all();
    return result.results || [];
  }

  async getInventoryValuationReport(orgId: string, storeId?: number) {
    let sql = `
      SELECT 
        p.id as product_id,
        p.sku,
        p.name,
        c.name as category,
        p.cost_price,
        p.price as selling_price,
        SUM(i.quantity_on_hand) as total_quantity,
        (SUM(i.quantity_on_hand) * p.cost_price) as total_cost_value,
        (SUM(i.quantity_on_hand) * p.price) as total_retail_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN inventory i ON p.id = i.product_id
      WHERE p.organization_id = ? AND i.organization_id = ?
    `;
    const args: any[] = [orgId, orgId];

    if (storeId) {
      sql += ` AND i.store_id = ?`;
      args.push(storeId);
    }

    sql += ` GROUP BY p.id ORDER BY total_cost_value DESC`;

    const result = await this.db.prepare(sql).bind(...args).all();
    return result.results || [];
  }

  async getEndOfDayReport(orgId: string, date: string, storeId?: number) {
    // 1. Get Sales Aggregates
    let salesSql = `
      SELECT 
        COUNT(id) as total_receipts,
        SUM(total_amount) as total_revenue,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discounts
      FROM orders
      WHERE organization_id = ? 
        AND DATE(created_at) = ?
        AND status = 'completed'
    `;
    const salesArgs: any[] = [orgId, date];

    if (storeId) {
      salesSql += ` AND store_id = ?`;
      salesArgs.push(storeId);
    }

    const salesResult = await this.db.prepare(salesSql).bind(...salesArgs).first();

    // 2. Get Payment Methods Breakdown
    let paymentsSql = `
      SELECT 
        payment_method,
        COUNT(id) as transaction_count,
        SUM(total_amount) as total_collected
      FROM orders
      WHERE organization_id = ? 
        AND DATE(created_at) = ?
        AND status = 'completed'
    `;
    const paymentsArgs: any[] = [orgId, date];

    if (storeId) {
      paymentsSql += ` AND store_id = ?`;
      paymentsArgs.push(storeId);
    }

    paymentsSql += ` GROUP BY payment_method`;
    const paymentsResult = await this.db.prepare(paymentsSql).bind(...paymentsArgs).all();

    // 3. Get Top Selling Items
    let itemsSql = `
      SELECT 
        p.name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.organization_id = ? 
        AND DATE(o.created_at) = ?
        AND o.status = 'completed'
    `;
    const itemsArgs: any[] = [orgId, date];

    if (storeId) {
      itemsSql += ` AND o.store_id = ?`;
      itemsArgs.push(storeId);
    }

    itemsSql += ` GROUP BY p.id ORDER BY quantity_sold DESC LIMIT 10`;
    const itemsResult = await this.db.prepare(itemsSql).bind(...itemsArgs).all();

    return {
      date,
      storeId: storeId || 'All Stores',
      summary: salesResult,
      payments: paymentsResult.results || [],
      topItems: itemsResult.results || []
    };
  }
}
