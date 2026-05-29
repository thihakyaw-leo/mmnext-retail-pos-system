import { Context } from 'hono';
import { z } from 'zod';
import { OrderService } from '../services/orderService.js';
import { Bindings } from '../types/env.js';

export const orderItemSchema = z.object({
  product_id: z.number(),
  variant_id: z.number().optional().nullable(),
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
  discount_amount: z.number().min(0).optional().default(0),
  total_amount: z.number().min(0),
  cost_price: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});

export const orderSchema = z.object({
  store_id: z.number(),
  order_number: z.string(),
  customer_id: z.number().optional().nullable(),
  order_type: z.string().optional().default('sale'),
  status: z.string().optional().default('completed'),
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0).optional().default(0),
  discount_type: z.string().optional().nullable(),
  discount_reason: z.string().optional().nullable(),
  tax_amount: z.number().min(0).optional().default(0),
  tax_rate: z.number().min(0).optional().default(0),
  total_amount: z.number().min(0),
  payment_method: z.string().optional().default('cash'),
  payment_status: z.string().optional().default('completed'),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item')
});

export class OrderController {
  
  static async getOrders(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      
      const orderService = new OrderService(c.env);
      const result = await orderService.getOrders(orgId, filters);
      
      return c.json(result);
    } catch (error) {
      console.error('Get orders error:', error);
      return c.json({ error: 'Failed to fetch orders' }, 500);
    }
  }

  static async getOrder(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const orderId = c.req.param('id');
      
      const orderService = new OrderService(c.env);
      const result = await orderService.getOrderById(orgId, orderId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      return c.json(result);
    } catch (error) {
      console.error('Get order error:', error);
      return c.json({ error: 'Failed to fetch order' }, 500);
    }
  }

  static async createOrder(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const user = c.get('user') as any;
      
      const body = await c.req.json();
      const validatedData = orderSchema.parse(body);
      
      const orderService = new OrderService(c.env);
      
      // Inject cashier_id from the authenticated user making the request
      const orderData = {
        ...validatedData,
        cashier_id: user.id
      };
      
      const result = await orderService.createOrder(orgId, orderData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Create order error:', error);
      return c.json({ error: 'Failed to create order' }, 500);
    }
  }
}
