import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

/**
 * Standardized JSON body validation middleware using Zod
 */
export const validateJson = (schema: z.ZodSchema<any>) => {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: (result as any).error.errors,
        },
        400
      );
    }
  });
};

/**
 * Standardized Query parameter validation middleware using Zod
 */
export const validateQuery = (schema: z.ZodSchema<any>) => {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: (result as any).error.errors,
        },
        400
      );
    }
  });
};

/**
 * Standardized Path parameter validation middleware using Zod
 */
export const validateParam = (schema: z.ZodSchema<any>) => {
  return zValidator('param', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: (result as any).error.errors,
        },
        400
      );
    }
  });
};
