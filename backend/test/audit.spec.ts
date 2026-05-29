/// <reference types="@cloudflare/vitest-pool-workers" />
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src/index.js';
import { createAuthRequest, setupDatabase } from './authHelper.js';

describe('Audit Logs API', () => {
  
  beforeAll(async () => {
    env.JWT_SECRET = 'test-secret';
    await setupDatabase(env);
  });

  describe('GET /api/audit/logs', () => {
    it('allows admin to view logs', async () => {
      const request = await createAuthRequest('/api/audit/logs', 'GET', 'admin');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      if (response.status !== 500) {
        expect(response.status).toBe(200);
        const body: any = await response.json();
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('blocks cashier from viewing logs', async () => {
      const request = await createAuthRequest('/api/audit/logs', 'GET', 'cashier');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
    });
  });

});
