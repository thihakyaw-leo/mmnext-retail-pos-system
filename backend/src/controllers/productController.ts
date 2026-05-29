import { Context } from 'hono';
import { z } from 'zod';
import { ProductService } from '../services/productService.js';
import { R2StorageService } from '../utils/r2Storage.js';
import { Bindings } from '../types/env.js';

// Schemas
export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category_id: z.preprocess((val) => val === '' || val === null || val === 'null' ? null : Number(val), z.number().nullable().optional()),
  description: z.string().optional().nullable(),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  barcode: z.string().optional().nullable(),
  price: z.preprocess((val) => Number(val), z.number().min(0)),
  cost: z.preprocess((val) => Number(val), z.number().min(0)).optional().default(0),
  tax_rate: z.preprocess((val) => Number(val), z.number().min(0).max(100)).optional().default(0),
  is_active: z.preprocess((val) => Number(val), z.number().min(0).max(1)).optional().default(1),
  initial_stock: z.preprocess((val) => Number(val), z.number().min(0)).optional().default(0),
  store_id: z.string().optional().nullable(),
  image_url: z.string().optional().nullable()
});

export const updateProductSchema = productSchema.partial().omit({ initial_stock: true, store_id: true });

export class ProductController {
  
  static async getProducts(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const productService = new ProductService(c.env);
      
      const result = await productService.getAllProducts(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      return c.json({ error: 'Failed to fetch products', details: error.message }, 500);
    }
  }

  static async getProduct(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const productId = c.req.param('id');
      const storeId = c.req.query('store_id');
      const productService = new ProductService(c.env);
      
      const result = await productService.getProductById(orgId, productId, storeId);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      return c.json({ error: 'Failed to fetch product details', details: error.message }, 500);
    }
  }

  static async createProduct(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      const productService = new ProductService(c.env);
      const r2Service = new R2StorageService(c.env);
      
      const body = await c.req.parseBody();
      
      // Handle Image Upload
      let image_url = null;
      if (body.image && body.image instanceof File) {
        const file = body.image;
        const fileExt = file.name.split('.').pop();
        const key = `${orgId}/products/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        const arrayBuffer = await file.arrayBuffer();
        
        const uploadResult = await r2Service.uploadFile(key, arrayBuffer, {
          contentType: file.type,
          uploadedBy: user.id
        });
        
        if (uploadResult.success) {
          image_url = uploadResult.url;
        }
      }
      
      const productData = {
        ...body,
        image_url: image_url || body.image_url
      };
      
      const validatedData = productSchema.parse(productData);
      
      const result = await productService.createProduct(orgId, validatedData, user.id);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error creating product:', error);
      return c.json({ error: 'Failed to create product', details: error.message }, 500);
    }
  }

  static async updateProduct(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const productId = c.req.param('id');
      const user = c.get('user') as any;
      const productService = new ProductService(c.env);
      const r2Service = new R2StorageService(c.env);
      
      const body = await c.req.parseBody();
      
      // Handle Image Upload
      let image_url = null;
      if (body.image && body.image instanceof File) {
        const file = body.image;
        const fileExt = file.name.split('.').pop();
        const key = `${orgId}/products/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        const arrayBuffer = await file.arrayBuffer();
        
        const uploadResult = await r2Service.uploadFile(key, arrayBuffer, {
          contentType: file.type,
          uploadedBy: user.id
        });
        
        if (uploadResult.success) {
          image_url = uploadResult.url;
        }
      }
      
      const productData = {
        ...body,
        ...(image_url && { image_url })
      };
      
      // Clean up string 'null' from FormData
      Object.keys(productData).forEach(key => {
        if (productData[key] === 'null') productData[key] = null;
      });
      
      const validatedData = updateProductSchema.parse(productData);
      
      const result = await productService.updateProduct(orgId, productId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating product:', error);
      return c.json({ error: 'Failed to update product', details: error.message }, 500);
    }
  }

  static async deleteProduct(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const productId = c.req.param('id');
      const productService = new ProductService(c.env);
      
      const result = await productService.deleteProduct(orgId, productId);
      
      if (!result.success) {
        return c.json({ error: result.error }, result.status as any);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return c.json({ error: 'Failed to delete product', details: error.message }, 500);
    }
  }
}
