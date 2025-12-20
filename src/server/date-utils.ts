/**
 * Server-side Date/Time Utilities
 *
 * All dates are handled in UTC to avoid timezone issues.
 * Database should store dates in UTC format.
 */

/**
 * Get current UTC date/time formatted for SQL insert
 *
 * @returns SQL-formatted date string (YYYY-MM-DD HH:MM:SS) in UTC
 * @example
 * getSQLFormattedDate() // "2024-12-19 15:30:45"
 */
export function getSQLFormattedDate(): string {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format a Date object for SQL insert
 *
 * @param date Date object to format
 * @returns SQL-formatted date string (YYYY-MM-DD HH:MM:SS) in UTC
 * @example
 * formatDateForSQL(new Date()) // "2024-12-19 15:30:45"
 */
export function formatDateForSQL(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parse a client-provided date string to Date object
 *
 * @param dateString ISO 8601 date string from client
 * @returns Date object or null if invalid
 * @example
 * parseClientDate("2024-12-19T15:30:45.000Z") // Date object
 * parseClientDate("invalid") // null
 */
export function parseClientDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format a date for display with relative time
 * Handles "X minutes ago", "X hours ago", etc.
 *
 * @param dateString SQL date string or ISO string
 * @returns Formatted relative time string
 * @example
 * formatRelativeDate("2024-12-19 15:00:00") // "30m ago" (if now is 15:30)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    // For older dates, return formatted date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: diffDays > 365 ? "numeric" : undefined
    });
  }
}

/**
 * Format a date for display
 *
 * @param dateString SQL date string or ISO string
 * @returns Formatted date string (e.g., "Dec 19, 2024")
 * @example
 * formatDateForDisplay("2024-12-19 15:30:45") // "Dec 19, 2024"
 */
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Get timestamp in milliseconds (UTC)
 *
 * @returns Current timestamp in ms
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}
