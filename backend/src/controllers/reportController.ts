import { Context } from 'hono';
import { ReportService } from '../services/reportService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class ReportController {
  
  static async getSalesSummary(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      // validated query params
      const { startDate, endDate, storeId } = c.req.query();

      const reportService = new ReportService(c.env);
      const data = await reportService.getSalesSummaryReport(
        orgId, 
        startDate, 
        endDate, 
        storeId ? parseInt(storeId as string) : undefined
      );

      return c.json({
        success: true,
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate sales summary report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getInventoryValuation(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { storeId } = c.req.query();

      const reportService = new ReportService(c.env);
      const data = await reportService.getInventoryValuationReport(
        orgId,
        storeId ? parseInt(storeId as string) : undefined
      );

      return c.json({
        success: true,
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate inventory valuation report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getEndOfDay(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { date, storeId } = c.req.query();

      const reportService = new ReportService(c.env);
      const data = await reportService.getEndOfDayReport(
        orgId,
        date,
        storeId ? parseInt(storeId as string) : undefined
      );

      return c.json({
        success: true,
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate end of day report', 'INTERNAL_ERROR', 500, error);
    }
  }
}
