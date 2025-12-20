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
