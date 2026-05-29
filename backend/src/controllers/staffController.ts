import { Context } from 'hono';
import { z } from 'zod';
import { StaffService } from '../services/staffService.js';
import { Bindings } from '../types/env.js';
import { hashPassword } from '../utils/encryption.js';

export const staffSchema = z.object({
  store_id: z.number().optional().nullable(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'manager', 'cashier']).optional().default('cashier'),
  employee_id: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  salary: z.number().optional().nullable(),
});

export const updateStaffSchema = staffSchema.partial().omit({ password: true }).extend({
  is_active: z.preprocess((val) => Number(val), z.number().min(0).max(1)).optional()
});

export class StaffController {
  
  static async getStaffs(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const filters = c.req.query();
      const staffService = new StaffService(c.env);
      
      const result = await staffService.getStaffs(orgId, filters);
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching staffs:', error);
      return c.json({ error: 'Failed to fetch staffs', details: error.message }, 500);
    }
  }

  static async getStaff(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const staffId = c.req.param('id');
      const staffService = new StaffService(c.env);
      
      const result = await staffService.getStaffById(orgId, staffId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching staff details:', error);
      return c.json({ error: 'Failed to fetch staff details', details: error.message }, 500);
    }
  }

  static async createStaff(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const staffService = new StaffService(c.env);
      
      const body = await c.req.json();
      const validatedData = staffSchema.parse(body);
      
      // Hash the password before saving
      const password_hash = await hashPassword(validatedData.password);
      
      const staffData = {
        ...validatedData,
        password_hash
      };
      
      const result = await staffService.createStaff(orgId, staffData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error creating staff:', error);
      return c.json({ error: 'Failed to create staff', details: error.message }, 500);
    }
  }

  static async updateStaff(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const staffId = c.req.param('id');
      const staffService = new StaffService(c.env);
      
      const body = await c.req.json();
      const validatedData = updateStaffSchema.parse(body);
      
      const result = await staffService.updateStaff(orgId, staffId, validatedData);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: (error as any).errors }, 400);
      }
      console.error('Error updating staff:', error);
      return c.json({ error: 'Failed to update staff', details: error.message }, 500);
    }
  }

  static async deleteStaff(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const staffId = c.req.param('id');
      const staffService = new StaffService(c.env);
      
      const result = await staffService.deleteStaff(orgId, staffId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      return c.json({ error: 'Failed to delete staff', details: error.message }, 500);
    }
  }

  static async getStaffStats(c: Context<Bindings>) {
    try {
      const orgId = c.get('orgId') as string;
      const staffId = c.req.param('id');
      const staffService = new StaffService(c.env);
      
      const result = await staffService.getStaffStats(orgId, staffId);
      
      if (!result.success) {
        return c.json({ error: (result as any).error }, (result as any).status);
      }
      
      return c.json(result);
    } catch (error: any) {
      console.error('Error fetching staff stats:', error);
      return c.json({ error: 'Failed to fetch staff stats', details: error.message }, 500);
    }
  }
}
