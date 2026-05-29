import { Context } from 'hono';
import { AuditService } from '../services/auditService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class AuditController {
  
  static async getLogs(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      // Parse query parameters safely
      const queries = c.req.queries();
      const filters: any = {};
      
      // Basic extraction of query parameters (handling string vs string array in Hono)
      const extractQuery = (key: string) => queries[key]?.[0] || c.req.query(key);

      if (extractQuery('userId')) filters.userId = extractQuery('userId');
      if (extractQuery('storeId')) filters.storeId = extractQuery('storeId');
      if (extractQuery('action')) filters.action = extractQuery('action');
      if (extractQuery('resourceType')) filters.resourceType = extractQuery('resourceType');
      if (extractQuery('startDate')) filters.startDate = extractQuery('startDate');
      if (extractQuery('endDate')) filters.endDate = extractQuery('endDate');
      if (extractQuery('limit')) filters.limit = extractQuery('limit');
      if (extractQuery('page')) filters.page = extractQuery('page');

      const auditService = new AuditService(c.env);
      const logs = await auditService.getLogs(orgId, filters);

      return c.json({ data: logs });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch audit logs', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getLogDetails(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const logId = c.req.param('id');
      
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const auditService = new AuditService(c.env);
      const log = await auditService.getLogDetails(orgId, logId);

      return c.json({ data: log });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch audit log details', 'INTERNAL_ERROR', 500, error);
    }
  }
}
