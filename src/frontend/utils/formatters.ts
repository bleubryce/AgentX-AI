/**
 * Format a number with thousands separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Format a currency value
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(value);
};

/**
 * Format a percentage value
 */
export const formatPercentage = (
  value: number,
  decimals: number = 1,
  includeSymbol: boolean = true
): string => {
  const formatted = (value * 100).toFixed(decimals);
  return includeSymbol ? `${formatted}%` : formatted;
};

/**
 * Format a date string
 */
export const formatDate = (
  date: string | Date,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Format a duration in milliseconds to a human-readable string
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

/**
 * Format a file size in bytes to a human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Format a number to a compact representation
 */
export const formatCompact = (
  value: number,
  locale: string = 'en-US',
  maximumFractionDigits: number = 1
): string => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits
  }).format(value);
}; 