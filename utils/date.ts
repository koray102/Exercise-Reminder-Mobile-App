/**
 * Get today's date as YYYY-MM-DD string (Local Time)
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if an ISO date string matches today's Local Time date
 */
export function isDateStringToday(isoString: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return localDateStr === getTodayString();
}

/**
 * Check if a date string is yesterday
 */
export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return dateStr === yStr;
}
