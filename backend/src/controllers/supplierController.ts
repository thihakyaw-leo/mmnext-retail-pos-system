import { Context } from 'hono';
import { z } from 'zod';
import { SupplierService } from '../services/supplierService.js';
import { Bindings } from '../types/env.js';

export const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact_person: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  tax_number: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.preprocess((val) => Number(val), z.number().min(0).max(1)).optional().default(1)
});

export const updateSupplierSchema = supplierSchema.partial();

export class SupplierController {
  
  static async getSuppliers(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const supplierService = new SupplierService(c.env);
      
      const result = await supplierService.getAllSuppliers(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      return c.json({ error: 'Failed to fetch suppliers', details: error.message }, 500);
    }
  }

  static async getSupplier(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const supplierId = c.req.param('id');
      const supplierService = new SupplierService(c.env);
      
      const result = await supplierService.getSupplierById(orgId, supplierId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching supplier details:', error);
      return c.json({ error: 'Failed to fetch supplier details', details: error.message }, 500);
    }
  }

  static async createSupplier(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const supplierService = new SupplierService(c.env);
      
      const body = await c.req.json();
      const validatedData = supplierSchema.parse(body);
      
      const result = await supplierService.createSupplier(orgId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error creating supplier:', error);
      return c.json({ error: 'Failed to create supplier', details: error.message }, 500);
    }
  }

  static async updateSupplier(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const supplierId = c.req.param('id');
      const supplierService = new SupplierService(c.env);
      
      const body = await c.req.json();
      const validatedData = updateSupplierSchema.parse(body);
      
      const result = await supplierService.updateSupplier(orgId, supplierId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating supplier:', error);
      return c.json({ error: 'Failed to update supplier', details: error.message }, 500);
    }
  }

  static async deleteSupplier(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const supplierId = c.req.param('id');
      const supplierService = new SupplierService(c.env);
      
      const result = await supplierService.deleteSupplier(orgId, supplierId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      return c.json({ error: 'Failed to delete supplier', details: error.message }, 500);
    }
  }
}
