/**
 * Application Constants
 * Shared configuration values and enums for the POS system
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STAFF: 'staff',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MOBILE_PAYMENT: 'mobile_payment',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export const STOCK_MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  SALE: 'sale',
  RETURN: 'return',
  ADJUSTMENT_IN: 'adjustment_in',
  ADJUSTMENT_OUT: 'adjustment_out',
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  SHORT: 60,         // 1 minute (e.g., frequently changing inventory)
  MEDIUM: 300,       // 5 minutes (e.g., dashboard stats)
  LONG: 3600,        // 1 hour (e.g., products list)
  EXTRA_LONG: 86400, // 24 hours (e.g., store configurations)
};

// Loyalty Settings
export const LOYALTY = {
  POINTS_PER_UNIT: 5, // Spend $5 to get 1 point
  REDEMPTION_VALUE: 0.1, // 1 point = $0.1 discount
};
