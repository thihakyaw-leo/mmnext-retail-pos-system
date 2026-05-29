/**
 * Date Utilities
 * Helpers for formatting and manipulating dates, especially for SQLite (D1) compatibility.
 * Cloudflare Workers run in UTC, so these utilities help manage consistent timestamps.
 */

/**
 * Get current timestamp in SQLite format (YYYY-MM-DD HH:MM:SS)
 */
export function getCurrentTimestamp(): string {
  const date = new Date();
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format a Date object or ISO string to YYYY-MM-DD
 */
export function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Get the start of the day in SQLite format
 */
export function getStartOfDay(dateStr?: string | Date): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Get the end of the day in SQLite format
 */
export function getEndOfDay(dateStr?: string | Date): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export type DateRangePeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year';

/**
 * Calculate standard business date ranges
 * Returns start and end timestamps for database filtering
 */
export function getDateRange(period: DateRangePeriod): { start: string; end: string } {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (period) {
    case 'today':
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setUTCDate(now.getUTCDate() - 1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCDate(now.getUTCDate() - 1);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'this_week':
      // Assuming week starts on Monday
      const day = now.getUTCDay() || 7; 
      start.setUTCDate(now.getUTCDate() - day + 1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'this_month':
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'last_month':
      start.setUTCMonth(now.getUTCMonth() - 1, 1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCMonth(now.getUTCMonth(), 0); // Last day of last month
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'this_year':
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      break;
  }

  return {
    start: start.toISOString().replace('T', ' ').substring(0, 19),
    end: end.toISOString().replace('T', ' ').substring(0, 19),
  };
}
