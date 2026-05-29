import { Context } from 'hono';
import { OrganizationService } from '../services/orgService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class OrganizationController {
  
  // --- ORGANIZATION ---

  static async getOrganization(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const orgService = new OrganizationService(c.env);
      const org = await orgService.getOrganization(orgId);

      return c.json({ data: org });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch organization settings', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async updateOrganization(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const orgService = new OrganizationService(c.env);
      const org = await orgService.updateOrganization(orgId, data);

      return c.json({ data: org });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update organization settings', 'INTERNAL_ERROR', 500, error);
    }
  }

  // --- STORES ---

  static async getStores(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const orgService = new OrganizationService(c.env);
      const stores = await orgService.getStores(orgId);

      return c.json({ data: stores });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch stores', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getStore(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const storeId = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const orgService = new OrganizationService(c.env);
      const store = await orgService.getStore(orgId, storeId);

      return c.json({ data: store });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch store details', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async createStore(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const orgService = new OrganizationService(c.env);
      const store = await orgService.createStore(orgId, data);

      return c.json({ data: store }, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create store', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async updateStore(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const storeId = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const orgService = new OrganizationService(c.env);
      const store = await orgService.updateStore(orgId, storeId, data);

      return c.json({ data: store });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update store', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async deleteStore(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const storeId = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const orgService = new OrganizationService(c.env);
      const result = await orgService.deleteStore(orgId, storeId);

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete store', 'INTERNAL_ERROR', 500, error);
    }
  }
}
