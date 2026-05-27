import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'cashier', 'staff']),
  hourly_rate: z.number().min(0).optional().default(0),
  commission_rate: z.number().min(0).max(100).optional().default(0),
  department: z.string().optional().default('General'),
  shift_pattern: z.string().optional().default('full-time'),
  hire_date: z.string().optional(), // Should ideally be z.string().datetime() but keeping it loose for now
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'cashier', 'staff']).optional(),
  hourly_rate: z.number().min(0).optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  department: z.string().optional(),
  shift_pattern: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
