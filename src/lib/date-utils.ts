/**
 * Client-side Date Utilities
 *
 * ⚠️ DEPRECATED: For new code, use server-side date utilities in src/server/date-utils.ts
 *
 * This function is kept for backward compatibility with existing client code.
 * Server-side code should use src/server/date-utils.ts instead.
 *
 * Note: This previously had a hardcoded +4 hour offset which was incorrect.
 * Now properly returns UTC time.
 */

/**
 * Get current UTC date/time formatted for SQL insert
 *
 * @deprecated Use server-side getSQLFormattedDate from ~/server/utils instead
 * @returns SQL-formatted date string (YYYY-MM-DD HH:MM:SS) in UTC
 */
export function getSQLFormattedDate(): string {
  const date = new Date();

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format a date for relative display (client-side)
 * e.g., "5m ago", "2h ago", "Dec 19"
 *
 * @param dateString SQL date string or ISO string
 * @returns Formatted relative time string
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: diffDays > 365 ? "numeric" : undefined
    });
  }
}
