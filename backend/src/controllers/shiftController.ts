import { Context } from 'hono';
import { ShiftService } from '../services/shiftService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class ShiftController {
  
  static async getShifts(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const shiftService = new ShiftService(c.env);
      const data = await shiftService.getShifts(orgId);

      return c.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch shifts', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async openShift(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const body = await c.req.json();
      const { register_name, starting_cash, notes } = body;

      if (!register_name) throw new ValidationError('register_name is required');

      const shiftService = new ShiftService(c.env);
      const data = await shiftService.openShift(orgId, user.id, register_name, starting_cash || 0, notes);

      return c.json(data, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to open shift', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async addMovement(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const shiftId = c.req.param('id');
      const body = await c.req.json();
      const { type, amount, reason } = body;

      if (!type || !amount || !reason) {
        throw new ValidationError('type, amount, and reason are required');
      }

      const shiftService = new ShiftService(c.env);
      const data = await shiftService.addCashMovement(orgId, shiftId, type, amount, reason);

      return c.json(data, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to record cash movement', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async closeShift(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const shiftId = c.req.param('id');
      const body = await c.req.json();
      const { actual_ending_cash, notes } = body;

      if (actual_ending_cash === undefined) throw new ValidationError('actual_ending_cash is required');

      const shiftService = new ShiftService(c.env);
      const data = await shiftService.closeShift(orgId, shiftId, actual_ending_cash, notes);

      return c.json(data);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to close shift', 'INTERNAL_ERROR', 500, error);
    }
  }
}
