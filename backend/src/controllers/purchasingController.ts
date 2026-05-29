import { Context } from 'hono';
import { z } from 'zod';
import { PurchasingService } from '../services/purchasingService.js';
import { Bindings } from '../types/env.js';

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable()
});

const poItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().min(1),
  unit_cost: z.number().min(0),
  total_cost: z.number().min(0)
});

const purchaseOrderSchema = z.object({
  store_id: z.number().optional().nullable(),
  supplier_id: z.number(),
  expected_date: z.string().optional().nullable(),
  total_amount: z.number().min(0),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1)
});

export class PurchasingController {
  
  static async getSuppliers(c: Context<Bindings>) {
    const service = new PurchasingService(c.env);
    const result = await service.getSuppliers();
    return c.json(result);
  }

  static async createSupplier(c: Context<Bindings>) {
    try {
      const body = await c.req.json();
      const data = supplierSchema.parse(body);
      const service = new PurchasingService(c.env);
      const result = await service.createSupplier(data);
      return c.json(result, 201);
    } catch (e: any) {
      return c.json({ success: false, error: e.message || 'Invalid data' }, 400);
    }
  }

  static async getPurchaseOrders(c: Context<Bindings>) {
    const orgId = c.get('orgId') as string;
    const service = new PurchasingService(c.env);
    const result = await service.getPurchaseOrders(orgId);
    return c.json(result);
  }

  static async createPurchaseOrder(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      const body = await c.req.json();
      const data = purchaseOrderSchema.parse(body);
      
      // Auto-generate PO number
      const po_number = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const service = new PurchasingService(c.env);
      const result = await service.createPurchaseOrder(orgId, {
        ...data,
        po_number,
        created_by: user.id
      });
      return c.json(result, 201);
    } catch (e: any) {
      return c.json({ success: false, error: e.message || 'Invalid data' }, 400);
    }
  }

  static async updatePurchaseOrderStatus(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const poId = parseInt(c.req.param('id'));
      const body = await c.req.json();
      const { status } = body;
      
      if (!['Draft', 'Pending', 'Received', 'Cancelled'].includes(status)) {
        return c.json({ success: false, error: 'Invalid status' }, 400);
      }

      const service = new PurchasingService(c.env);
      const result = await service.updatePurchaseOrderStatus(orgId, poId, status);
      return c.json(result);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 400);
    }
  }
}
