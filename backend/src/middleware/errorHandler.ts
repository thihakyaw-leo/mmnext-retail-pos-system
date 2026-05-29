import { Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { ErrorLogger, createErrorResponse } from '../utils/errorHandler.js';

export const errorHandler = async (c: Context<Bindings>, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    // Log the error
    const errorLogger = new ErrorLogger(c.env);
    await errorLogger.log(error, { request: c.req, env: c.env });

    // Respond with the properly formatted error
    return createErrorResponse(error, c.req.raw, c.env);
  }
};
