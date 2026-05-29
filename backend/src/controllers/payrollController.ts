import { Context } from 'hono';
import { PayrollService } from '../services/payrollService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class PayrollController {
  
  static async calculatePayroll(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, staffId } = c.req.query();
      
      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const payrollService = new PayrollService(c.env);
      const data = await payrollService.calculatePayroll(
        orgId, 
        new Date(startDate as string), 
        new Date(endDate as string), 
        staffId as string | undefined
      );

      return c.json({
        period: {
          startDate,
          endDate
        },
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to calculate payroll', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getCommissions(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, staffId } = c.req.query();

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const payrollService = new PayrollService(c.env);
      const data = await payrollService.getStaffCommissions(
        orgId, 
        new Date(startDate as string), 
        new Date(endDate as string), 
        staffId as string | undefined
      );

      return c.json({
        period: {
          startDate,
          endDate
        },
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch commissions', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async generatePayrollRun(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const body = await c.req.json();
      const { startDate, endDate, notes } = body;

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const payrollService = new PayrollService(c.env);
      const data = await payrollService.savePayrollRun(
        orgId,
        user.id,
        new Date(startDate),
        new Date(endDate),
        notes
      );

      return c.json({ success: true, data }, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate payroll run', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getPayrollRuns(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const payrollService = new PayrollService(c.env);
      const data = await payrollService.getPayrollRuns(orgId);

      return c.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch payroll runs', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async markAsPaid(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const runId = c.req.param('id');
      if (!runId) throw new ValidationError('Run ID is required');

      const payrollService = new PayrollService(c.env);
      const data = await payrollService.markPayrollRunPaid(orgId, runId);

      return c.json(data);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to mark payroll as paid', 'INTERNAL_ERROR', 500, error);
    }
  }
}
