import { Env } from '../types/env.js';

export class AnalyticsService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  async getDashboardData(orgId: string, startDate: Date, dateFilter: string) {
    const now = new Date();

    const metricsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT cashier_id) as active_staff
      FROM orders 
      WHERE organization_id = ? AND created_at >= ? AND status != 'cancelled' AND deleted_at IS NULL
    `);
    const { results: metrics } = await metricsStmt.bind(orgId, dateFilter).all();

    // Use direct orders aggregation instead of analytics_daily (table may not exist yet)
    const trendStmt = this.db.prepare(`
      SELECT DATE(created_at, '+06:30') as date, 
             COUNT(*) as orders, 
             SUM(total_amount) as revenue, 
             COUNT(DISTINCT customer_id) as customers
      FROM orders
      WHERE organization_id = ? AND DATE(created_at, '+06:30') >= ? AND status != 'cancelled'
      GROUP BY DATE(created_at, '+06:30')
      ORDER BY date ASC
    `);
    const { results: trend } = await trendStmt.bind(orgId, dateFilter.split('T')[0]).all();


    const topProductsStmt = this.db.prepare(`
      SELECT 
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as revenue,
        AVG(p.price) as avg_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 10
    `);
    const { results: topProducts } = await topProductsStmt.bind(orgId, dateFilter).all();

    const paymentStmt = this.db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total
      FROM orders 
      WHERE organization_id = ? AND created_at >= ? AND status != 'cancelled'
      GROUP BY payment_method
    `);
    const { results: paymentBreakdown } = await paymentStmt.bind(orgId, dateFilter).all();

    const hourlyStmt = this.db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at, '+06:30') AS INTEGER) as hour,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders 
      WHERE organization_id = ? AND created_at >= ? AND status != 'cancelled'
      GROUP BY hour
      ORDER BY hour
    `);
    const { results: hourlySales } = await hourlyStmt.bind(orgId, dateFilter).all();

    const topCustomersStmt = this.db.prepare(`
      SELECT 
        c.id,
        c.first_name || ' ' || c.last_name as name,
        c.email,
        c.loyalty_points,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    const { results: topCustomers } = await topCustomersStmt.bind(orgId, dateFilter).all();

    const staffPerformanceStmt = this.db.prepare(`
      SELECT 
        s.id,
        (s.first_name || ' ' || s.last_name) as name,
        s.role,
        COUNT(o.id) as orders,
        SUM(o.total_amount) as sales,
        AVG(o.total_amount) as avg_sale
      FROM users s
      LEFT JOIN orders o ON s.id = o.cashier_id AND o.created_at >= ? AND o.status != 'cancelled' AND o.organization_id = ?
      WHERE s.is_active = 1 AND s.role IN ('staff', 'cashier', 'admin', 'manager')
      GROUP BY s.id
      ORDER BY sales DESC
      LIMIT 10
    `);
    const { results: staffPerformance } = await staffPerformanceStmt.bind(dateFilter, orgId).all();


    const inventoryAlertsStmt = this.db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.quantity_on_hand as current_stock,
        p.low_stock_threshold,
        p.price,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.organization_id = ? AND p.quantity_on_hand <= p.low_stock_threshold AND p.status = 'active'
      ORDER BY (p.quantity_on_hand - p.low_stock_threshold) ASC
      LIMIT 20
    `);
    const { results: inventoryAlerts } = await inventoryAlertsStmt.bind(orgId).all();

    // Category Sales breakdown for the dashboard progress bars
    const categorySalesStmt = this.db.prepare(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(oi.total_amount) as revenue,
        SUM(oi.quantity) as quantity_sold,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
      GROUP BY COALESCE(c.name, 'Uncategorized')
      ORDER BY revenue DESC
      LIMIT 6
    `);
    const { results: categorySalesRaw } = await categorySalesStmt.bind(orgId, dateFilter).all();

    // Calculate percentages for category sales
    const totalCatRevenue = categorySalesRaw.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);
    const categorySales = categorySalesRaw.map((c: any) => ({
      ...c,
      percentage: totalCatRevenue > 0 ? Math.round((c.revenue / totalCatRevenue) * 100) : 0
    }));

    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousMetricsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue
      FROM orders 
      WHERE organization_id = ? AND created_at >= ? AND created_at < ? AND status != 'cancelled'
    `);
    const { results: previousMetrics } = await previousMetricsStmt.bind(
      orgId,
      previousPeriodStart.toISOString(),
      dateFilter
    ).all();

    const current: any = metrics[0] || {};
    const previous: any = previousMetrics[0] || {};
    
    const revenueGrowth = previous.total_revenue > 0 
      ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue * 100).toFixed(1)
      : 0;
    
    const orderGrowth = previous.total_orders > 0
      ? ((current.total_orders - previous.total_orders) / previous.total_orders * 100).toFixed(1)
      : 0;

    return {
      metrics: {
        ...current,
        revenue_growth: parseFloat(revenueGrowth as string),
        order_growth: parseFloat(orderGrowth as string)
      },
      trends: {
        daily: trend,
        hourly: hourlySales
      },
      topProducts,
      topCustomers,
      staffPerformance,
      paymentBreakdown,
      categorySales,
      inventoryAlerts,
      lastUpdated: new Date().toISOString()
    };
  }

  async getSalesAnalytics(orgId: string, filters: any, groupBy: string) {
    let filterArray = ['o.organization_id = ?'];
    let params: any[] = [orgId];

    if (filters.startDate) {
      filterArray.push('o.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      filterArray.push('o.created_at <= ?');
      params.push(filters.endDate);
    }
    if (filters.staffId) {
      filterArray.push('o.cashier_id = ?');
      params.push(filters.staffId);
    }
    if (filters.customerId) {
      filterArray.push('o.customer_id = ?');
      params.push(filters.customerId);
    }

    filterArray.push("o.status != 'cancelled'");
    const whereClause = `WHERE ${filterArray.join(' AND ')}`;

    let groupByClause = '';
    let selectGroup = '';
    
    switch (groupBy) {
      case 'hour':
        selectGroup = `strftime('%Y-%m-%d %H:00:00', o.created_at, '+06:30') as period`;
        groupByClause = `GROUP BY strftime('%Y-%m-%d %H', o.created_at, '+06:30')`;
        break;
      case 'day':
        selectGroup = `DATE(o.created_at, '+06:30') as period`;
        groupByClause = `GROUP BY DATE(o.created_at, '+06:30')`;
        break;
      case 'week':
        selectGroup = `strftime('%Y-W%W', o.created_at, '+06:30') as period`;
        groupByClause = `GROUP BY strftime('%Y-W%W', o.created_at, '+06:30')`;
        break;
      case 'month':
        selectGroup = `strftime('%Y-%m', o.created_at, '+06:30') as period`;
        groupByClause = `GROUP BY strftime('%Y-%m', o.created_at, '+06:30')`;
        break;
      case 'staff':
        selectGroup = `(s.first_name || ' ' || s.last_name) as period, s.id as staff_id`;
        groupByClause = `GROUP BY s.id`;
        break;
    }

    const salesQuery = `
      SELECT 
        ${selectGroup},
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        SUM(o.tax_amount) as total_tax,
        SUM(o.discount_amount) as total_discount,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        MIN(o.total_amount) as min_order,
        MAX(o.total_amount) as max_order
      FROM orders o
      ${groupBy === 'staff' ? 'LEFT JOIN users s ON o.cashier_id = s.id' : ''}
      ${whereClause}
      ${groupByClause}
      ORDER BY period ${groupBy === 'staff' ? '' : 'ASC'}
    `;

    const stmt = this.db.prepare(salesQuery);
    const { results: salesData } = await stmt.bind(...params).all();

    let productBreakdown = [];
    if (filters.productId) {
      const productStmt = this.db.prepare(`
        SELECT 
          p.name,
          p.sku,
          SUM(oi.quantity) as quantity_sold,
          SUM(oi.subtotal) as revenue,
          AVG(oi.unit_price) as avg_price
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        ${whereClause} AND p.id = ?
        GROUP BY p.id
        ORDER BY revenue DESC
      `);
      
      const productParams = [...params, filters.productId];
      const { results } = await productStmt.bind(...productParams).all();
      productBreakdown = results;
    }

    const totals = salesData.reduce((acc: any, item: any) => ({
      total_orders: acc.total_orders + item.order_count,
      total_revenue: acc.total_revenue + item.total_revenue,
      total_tax: acc.total_tax + item.total_tax,
      total_discount: acc.total_discount + item.total_discount,
      unique_customers: Math.max(acc.unique_customers, item.unique_customers)
    }), { total_orders: 0, total_revenue: 0, total_tax: 0, total_discount: 0, unique_customers: 0 } as any);

    return {
      data: salesData,
      productBreakdown,
      totals: {
        ...totals,
        avg_order_value: totals.total_orders > 0 ? totals.total_revenue / totals.total_orders : 0
      }
    };
  }

  async getProductAnalytics(orgId: string, filters: any, sortBy: string, limit: number) {
    let filterArray = ['o.organization_id = ?', 'o.status != "cancelled"'];
    let params: any[] = [orgId];

    if (filters.startDate) {
      filterArray.push('o.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      filterArray.push('o.created_at <= ?');
      params.push(filters.endDate);
    }
    if (filters.categoryId) {
      filterArray.push('p.category_id = ?');
      params.push(filters.categoryId);
    }

    const whereClause = `WHERE ${filterArray.join(' AND ')}`;

    let orderBy = 'total_revenue DESC';
    switch (sortBy) {
      case 'quantity':
        orderBy = 'quantity_sold DESC';
        break;
      case 'profit':
        orderBy = 'total_profit DESC';
        break;
      case 'margin':
        orderBy = 'profit_margin DESC';
        break;
    }

    const productQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.cost_price as cost,
        p.quantity_on_hand as current_stock,
        c.name as category_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.unit_price) as avg_selling_price,
        COUNT(DISTINCT o.id) as order_frequency,
        COUNT(DISTINCT o.customer_id) as unique_buyers,
        SUM(oi.quantity * p.cost_price) as total_cost,
        SUM(oi.subtotal) - SUM(oi.quantity * p.cost_price) as total_profit,
        CASE 
          WHEN SUM(oi.subtotal) > 0 
          THEN ((SUM(oi.subtotal) - SUM(oi.quantity * p.cost_price)) / SUM(oi.subtotal)) * 100 
          ELSE 0 
        END as profit_margin,
        MIN(o.created_at) as first_sale,
        MAX(o.created_at) as last_sale
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    params.push(limit);
    const stmt = this.db.prepare(productQuery);
    const { results: products } = await stmt.bind(...params).all();

    const categoryQuery = `
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue,
        AVG(p.price) as avg_price
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      ${whereClause.replace('p.category_id = ?', 'c.id = ? OR ? IS NULL')}
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `;

    const categoryParams = [...params];
    if (filters.categoryId) {
      categoryParams[categoryParams.length - 2] = filters.categoryId;
      categoryParams.splice(-1, 0, filters.categoryId);
    } else {
      categoryParams.splice(-1, 0, null);
    }

    const categoryStmt = this.db.prepare(categoryQuery);
    const { results: categories } = await categoryStmt.bind(...categoryParams).all();

    return {
      products,
      categories,
      summary: {
        total_products: products.length,
        total_revenue: products.reduce((sum: number, p: any) => sum + (p.total_revenue || 0), 0),
        total_quantity: products.reduce((sum: number, p: any) => sum + (p.quantity_sold || 0), 0),
        avg_profit_margin: products.length > 0 
          ? products.reduce((sum: number, p: any) => sum + (p.profit_margin || 0), 0) / products.length 
          : 0
      }
    };
  }

  async getCustomerAnalytics(orgId: string, filters: any, segment: string, limit: number) {
    let filterArray = ['o.organization_id = ?', 'o.status != "cancelled"'];
    let params: any[] = [orgId];

    if (filters.startDate) {
      filterArray.push('o.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      filterArray.push('o.created_at <= ?');
      params.push(filters.endDate);
    }

    const whereClause = `WHERE ${filterArray.join(' AND ')}`;

    const customerQuery = `
      SELECT 
        c.id,
        c.first_name || ' ' || c.last_name as name,
        c.email,
        c.phone,
        c.loyalty_points,
        c.created_at as registration_date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.created_at) as first_order,
        MAX(o.created_at) as last_order,
        COUNT(DISTINCT DATE(o.created_at, '+06:30')) as shopping_days,
        CASE 
          WHEN COUNT(o.id) = 1 THEN 'New'
          WHEN COUNT(o.id) BETWEEN 2 AND 5 THEN 'Regular'
          WHEN COUNT(o.id) > 5 AND MAX(o.created_at) > datetime('now', '-30 days') THEN 'VIP'
          WHEN MAX(o.created_at) < datetime('now', '-90 days') THEN 'Inactive'
          ELSE 'Active'
        END as segment,
        julianday('now') - julianday(MAX(o.created_at)) as days_since_last_order
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      ${whereClause}
      GROUP BY c.id
      HAVING COUNT(o.id) > 0
      ORDER BY total_spent DESC
      LIMIT ?
    `;

    params.push(limit);
    const stmt = this.db.prepare(customerQuery);
    const { results: customers } = await stmt.bind(...params).all();

    let filteredCustomers = customers;
    if (segment !== 'all') {
      filteredCustomers = customers.filter((c: any) => c.segment.toLowerCase() === segment.toLowerCase());
    }

    const segmentSummary = customers.reduce((acc: any, customer: any) => {
      const seg = customer.segment;
      if (!acc[seg]) acc[seg] = { count: 0, totalSpent: 0, avgSpent: 0 };
      acc[seg].count++;
      acc[seg].totalSpent += customer.total_spent;
      acc[seg].avgSpent = acc[seg].totalSpent / acc[seg].count;
      return acc;
    }, {});

    const rfmQuery = `
      SELECT 
        c.id,
        c.first_name || ' ' || c.last_name as name,
        julianday('now') - julianday(MAX(o.created_at)) as recency_days,
        COUNT(o.id) as frequency,
        SUM(o.total_amount) as monetary_value,
        NTILE(5) OVER (ORDER BY julianday('now') - julianday(MAX(o.created_at)) DESC) as recency_score,
        NTILE(5) OVER (ORDER BY COUNT(o.id)) as frequency_score,
        NTILE(5) OVER (ORDER BY SUM(o.total_amount)) as monetary_score
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      ${whereClause}
      GROUP BY c.id
      HAVING COUNT(o.id) > 0
    `;

    const rfmStmt = this.db.prepare(rfmQuery);
    const { results: rfmData } = await rfmStmt.bind(...params.slice(0, -1)).all();

    const lifecycleQuery = `
      SELECT 
        strftime('%Y-%m', c.created_at) as cohort_month,
        COUNT(*) as customers_acquired,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as customers_with_orders,
        SUM(o.total_amount) as cohort_revenue,
        AVG(o.total_amount) as avg_customer_value
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id ${filters.startDate || filters.endDate ? `AND o.created_at >= '${filters.startDate || '2020-01-01'}' AND o.created_at <= '${filters.endDate || new Date().toISOString()}'` : ''}
      WHERE c.created_at >= '${filters.startDate || '2020-01-01'}'
      GROUP BY strftime('%Y-%m', c.created_at)
      ORDER BY cohort_month DESC
      LIMIT 12
    `;

    const lifecycleStmt = this.db.prepare(lifecycleQuery);
    const { results: lifecycleData } = await lifecycleStmt.all();

    return {
      customers: filteredCustomers,
      segmentSummary,
      rfmAnalysis: rfmData,
      lifecycleAnalysis: lifecycleData,
      summary: {
        total_customers: customers.length,
        total_revenue: customers.reduce((sum: number, c: any) => sum + c.total_spent, 0),
        avg_customer_value: customers.length > 0 
          ? customers.reduce((sum: number, c: any) => sum + c.total_spent, 0) / customers.length 
          : 0,
        avg_orders_per_customer: customers.length > 0
          ? customers.reduce((sum: number, c: any) => sum + c.total_orders, 0) / customers.length
          : 0
      }
    };
  }

  async getStaffAnalytics(orgId: string, filters: any) {
    let filterArray = ['o.organization_id = ?', 'o.status != "cancelled"'];
    let params: any[] = [orgId];

    if (filters.startDate) {
      filterArray.push('o.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      filterArray.push('o.created_at <= ?');
      params.push(filters.endDate);
    }
    if (filters.staffId) {
      filterArray.push('s.id = ?');
      params.push(filters.staffId);
    }
    if (filters.department) {
      filterArray.push('s.department = ?');
      params.push(filters.department);
    }

    const whereClause = `WHERE ${filterArray.join(' AND ')}`;

    const staffQuery = `
      SELECT 
        s.id,
        (s.first_name || ' ' || s.last_name) as name,
        s.email,
        s.role,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        AVG(o.total_amount) as avg_transaction,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        MIN(o.created_at) as first_sale_period,
        MAX(o.created_at) as last_sale_period,
        COUNT(DISTINCT DATE(o.created_at, '+06:30')) as active_days
      FROM users s
      LEFT JOIN orders o ON s.id = o.cashier_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY total_sales DESC
    `;

    const stmt = this.db.prepare(staffQuery);
    const { results: staffData } = await stmt.bind(...params).all();

    const departmentQuery = `
      SELECT 
        s.role as department,
        COUNT(DISTINCT s.id) as staff_count,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        AVG(o.total_amount) as avg_transaction
      FROM users s
      LEFT JOIN orders o ON s.id = o.cashier_id
      ${whereClause}
      GROUP BY s.role
      ORDER BY total_sales DESC NULLS LAST
    `;

    const deptStmt = this.db.prepare(departmentQuery);
    const { results: departmentData } = await deptStmt.bind(...params).all();

    const trendsQuery = `
      SELECT 
        DATE(o.created_at, '+06:30') as date,
        s.id as staff_id,
        (s.first_name || ' ' || s.last_name) as staff_name,
        COUNT(o.id) as daily_orders,
        SUM(o.total_amount) as daily_sales
      FROM users s
      LEFT JOIN orders o ON s.id = o.cashier_id
      ${whereClause}
      GROUP BY DATE(o.created_at, '+06:30'), s.id
      ORDER BY date ASC, daily_sales DESC
    `;

    const trendsStmt = this.db.prepare(trendsQuery);
    const { results: trendsData } = await trendsStmt.bind(...params).all();

    return {
      staff: staffData,
      departments: departmentData,
      trends: trendsData,
      summary: {
        total_staff: staffData.length,
        total_sales: staffData.reduce((sum: number, s: any) => sum + (s.total_sales || 0), 0),
        total_orders: staffData.reduce((sum: number, s: any) => sum + (s.total_orders || 0), 0),
        avg_sales_per_staff: staffData.length > 0 
          ? staffData.reduce((sum: number, s: any) => sum + (s.total_sales || 0), 0) / staffData.length 
          : 0
      }
    };
  }

  async getRevenueChart(orgId: string, startDate: Date, groupBy: string) {
    let groupByClause = '';
    let selectGroup = '';
    
    switch (groupBy) {
      case 'hour':
        selectGroup = `strftime('%Y-%m-%d %H:00:00', created_at, '+06:30') as period`;
        groupByClause = `GROUP BY strftime('%Y-%m-%d %H', created_at, '+06:30')`;
        break;
      case 'day':
        selectGroup = `DATE(created_at, '+06:30') as period`;
        groupByClause = `GROUP BY DATE(created_at, '+06:30')`;
        break;
      case 'week':
        selectGroup = `strftime('%Y-W%W', created_at) as period`;
        groupByClause = `GROUP BY strftime('%Y-W%W', created_at)`;
        break;
      case 'month':
        selectGroup = `strftime('%Y-%m', created_at) as period`;
        groupByClause = `GROUP BY strftime('%Y-%m', created_at)`;
        break;
    }

    const chartQuery = `
      SELECT 
        ${selectGroup},
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM(tax_amount) as tax,
        SUM(discount_amount) as discount,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders 
      WHERE organization_id = ? AND created_at >= ? AND status != 'cancelled'
      ${groupByClause}
      ORDER BY period ASC
    `;

    const stmt = this.db.prepare(chartQuery);
    const { results } = await stmt.bind(orgId, startDate.toISOString()).all();
    return results;
  }

  async getProductChart(orgId: string, startDate: Date, type: string) {
    let query = '';
    let limit = 10;

    switch (type) {
      case 'top-selling':
        query = `
          SELECT 
            p.name,
            p.sku,
            SUM(oi.quantity) as quantity,
            SUM(oi.subtotal) as revenue
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
          GROUP BY p.id
          ORDER BY quantity DESC
          LIMIT ?
        `;
        break;
      case 'top-revenue':
        query = `
          SELECT 
            p.name,
            p.sku,
            SUM(oi.quantity) as quantity,
            SUM(oi.subtotal) as revenue
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
          GROUP BY p.id
          ORDER BY revenue DESC
          LIMIT ?
        `;
        break;
      case 'categories':
        query = `
          SELECT 
            c.name,
            COUNT(DISTINCT p.id) as product_count,
            SUM(oi.quantity) as quantity,
            SUM(oi.subtotal) as revenue
          FROM categories c
          JOIN products p ON c.id = p.category_id
          JOIN order_items oi ON p.id = oi.product_id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.organization_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
          GROUP BY c.id
          ORDER BY revenue DESC
          LIMIT ?
        `;
        break;
    }

    const stmt = this.db.prepare(query);
    const { results } = await stmt.bind(orgId, startDate.toISOString(), limit).all();
    return results;
  }

  async getRealtimeStats(orgId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const todayStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as orders_today,
        SUM(total_amount) as revenue_today,
        COUNT(DISTINCT customer_id) as customers_today,
        COUNT(DISTINCT cashier_id) as active_staff_today
      FROM orders 
      WHERE organization_id = ? AND DATE(created_at, '+06:30') = ? AND status != 'cancelled'
    `);
    const { results: todayStats } = await todayStmt.bind(orgId, today).all();

    const currentHour = new Date().getHours();
    const hourStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as orders_this_hour,
        SUM(total_amount) as revenue_this_hour
      FROM orders 
      WHERE organization_id = ? AND DATE(created_at, '+06:30') = ? AND CAST(strftime('%H', created_at, '+06:30') AS INTEGER) = ? AND status != 'cancelled'
    `);
    const { results: hourStats } = await hourStmt.bind(orgId, today, currentHour).all();

    const recentOrdersStmt = this.db.prepare(`
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        o.customer_name,
        (s.first_name || ' ' || s.last_name) as staff_name
      FROM orders o
      LEFT JOIN users s ON o.cashier_id = s.id
      WHERE o.organization_id = ? AND o.status != 'cancelled' AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    const { results: recentOrders } = await recentOrdersStmt.bind(orgId).all();


    const lowStockStmt = this.db.prepare(`
      SELECT 
        id,
        name,
        sku,
        quantity_on_hand as current_stock,
        low_stock_threshold
      FROM products 
      WHERE quantity_on_hand <= low_stock_threshold AND status = 'active' AND organization_id = ?
      ORDER BY (quantity_on_hand - low_stock_threshold) ASC
      LIMIT 5
    `);
    const { results: lowStockItems } = await lowStockStmt.bind(orgId).all();

    return {
      timestamp: new Date().toISOString(),
      today: todayStats[0] || {},
      thisHour: hourStats[0] || {},
      recentOrders,
      lowStockAlerts: lowStockItems
    };
  }
}
