/**
 * Validators Utility
 * Helper functions and Zod schemas for data validation
 */
import { z } from 'zod';

/**
 * Common Regex Patterns
 */
export const PATTERNS = {
  // Accepts standard emails
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Accepts Myanmar phones: 09... or +959...
  MYANMAR_PHONE: /^(?:\+?959|09)\d{7,9}$/,
  
  // UUID v4 format
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Password: Minimum 8 characters, at least one uppercase, one lowercase, one number
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/
};

/**
 * Reusable Zod Schemas
 */
export const commonSchemas = {
  // For standard ID parameters in routes (e.g. /api/users/:id)
  uuidParam: z.string().regex(PATTERNS.UUID, 'Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  
  // Password validation
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  // Strong password validation
  strongPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PATTERNS.PASSWORD_STRONG, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  // Myanmar phone validation
  phone: z.string().regex(PATTERNS.MYANMAR_PHONE, 'Invalid Myanmar phone number'),
  
  // Pagination query params
  pagination: z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
    search: z.string().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
};

/**
 * Basic boolean validators
 */
export function isValidEmail(email: string): boolean {
  return PATTERNS.EMAIL.test(email);
}

export function isValidMyanmarPhone(phone: string): boolean {
  return PATTERNS.MYANMAR_PHONE.test(phone.replace(/\s+/g, ''));
}

export function isValidUUID(uuid: string): boolean {
  return PATTERNS.UUID.test(uuid);
}

/**
 * Validate that an object has no null or undefined values
 */
export function hasNoEmptyValues(obj: Record<string, any>): boolean {
  return Object.values(obj).every(val => val !== null && val !== undefined && val !== '');
}
