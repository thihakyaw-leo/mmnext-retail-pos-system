import { Context } from 'hono';
import { PromotionService } from '../services/promotionService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class PromotionController {
  
  static async getPromotions(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const queryParams = c.req.query();
      const promotionService = new PromotionService(c.env);
      const promotions = await promotionService.getPromotions(orgId, queryParams);

      return c.json({ data: promotions });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch promotions', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getPromotion(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const id = c.req.param('id');
      
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const promotionService = new PromotionService(c.env);
      const promotion = await promotionService.getPromotion(orgId, id);

      return c.json({ data: promotion });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch promotion', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async createPromotion(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const promotionService = new PromotionService(c.env);
      const promotion = await promotionService.createPromotion(orgId, data);

      return c.json({ data: promotion }, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create promotion', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async updatePromotion(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const id = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const promotionService = new PromotionService(c.env);
      const promotion = await promotionService.updatePromotion(orgId, id, data);

      return c.json({ data: promotion });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update promotion', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async deletePromotion(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const id = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const promotionService = new PromotionService(c.env);
      const result = await promotionService.deletePromotion(orgId, id);

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete promotion', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async validatePromotion(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { code, cartTotal, customerId } = await c.req.json();
      
      if (!code) throw new ValidationError('Promotion code or ID is required');
      if (cartTotal === undefined) throw new ValidationError('cartTotal is required');

      const promotionService = new PromotionService(c.env);
      const result = await promotionService.validateAndCalculateDiscount(orgId, code, Number(cartTotal), customerId);

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to validate promotion', 'INTERNAL_ERROR', 500, error);
    }
  }
}
