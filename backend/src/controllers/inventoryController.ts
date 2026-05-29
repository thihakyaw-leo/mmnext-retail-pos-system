import { Context } from 'hono';
import { z } from 'zod';
import { InventoryService } from '../services/inventoryService.js';
import { Bindings } from '../types/env.js';

export const inventoryUpdateSchema = z.object({
  store_id: z.number(),
  product_id: z.number(),
  quantity_change: z.number(),
  reason: z.string().min(1, 'Reason is required')
});

export class InventoryController {
  
  static async getInventory(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const inventoryService = new InventoryService(c.env);
      
      const result = await inventoryService.getInventory(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      return c.json({ error: 'Failed to fetch inventory', details: error.message }, 500);
    }
  }

  static async getInventoryLogs(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const inventoryService = new InventoryService(c.env);
      
      const result = await inventoryService.getInventoryLogs(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching inventory logs:', error);
      return c.json({ error: 'Failed to fetch inventory logs', details: error.message }, 500);
    }
  }

  static async updateInventoryLevel(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      const inventoryService = new InventoryService(c.env);
      
      const body = await c.req.json();
      const validatedData = inventoryUpdateSchema.parse(body);
      
      const result = await inventoryService.updateInventoryLevel(
        orgId,
        validatedData.store_id,
        validatedData.product_id,
        validatedData.quantity_change,
        user.id,
        validatedData.reason
      );
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating inventory:', error);
      return c.json({ error: 'Failed to update inventory', details: error.message }, 500);
    }
  }
}
