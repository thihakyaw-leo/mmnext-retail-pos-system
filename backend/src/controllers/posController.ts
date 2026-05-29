import { Context } from 'hono';
import { PosService } from '../services/posService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class PosController {
  
  static async initPos(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const posService = new PosService(c.env);
      const data = await posService.getPosInitData(orgId);

      return c.json(data);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to initialize POS data', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async holdCart(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const cashierId = user?.id;

      if (!orgId) throw new ValidationError('Organization ID is missing');
      if (!cashierId) throw new ValidationError('Cashier ID is missing');

      const cartData = await c.req.json();
      
      if (!cartData.items || !Array.isArray(cartData.items) || cartData.items.length === 0) {
        throw new ValidationError('Cannot hold an empty cart');
      }

      const posService = new PosService(c.env);
      const result = await posService.holdCart(orgId, cashierId.toString(), cartData);

      return c.json(result, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to hold cart', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getHeldCarts(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const cashierId = user?.id;

      if (!orgId) throw new ValidationError('Organization ID is missing');
      if (!cashierId) throw new ValidationError('Cashier ID is missing');

      const posService = new PosService(c.env);
      const carts = await posService.getHeldCarts(orgId, cashierId.toString());

      return c.json({ carts });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch held carts', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async deleteHeldCart(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const cashierId = user?.id;
      const cartId = c.req.param('cartId');

      if (!orgId) throw new ValidationError('Organization ID is missing');
      if (!cashierId) throw new ValidationError('Cashier ID is missing');

      const posService = new PosService(c.env);
      const success = await posService.deleteHeldCart(orgId, cashierId.toString(), cartId);

      if (!success) {
        throw new AppError('Failed to delete held cart or cart not found', 'NOT_FOUND', 404);
      }

      return c.json({ success: true, message: 'Cart deleted' });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete held cart', 'INTERNAL_ERROR', 500, error);
    }
  }
}
