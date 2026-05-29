import { Context } from 'hono';
import { AnalyticsService } from '../services/analyticsService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';
import { KVCacheService } from '../utils/kvStore.js';

export class AnalyticsController {
  
  static async getDashboard(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { period = '30d' } = c.req.query();
      const cache = new KVCacheService(c.env);
      const cacheKey = `analytics_dashboard:${orgId}:${period}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return c.json(cachedData);
      }

      const now = new Date();
      let startDate;
      switch (period) {
        case '1d': startDate = new Date(now.getTime() - 24*60*60*1000); break;
        case '7d': startDate = new Date(now.getTime() - 7*24*60*60*1000); break;
        case '30d': startDate = new Date(now.getTime() - 30*24*60*60*1000); break;
        case '90d': startDate = new Date(now.getTime() - 90*24*60*60*1000); break;
        case '1y': startDate = new Date(now.getTime() - 365*24*60*60*1000); break;
        default: startDate = new Date(now.getTime() - 30*24*60*60*1000);
      }

      const dateFilter = startDate.toISOString();
      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getDashboardData(orgId, startDate, dateFilter);
      
      const responseData = {
        period,
        ...data
      };

      await cache.set(cacheKey, responseData, 900); // 15 mins cache
      return c.json(responseData);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch dashboard data', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getSales(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, groupBy = 'day', staffId, customerId, productId } = c.req.query();
      const filters = { startDate, endDate, staffId, customerId, productId };

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getSalesAnalytics(orgId, filters, groupBy);

      return c.json({
        groupBy,
        filters,
        ...data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate sales report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getProducts(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, categoryId, sortBy = 'revenue', limit = '50' } = c.req.query();
      const filters = { startDate, endDate, categoryId };
      const limitNum = parseInt(limit as string) || 50;

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getProductAnalytics(orgId, filters, sortBy as string, limitNum);

      return c.json({
        filters: { ...filters, sortBy },
        ...data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate product report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getCustomers(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, segment = 'all', limit = '100' } = c.req.query();
      const filters = { startDate, endDate };
      const limitNum = parseInt(limit as string) || 100;

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getCustomerAnalytics(orgId, filters, segment as string, limitNum);

      return c.json({
        filters: { ...filters, segment },
        ...data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate customer report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getStaff(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { startDate, endDate, staffId, department, metric = 'sales' } = c.req.query();
      const filters = { startDate, endDate, staffId, department };

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getStaffAnalytics(orgId, filters);

      return c.json({
        filters: { ...filters, metric },
        ...data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate staff report', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getRevenueChart(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { period = '30d', groupBy = 'day' } = c.req.query();

      const now = new Date();
      let startDate;
      switch (period) {
        case '7d': startDate = new Date(now.getTime() - 7*24*60*60*1000); break;
        case '30d': startDate = new Date(now.getTime() - 30*24*60*60*1000); break;
        case '90d': startDate = new Date(now.getTime() - 90*24*60*60*1000); break;
        case '1y': startDate = new Date(now.getTime() - 365*24*60*60*1000); break;
        default: startDate = new Date(now.getTime() - 30*24*60*60*1000);
      }

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getRevenueChart(orgId, startDate, groupBy as string);

      return c.json({
        period,
        groupBy,
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate revenue chart data', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getProductChart(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { period = '30d', type = 'top-selling' } = c.req.query();

      const now = new Date();
      let startDate;
      switch (period) {
        case '7d': startDate = new Date(now.getTime() - 7*24*60*60*1000); break;
        case '30d': startDate = new Date(now.getTime() - 30*24*60*60*1000); break;
        case '90d': startDate = new Date(now.getTime() - 90*24*60*60*1000); break;
        default: startDate = new Date(now.getTime() - 30*24*60*60*1000);
      }

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getProductChart(orgId, startDate, type as string);

      return c.json({
        period,
        type,
        data
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate product chart data', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getRealtime(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const cache = new KVCacheService(c.env);
      const cacheKey = `analytics_realtime:${orgId}`;
      const cachedData = await cache.get(cacheKey);
      if (cachedData) return c.json(cachedData);

      const analyticsService = new AnalyticsService(c.env);
      const data = await analyticsService.getRealtimeStats(orgId);

      await cache.set(cacheKey, data, 60); // Cache for 1 min
      return c.json(data);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch real-time statistics', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async exportReport(c: Context) {
    try {
      const type = c.req.param('type');
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { format = 'json', ...params } = c.req.query();
      const filters = { ...params };
      const analyticsService = new AnalyticsService(c.env);

      let data: any = {};
      
      switch (type) {
        case 'sales':
          data = await analyticsService.getSalesAnalytics(orgId, filters, params.groupBy || 'day');
          break;
        case 'products':
          data = await analyticsService.getProductAnalytics(orgId, filters, params.sortBy || 'revenue', parseInt(params.limit) || 50);
          break;
        case 'customers':
          data = await analyticsService.getCustomerAnalytics(orgId, filters, params.segment || 'all', parseInt(params.limit) || 100);
          break;
        default:
          throw new ValidationError('Invalid export type');
      }

      if (format === 'csv') {
        const csv = AnalyticsController.convertToCSV(data);
        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      return c.json(data);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to export report', 'INTERNAL_ERROR', 500, error);
    }
  }

  private static convertToCSV(data: any): string {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return '';
    }

    const headers = Object.keys(data.data[0]);
    const csvContent = [
      headers.join(','),
      ...data.data.map((row: any) => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}
