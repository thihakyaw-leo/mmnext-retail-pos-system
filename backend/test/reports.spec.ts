/// <reference types="@cloudflare/vitest-pool-workers" />
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src/index.js';
import { createAuthRequest, setupDatabase } from './authHelper.js';

describe('Reports API', () => {
  
  // We need to setup JWT_SECRET in env for the auth middleware to decode correctly
  beforeAll(async () => {
    env.JWT_SECRET = 'test-secret';
    await setupDatabase(env);
  });

  describe('GET /api/reports/sales-summary', () => {
    it('requires startDate and endDate', async () => {
      const request = await createAuthRequest('/api/reports/sales-summary', 'GET', 'admin');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400); // Validation error
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    it('returns sales summary when valid dates are provided', async () => {
      const request = await createAuthRequest('/api/reports/sales-summary?startDate=2026-05-01&endDate=2026-05-31', 'GET', 'admin');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.data).toBeDefined();
      // Even if DB is empty, it should return zeroed stats
      expect(body.data.total_sales).toBeDefined();
      expect(body.data.total_orders).toBeDefined();
    });

    it('blocks access for cashiers', async () => {
      const request = await createAuthRequest('/api/reports/sales-summary?startDate=2026-05-01&endDate=2026-05-31', 'GET', 'cashier');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // RBAC middleware should block
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/reports/inventory-valuation', () => {
    it('returns inventory valuation data', async () => {
      const request = await createAuthRequest('/api/reports/inventory-valuation', 'GET', 'manager');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.total_items).toBeDefined();
      expect(body.data.total_value).toBeDefined();
    });
  });

});
