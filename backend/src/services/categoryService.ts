import { DatabaseService } from '../utils/database.js';

export class CategoryService {
  private db: DatabaseService;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
  }

  async getAllCategories(filters: any = {}) {
    const { is_active = 'all', parent_id = 'all' } = filters;
    
    let whereConditions = ['1 = 1']; // Simple trick to allow multiple ANDs
    let params: any[] = [];
    
    if (is_active !== 'all') {
      whereConditions.push('is_active = ?');
      params.push(is_active === '1' || is_active === 'true' ? 1 : 0);
    }
    
    if (parent_id !== 'all') {
      if (parent_id === 'null' || parent_id === '') {
        whereConditions.push('parent_id IS NULL');
      } else {
        whereConditions.push('parent_id = ?');
        params.push(parent_id);
      }
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const { results } = await this.db.execute({
      sql: `
        SELECT *
        FROM categories
        ${whereClause}
        ORDER BY sort_order ASC, name ASC
      `,
      args: params
    });
    
    return {
      success: true,
      data: results
    };
  }

  async getCategoryById(categoryId: string) {
    const category = await this.db.first({
      sql: `SELECT * FROM categories WHERE id = ?`,
      args: [categoryId]
    });
    
    if (!category) {
      return { success: false, status: 404, error: 'Category not found' };
    }
    
    return {
      success: true,
      data: category
    };
  }

  async createCategory(data: any, userId: string) {
    const { 
      name, description, parent_id, is_active = 1, sort_order = 0 
    } = data;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if slug exists
    const existing = await this.db.first({
      sql: `SELECT id FROM categories WHERE slug = ?`,
      args: [slug]
    });
    
    if (existing) {
      return { success: false, status: 409, error: 'Category with this name already exists' };
    }
    
    const result = await this.db.execute({
      sql: `
        INSERT INTO categories (
          name, slug, description, parent_id, is_active, sort_order, created_by, updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      args: [
        name, slug, description || null, parent_id || null, is_active, sort_order, userId, userId
      ]
    });
    
    const categoryId = result.results?.[0]?.id || result.meta?.last_row_id;
    
    const newCategory = await this.getCategoryById(categoryId);
    return { success: true, status: 201, message: 'Category created successfully', data: newCategory.data };
  }

  async updateCategory(categoryId: string, data: any, userId: string) {
    const existing = await this.getCategoryById(categoryId);
    if (!existing.success) return existing;
    
    const updates = [];
    const params = [];
    
    const allowedFields = ['name', 'description', 'parent_id', 'is_active', 'sort_order'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (data.name) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      updates.push(`slug = ?`);
      params.push(slug);
    }
    
    if (updates.length === 0) return { success: false, status: 400, error: 'No fields to update' };
    
    updates.push("updated_at = datetime('now')");
    updates.push("updated_by = ?");
    params.push(userId, categoryId);
    
    await this.db.execute({
      sql: `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      args: params
    });
    
    const updatedCategory = await this.getCategoryById(categoryId);
    return { success: true, message: 'Category updated successfully', data: updatedCategory.data };
  }

  async deleteCategory(categoryId: string, userId: string) {
    const existing = await this.db.first({
      sql: `SELECT id FROM categories WHERE id = ?`,
      args: [categoryId]
    });
    
    if (!existing) {
      return { success: false, status: 404, error: 'Category not found' };
    }
    
    // Check if products exist in this category
    const productsCount = await this.db.first({
      sql: `SELECT COUNT(*) as count FROM products WHERE category_id = ?`,
      args: [categoryId]
    });
    
    if (productsCount && productsCount.count > 0) {
      return { success: false, status: 400, error: 'Cannot delete category because it has products.' };
    }
    
    await this.db.execute({
      sql: `UPDATE categories SET is_active = 0, deleted_at = datetime('now'), deleted_by = ? WHERE id = ?`,
      args: [userId, categoryId]
    });
    
    return { success: true, message: 'Category deleted successfully' };
  }
}
