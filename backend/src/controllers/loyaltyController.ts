import { Context } from 'hono';
import { LoyaltyService } from '../services/loyaltyService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class LoyaltyController {

  static async getPrograms(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const loyaltyService = new LoyaltyService(c.env);
      const programs = await loyaltyService.getPrograms(orgId);

      return c.json({ data: programs });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch loyalty programs', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async createProgram(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const loyaltyService = new LoyaltyService(c.env);
      const program = await loyaltyService.createProgram(orgId, data);

      return c.json({ data: program }, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create loyalty program', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async updateProgram(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const id = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const loyaltyService = new LoyaltyService(c.env);
      const program = await loyaltyService.updateProgram(orgId, id, data);

      return c.json({ data: program });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update loyalty program', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async earnPoints(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { customerId, orderId, amountSpent } = await c.req.json();
      
      if (!customerId || !orderId || amountSpent === undefined) {
        throw new ValidationError('customerId, orderId, and amountSpent are required');
      }

      const loyaltyService = new LoyaltyService(c.env);
      const result = await loyaltyService.earnPoints(orgId, customerId.toString(), orderId.toString(), Number(amountSpent));

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to process point earning', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async redeemPoints(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { customerId, orderId, pointsToRedeem } = await c.req.json();

      if (!customerId || !orderId || !pointsToRedeem) {
        throw new ValidationError('customerId, orderId, and pointsToRedeem are required');
      }

      const loyaltyService = new LoyaltyService(c.env);
      const result = await loyaltyService.redeemPoints(orgId, customerId.toString(), orderId.toString(), Number(pointsToRedeem));

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to redeem points', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getHistory(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const customerId = c.req.param('customerId');
      
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const loyaltyService = new LoyaltyService(c.env);
      const history = await loyaltyService.getCustomerPointsHistory(orgId, customerId);

      return c.json({ data: history });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch points history', 'INTERNAL_ERROR', 500, error);
    }
  }
}
