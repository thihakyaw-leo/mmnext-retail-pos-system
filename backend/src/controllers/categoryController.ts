import { Context } from 'hono';
import { z } from 'zod';
import { CategoryService } from '../services/categoryService.js';
import { Bindings } from '../types/env.js';

export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  parent_id: z.preprocess((val) => val === '' ? null : Number(val), z.number().nullable().optional()),
  is_active: z.preprocess((val) => Number(val), z.number().min(0).max(1)).optional().default(1),
  sort_order: z.preprocess((val) => Number(val), z.number().min(0)).optional().default(0)
});

export const updateCategorySchema = categorySchema.partial();

export class CategoryController {
  
  static async getCategories(c: Context<Bindings>) {
    try {
      const filters = c.req.query();
      const categoryService = new CategoryService(c.env);
      
      const result = await categoryService.getAllCategories(filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return c.json({ error: 'Failed to fetch categories', details: error.message }, 500);
    }
  }

  static async getCategory(c: Context<Bindings>) {
    try {
      const categoryId = c.req.param('id');
      const categoryService = new CategoryService(c.env);
      
      const result = await categoryService.getCategoryById(categoryId);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching category details:', error);
      return c.json({ error: 'Failed to fetch category details', details: error.message }, 500);
    }
  }

  static async createCategory(c: Context<Bindings>) {
    try {
      const user = c.get('user') as any;
      const categoryService = new CategoryService(c.env);
      
      const body = await c.req.json();
      const validatedData = categorySchema.parse(body);
      
      const result = await categoryService.createCategory(validatedData, user.id);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error creating category:', error);
      return c.json({ error: 'Failed to create category', details: error.message }, 500);
    }
  }

  static async updateCategory(c: Context<Bindings>) {
    try {
      const categoryId = c.req.param('id');
      const user = c.get('user') as any;
      const categoryService = new CategoryService(c.env);
      
      const body = await c.req.json();
      const validatedData = updateCategorySchema.parse(body);
      
      const result = await categoryService.updateCategory(categoryId, validatedData, user.id);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating category:', error);
      return c.json({ error: 'Failed to update category', details: error.message }, 500);
    }
  }

  static async deleteCategory(c: Context<Bindings>) {
    try {
      const categoryId = c.req.param('id');
      const user = c.get('user') as any;
      const categoryService = new CategoryService(c.env);
      
      const result = await categoryService.deleteCategory(categoryId, user.id);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      return c.json({ error: 'Failed to delete category', details: error.message }, 500);
    }
  }
}
