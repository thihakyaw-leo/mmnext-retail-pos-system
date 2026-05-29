import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { zValidator } from '@hono/zod-validator';
import { OrganizationController } from '../controllers/orgController.js';

const organization = new Hono();

const orgUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional(),
  postal_code: z.string().optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  tax_rate: z.number().min(0).optional(),
  business_type: z.string().optional(),
  license_number: z.string().optional().nullable(),
  settings: z.record(z.string(), z.any()).optional()
});

const storeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  manager_id: z.number().optional().nullable(),
  opening_hours: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().default(true)
});

const storeUpdateSchema = storeCreateSchema.partial();

// Protect all routes
organization.use('*', auth);

// --- GLOBAL ORG SETTINGS ---
// Admin only for updates. Managers/Cashiers can only read.
organization.get('/', rbac(['admin', 'manager', 'cashier']), OrganizationController.getOrganization);
organization.put('/', rbac(['admin']), zValidator('json', orgUpdateSchema), OrganizationController.updateOrganization);

// --- STORE MANAGEMENT ---
// Fetching stores is allowed for everyone (so POS terminals know their store data)
organization.get('/stores', rbac(['admin', 'manager', 'cashier']), OrganizationController.getStores);
organization.get('/stores/:id', rbac(['admin', 'manager', 'cashier']), OrganizationController.getStore);

// Modifying stores is strictly admin only
organization.post('/stores', rbac(['admin']), zValidator('json', storeCreateSchema), OrganizationController.createStore);
organization.put('/stores/:id', rbac(['admin']), zValidator('json', storeUpdateSchema), OrganizationController.updateStore);
organization.delete('/stores/:id', rbac(['admin']), OrganizationController.deleteStore);

export default organization;
