import { Env } from '../types/env.js';

// Error Types
export const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    DATABASE: 'DATABASE_ERROR',
    EXTERNAL_API: 'EXTERNAL_API_ERROR',
    INTERNAL: 'INTERNAL_SERVER_ERROR',
    BAD_REQUEST: 'BAD_REQUEST_ERROR',
    CONFLICT: 'CONFLICT_ERROR',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR'
} as const;

// Error Severity Levels
export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
} as const;

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
    public type: string;
    public statusCode: number;
    public details: any;
    public timestamp: string;
    public isOperational: boolean;

    constructor(message: string, type: string = ERROR_TYPES.INTERNAL, statusCode: number = 500, details: any = null) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    toJSON() {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details: any = null) {
        super(message, ERROR_TYPES.VALIDATION, 400, details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, ERROR_TYPES.AUTHENTICATION, 401);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, ERROR_TYPES.AUTHORIZATION, 403);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, ERROR_TYPES.NOT_FOUND, 404);
        this.name = 'NotFoundError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, ERROR_TYPES.RATE_LIMIT, 429);
        this.name = 'RateLimitError';
    }
}

export class DatabaseError extends AppError {
    public originalError: any;
    constructor(message: string, originalError: any = null) {
        super(message, ERROR_TYPES.DATABASE, 500);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

export class BusinessLogicError extends AppError {
    constructor(message: string, details: any = null) {
        super(message, ERROR_TYPES.BUSINESS_LOGIC, 422, details);
        this.name = 'BusinessLogicError';
    }
}

export class ErrorLogger {
    private env: Env;
    private isDevelopment: boolean;

    constructor(env: Env) {
        this.env = env;
        this.isDevelopment = env.ENVIRONMENT === 'development';
    }
    
    async log(error: Error | AppError, context: any = {}) {
        const type = error instanceof AppError ? error.type : ERROR_TYPES.INTERNAL;
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        
        const errorData = {
            timestamp: new Date().toISOString(),
            message: error.message,
            type,
            statusCode,
            stack: error.stack,
            context: {
                ...context,
                userAgent: context.request?.headers?.get('User-Agent'),
                ip: context.request?.headers?.get('CF-Connecting-IP'),
                url: context.request?.url,
                method: context.request?.method
            }
        };
        
        if (this.isDevelopment) {
            console.error('Error Details:', errorData);
        } else {
            console.error(`[${errorData.type}] ${errorData.message}`);
        }
        
        await this.logToDatabase(errorData);
    }
    
    async logToDatabase(errorData: any) {
        try {
            if (!this.env.DB) return;
            
            const stmt = this.env.DB.prepare(`
                INSERT INTO audit_logs (
                    action, entity_type, success, error_message, 
                    ip_address, user_agent, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            await stmt.bind(
                'error',
                errorData.type,
                false,
                errorData.message,
                errorData.context.ip,
                errorData.context.userAgent,
                errorData.timestamp
            ).run();
        } catch (dbError) {
            console.error('Failed to log error to database:', dbError);
        }
    }
}

export class PerformanceMonitor {
    private env: Env;
    private startTime: number;
    private isDevelopment: boolean;

    constructor(env: Env) {
        this.env = env;
        this.isDevelopment = env.ENVIRONMENT === 'development';
        this.startTime = Date.now();
    }
    
    trackRequest(context: any = {}) {
        const duration = Date.now() - this.startTime;
        const performanceData = {
            timestamp: new Date().toISOString(),
            duration,
            url: context.request?.url,
            method: context.request?.method,
            status: context.response?.status,
            userAgent: context.request?.headers?.get('User-Agent'),
            cfRay: context.request?.headers?.get('CF-Ray'),
            cfCountry: context.request?.headers?.get('CF-IPCountry')
        };
        
        if (duration > 1000) {
            console.warn(`Slow request detected: ${duration}ms`, performanceData);
        }
        
        if (this.isDevelopment) {
            console.log(`Request completed in ${duration}ms`);
        }
        
        return performanceData;
    }
}

export function createErrorResponse(error: any, request: Request | null = null, env: Env | null = null) {
    const isDevelopment = env?.ENVIRONMENT === 'development';
    const isAppError = error instanceof AppError;
    
    let errorData: any = {
        success: false,
        error: {
            type: isAppError ? (error as AppError).type : ERROR_TYPES.INTERNAL,
            message: isAppError ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        }
    };
    
    if (isAppError && (error as AppError).details) {
        errorData.error.details = (error as AppError).details;
    }
    
    if (isDevelopment && error.stack) {
        errorData.error.stack = error.stack;
    }
    
    if (request) {
        const requestId = request.headers.get('CF-Ray') || crypto.randomUUID();
        errorData.error.requestId = requestId;
    }
    
    const statusCode = isAppError ? (error as AppError).statusCode : 500;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };
    
    if (request) {
        const origin = request.headers.get('Origin');
        if (origin) {
            headers['Access-Control-Allow-Origin'] = origin;
            headers['Access-Control-Allow-Credentials'] = 'true';
        }
    }
    
    return new Response(JSON.stringify(errorData), {
        status: statusCode,
        headers
    });
}

export function withErrorHandler(handler: any) {
    return async (request: Request, env: Env, ctx: any) => {
        const errorLogger = new ErrorLogger(env);
        const performanceMonitor = new PerformanceMonitor(env);
        
        try {
            const response = await handler(request, env, ctx);
            performanceMonitor.trackRequest({ request, response });
            return response;
        } catch (error: any) {
            await errorLogger.log(error, { request, env, ctx });
            performanceMonitor.trackRequest({ request });
            return createErrorResponse(error, request, env);
        }
    };
}

export function asyncErrorHandler(fn: any) {
    return async (...args: any[]) => {
        try {
            return await fn(...args);
        } catch (error: any) {
            throw error instanceof AppError ? error : new AppError(error.message);
        }
    };
}

export function handleDatabaseError(error: any) {
    console.error('Database error:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
        return new ValidationError('Duplicate entry detected');
    }
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
        return new ValidationError('Invalid reference to related data');
    }
    if (error.message?.includes('NOT NULL constraint failed')) {
        return new ValidationError('Required field is missing');
    }
    return new DatabaseError('Database operation failed', error);
}

export function handleValidationError(validationResult: any) {
    if (validationResult.error) {
        const details = validationResult.error.details.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        return new ValidationError('Validation failed', details);
    }
    return new ValidationError('Invalid input data');
}

export function handleRateLimitError(identifier: string, limit: number, window: number) {
    const message = `Rate limit exceeded. Maximum ${limit} requests per ${window} seconds.`;
    return new RateLimitError(message);
}

export function classifyErrorSeverity(error: any) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return ERROR_SEVERITY.MEDIUM;
    }
    if (error instanceof ValidationError || error instanceof NotFoundError) {
        return ERROR_SEVERITY.LOW;
    }
    if (error instanceof DatabaseError) {
        return ERROR_SEVERITY.HIGH;
    }
    if (error.statusCode >= 500) {
        return ERROR_SEVERITY.CRITICAL;
    }
    return ERROR_SEVERITY.LOW;
}

export const ErrorRecovery = {
    async retryWithBackoff(operation: any, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                if (attempt === maxRetries) {
                    throw error;
                }
                if (error instanceof ValidationError || 
                    error instanceof AuthenticationError ||
                    error instanceof AuthorizationError) {
                    throw error;
                }
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    },
    
    circuitBreaker(operation: any, threshold = 5, timeout = 60000) {
        let failures = 0;
        let lastFailTime: number | null = null;
        let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        
        return async (...args: any[]) => {
            if (state === 'OPEN') {
                if (Date.now() - (lastFailTime || 0) < timeout) {
                    throw new AppError('Circuit breaker is OPEN');
                } else {
                    state = 'HALF_OPEN';
                }
            }
            try {
                const result = await operation(...args);
                if (state === 'HALF_OPEN') {
                    state = 'CLOSED';
                    failures = 0;
                }
                return result;
            } catch (error) {
                failures++;
                lastFailTime = Date.now();
                if (failures >= threshold) {
                    state = 'OPEN';
                }
                throw error;
            }
        };
    }
};
