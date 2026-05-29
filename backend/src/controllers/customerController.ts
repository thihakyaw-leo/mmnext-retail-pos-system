import { Context } from 'hono';
import { z } from 'zod';
import { CustomerService } from '../services/customerService.js';
import { Bindings } from '../types/env.js';

export const customerSchema = z.object({
  customer_number: z.string().optional().nullable(),
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().default('VN'),
  customer_group: z.string().optional().default('regular'),
  notes: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  loyalty_member: z.boolean().optional().default(false)
});

export const updateCustomerSchema = customerSchema.partial().extend({
  is_active: z.preprocess((val) => Number(val), z.number().min(0).max(1)).optional()
});

export class CustomerController {
  
  static async getCustomers(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const customerService = new CustomerService(c.env);
      
      const result = await customerService.getCustomers(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      return c.json({ error: 'Failed to fetch customers', details: error.message }, 500);
    }
  }

  static async getCustomer(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const customerId = c.req.param('id');
      const customerService = new CustomerService(c.env);
      
      const result = await customerService.getCustomerById(orgId, customerId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      return c.json({ error: 'Failed to fetch customer details', details: error.message }, 500);
    }
  }

  static async createCustomer(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const customerService = new CustomerService(c.env);
      
      const body = await c.req.json();
      const validatedData = customerSchema.parse(body);
      
      const result = await customerService.createCustomer(orgId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error creating customer:', error);
      return c.json({ error: 'Failed to create customer', details: error.message }, 500);
    }
  }

  static async updateCustomer(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const customerId = c.req.param('id');
      const customerService = new CustomerService(c.env);
      
      const body = await c.req.json();
      const validatedData = updateCustomerSchema.parse(body);
      
      const result = await customerService.updateCustomer(orgId, customerId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating customer:', error);
      return c.json({ error: 'Failed to update customer', details: error.message }, 500);
    }
  }

  static async deleteCustomer(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const customerId = c.req.param('id');
      const customerService = new CustomerService(c.env);
      
      const result = await customerService.deleteCustomer(orgId, customerId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      return c.json({ error: 'Failed to delete customer', details: error.message }, 500);
    }
  }
}
