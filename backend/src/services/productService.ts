import { DatabaseService } from '../utils/database.js';
import { InventoryService } from './inventoryService.js';

export class ProductService {
  private db: DatabaseService;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
  }

  /**
   * Get all products with filters and pagination
   */
  async getAllProducts(orgId: string, filters: any) {
    const { 
      page = 1, limit = 50, search = '', category_id = '', 
      is_active = '1', sort_by = 'name', sort_order = 'asc' 
    } = filters;
    
    const offset = (Number(page) - 1) * Number(limit);
    const validSortColumns = ['name', 'price', 'created_at', 'sku'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'name';
    const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    let whereConditions = ['p.organization_id = ?'];
    let params: any[] = [orgId];
    
    if (is_active !== 'all') {
      whereConditions.push('p.is_active = ?');
      params.push(is_active === '1' || is_active === 'true' ? 1 : 0);
    }
    
    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      params.push(category_id);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const countResult = await this.db.first({
      sql: `
        SELECT COUNT(*) as total 
        FROM products p
        ${whereClause}
      `,
      args: params
    });
    const total = countResult?.total || 0;
    
    const { results } = await this.db.execute({
      sql: `
        SELECT 
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?
      `,
      args: [...params, Number(limit), offset]
    });
    
    return {
      success: true,
      data: results,
      pagination: {
        page: Number(page), limit: Number(limit), total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Get product details by ID (optionally with inventory)
   */
  async getProductById(orgId: string, productId: string, storeId?: string) {
    const product = await this.db.first({
      sql: `
        SELECT 
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.organization_id = ?
      `,
      args: [productId, orgId]
    });
    
    if (!product) {
      return { success: false, status: 404, error: 'Product not found' };
    }
    
    let inventory = null;
    if (storeId) {
      inventory = await this.db.first({
        sql: `SELECT quantity_on_hand, quantity_available FROM inventory WHERE product_id = ? AND store_id = ? AND organization_id = ?`,
        args: [productId, storeId, orgId]
      });
    } else {
       // Aggregate inventory across all stores
       const totalInv = await this.db.first({
         sql: `SELECT SUM(quantity_on_hand) as total_qty FROM inventory WHERE product_id = ? AND organization_id = ?`,
         args: [productId, orgId]
       });
       inventory = { total_quantity: totalInv?.total_qty || 0 };
    }
    
    return {
      success: true,
      data: {
        ...product,
        inventory
      }
    };
  }

  /**
   * Check if SKU or Barcode exists
   */
  private async checkUniqueConstraints(orgId: string, sku?: string, barcode?: string, excludeProductId?: string) {
    if (sku) {
      let sql = `SELECT id FROM products WHERE sku = ? AND organization_id = ?`;
      let args = [sku, orgId];
      if (excludeProductId) {
        sql += ` AND id != ?`;
        args.push(excludeProductId);
      }
      const existing = await this.db.first({ sql, args });
      if (existing) return 'SKU already exists';
    }
    
    if (barcode) {
      let sql = `SELECT id FROM products WHERE barcode = ? AND organization_id = ?`;
      let args = [barcode, orgId];
      if (excludeProductId) {
        sql += ` AND id != ?`;
        args.push(excludeProductId);
      }
      const existing = await this.db.first({ sql, args });
      if (existing) return 'Barcode already exists';
    }
    
    return null;
  }

  /**
   * Create a new product
   */
  async createProduct(orgId: string, data: any, userId: string) {
    const { 
      name, sku, barcode, description, category_id, 
      price, cost, tax_rate, reorder_level, is_active = 1,
      image_url, initial_stock, store_id
    } = data;
    
    const uniqueError = await this.checkUniqueConstraints(orgId, sku, barcode);
    if (uniqueError) {
      return { success: false, status: 409, error: uniqueError };
    }
    
    const result = await this.db.execute({
      sql: `
        INSERT INTO products (
          organization_id, category_id, name, description, 
          sku, barcode, selling_price, cost_price, tax_rate, is_active, 
          image_url, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        RETURNING id
      `,
      args: [
        orgId, category_id || null, name, description || null,
        sku, barcode || null, price, cost || 0, tax_rate || 0, is_active,
        image_url || null
      ]
    });
    
    const productId = result.results?.[0]?.id || result.meta?.last_row_id;
    
    // Process initial stock if provided
    if (initial_stock > 0 && store_id) {
      const inventoryService = new InventoryService(this.env);
      await inventoryService.updateInventoryLevel(
        orgId,
        Number(store_id),
        Number(productId),
        Number(initial_stock),
        Number(userId),
        'initial_stock'
      );
    }
    
    const newProduct = await this.getProductById(orgId, productId);
    return { success: true, status: 201, message: 'Product created successfully', data: newProduct.data };
  }

  /**
   * Update an existing product
   */
  async updateProduct(orgId: string, productId: string, data: any) {
    // Check if exists
    const existing = await this.getProductById(orgId, productId);
    if (!existing.success) return existing;
    
    const uniqueError = await this.checkUniqueConstraints(orgId, data.sku, data.barcode, productId);
    if (uniqueError) {
      return { success: false, status: 409, error: uniqueError };
    }
    
    const updates = [];
    const params = [];
    
    // List of allowed fields to update
    const allowedFields = ['name', 'sku', 'barcode', 'description', 'category_id', 'price', 'cost', 'tax_rate', 'is_active', 'image_url'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (updates.length === 0) return { success: false, status: 400, error: 'No fields to update' };
    
    updates.push("updated_at = datetime('now')");
    params.push(productId, orgId);
    
    await this.db.execute({
      sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`,
      args: params
    });
    
    const updatedProduct = await this.getProductById(orgId, productId);
    return { success: true, message: 'Product updated successfully', data: updatedProduct.data };
  }

  /**
   * Delete (soft delete) a product
   */
  async deleteProduct(orgId: string, productId: string) {
    const existing = await this.db.first({
      sql: `SELECT id FROM products WHERE id = ? AND organization_id = ?`,
      args: [productId, orgId]
    });
    
    if (!existing) {
      return { success: false, status: 404, error: 'Product not found' };
    }
    
    await this.db.execute({
      sql: `UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND organization_id = ?`,
      args: [productId, orgId]
    });
    
    return { success: true, message: 'Product deleted successfully' };
  }
}
