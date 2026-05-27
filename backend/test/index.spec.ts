/// <reference types="@cloudflare/vitest-pool-workers" />
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:vitest';
import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

describe('Worker Core API', () => {
  it('GET /health returns healthy status', async () => {
    const request = new Request('http://example.com/health');
    // Create an empty context to pass to fetch
    const ctx = createExecutionContext();

    // Simulate the worker's fetch handler
    const response = await worker.fetch(request, env, ctx);

    // Wait for any waitUntil tasks to complete
    await waitOnExecutionContext(ctx);

    // Assertions
    expect(response.status).toBe(200);

    const body: any = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.uptime).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api returns API version info', async () => {
    const request = new Request('http://example.com/api');
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.api_version).toBe('v1');
    expect(body.rate_limits).toBeDefined();
  });
});
