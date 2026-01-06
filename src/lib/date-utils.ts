/**
 * Formats current date to match SQL datetime format
 * Note: Adds 4 hours to match server timezone (EST)
 * Returns format: YYYY-MM-DD HH:MM:SS
 */
export function getSQLFormattedDate(): string {
  const date = new Date();
  date.setHours(date.getHours() + 4);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export interface FormatRelativeTimeOptions {
  /**
   * Style of formatting:
   * - "short": "5m ago", "2h ago", "3d ago"
   * - "long": "5 minutes ago", "2 hours ago", "3 days ago"
   */
  style?: "short" | "long";
  /**
   * Include seconds in the output (only for style="long")
   */
  includeSeconds?: boolean;
  /**
   * For dates older than this many days, return a formatted date instead
   * If undefined, always returns relative time
   */
  maxDays?: number;
  /**
   * Locale options for fallback date formatting when maxDays is exceeded
   */
  dateFormatOptions?: Intl.DateTimeFormatOptions;
}

/**
 * Formats a date as relative time (e.g., "5 minutes ago", "2h ago")
 * @param date - Date to format (can be Date object or ISO string)
 * @param options - Formatting options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  options: FormatRelativeTimeOptions = {}
): string {
  const {
    style = "short",
    includeSeconds = false,
    maxDays,
    dateFormatOptions
  } = options;

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // If maxDays is specified and exceeded, return formatted date
  if (maxDays !== undefined && diffDay >= maxDays) {
    return dateObj.toLocaleDateString(
      "en-US",
      dateFormatOptions || { month: "short", day: "numeric" }
    );
  }

  if (style === "short") {
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else {
      return `${diffDay}d ago`;
    }
  } else {
    // style === "long"
    if (includeSeconds && diffSec < 60) {
      return `${diffSec} second${diffSec === 1 ? "" : "s"} ago`;
    }
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    }
    if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    }
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  }
}
