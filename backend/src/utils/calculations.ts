/**
 * POS Calculations Utility
 * Handles precision-safe business calculations for money and taxes.
 * Uses careful rounding to avoid floating-point math issues.
 */

// Round to 2 decimal places to prevent floating point errors (e.g. 0.1 + 0.2)
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface OrderItemInput {
  quantity: number;
  unit_price: number;
  tax_rate?: number;           // Percentage, e.g., 5 for 5%
  discount_amount?: number;    // Fixed discount per item row
}

export interface OrderTotals {
  subtotal: number;            // Total before tax and order-level discount
  total_tax: number;           // Total tax amount
  discount_amount: number;     // Total order-level discount
  total_amount: number;        // Final amount to pay
}

/**
 * Calculate the total for a single line item
 */
export function calculateItemSubtotal(quantity: number, unitPrice: number, discountAmount: number = 0): number {
  const subtotal = (quantity * unitPrice) - discountAmount;
  return round(Math.max(0, subtotal)); // Ensure it doesn't go below 0
}

/**
 * Calculate the total tax for an item (assuming Exclusive Tax)
 * If inclusive tax is needed, the math would be: price - (price / (1 + rate))
 */
export function calculateItemTax(itemSubtotal: number, taxRate: number = 0): number {
  if (taxRate <= 0) return 0;
  return round(itemSubtotal * (taxRate / 100));
}

/**
 * Calculate full order totals based on a list of items and an order-level discount
 */
export function calculateOrderTotals(items: OrderItemInput[], orderDiscount: number = 0): OrderTotals {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const itemSubtotal = calculateItemSubtotal(item.quantity, item.unit_price, item.discount_amount);
    const itemTax = calculateItemTax(itemSubtotal, item.tax_rate);
    
    subtotal += itemSubtotal;
    totalTax += itemTax;
  }

  // Ensure total doesn't go negative after order discount
  const finalDiscount = Math.min(orderDiscount, subtotal + totalTax);
  const totalAmount = (subtotal + totalTax) - finalDiscount;

  return {
    subtotal: round(subtotal),
    total_tax: round(totalTax),
    discount_amount: round(finalDiscount),
    total_amount: round(totalAmount)
  };
}

/**
 * Calculate loyalty points earned
 * Default: 1 point for every 5 units of currency spent
 */
export function calculateLoyaltyPoints(totalSpent: number, pointsPerUnit: number = 5): number {
  if (totalSpent <= 0 || pointsPerUnit <= 0) return 0;
  return Math.floor(totalSpent / pointsPerUnit);
}

/**
 * Percentage discount helper
 */
export function calculatePercentageDiscount(amount: number, percentage: number): number {
  if (percentage <= 0) return 0;
  if (percentage > 100) return amount;
  return round(amount * (percentage / 100));
}
