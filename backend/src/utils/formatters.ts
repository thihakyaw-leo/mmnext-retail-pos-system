/**
 * Formatters Utility
 * Data formatting and transformation helpers for UI presentation and Data sanitization
 */

/**
 * Format a number as currency
 * Example: 15000 -> "15,000" or "MMK 15,000"
 */
export function formatCurrency(amount: number, currencyCode: string = 'MMK', includeSymbol: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `${currencyCode} ${formatted}` : formatted;
}

/**
 * Clean and standardize Myanmar phone numbers
 * Example: "09-123 456 789" -> "+959123456789"
 * Example: "09123456789" -> "+959123456789"
 */
export function formatMyanmarPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Standardize prefixes
  if (cleaned.startsWith('09')) {
    cleaned = '959' + cleaned.substring(2);
  } else if (cleaned.startsWith('9')) {
    cleaned = '95' + cleaned;
  }

  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Mask an email address for privacy
 * Example: "customer@example.com" -> "cus***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 3) {
    return `${localPart.substring(0, 1)}***@${domain}`;
  }
  
  return `${localPart.substring(0, 3)}***@${domain}`;
}

/**
 * Mask a phone number for privacy
 * Example: "+959123456789" -> "+959******789"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  
  const visibleStart = 4; // e.g. +959
  const visibleEnd = 3;   // e.g. 789
  
  const start = phone.substring(0, visibleStart);
  const end = phone.substring(phone.length - visibleEnd);
  const masked = '*'.repeat(phone.length - visibleStart - visibleEnd);
  
  return `${start}${masked}${end}`;
}

/**
 * Capitalize the first letter of each word
 * Example: "point of sale" -> "Point Of Sale"
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Convert a string to a URL-friendly slug
 * Example: "Men's T-Shirts 2026!" -> "mens-t-shirts-2026"
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
