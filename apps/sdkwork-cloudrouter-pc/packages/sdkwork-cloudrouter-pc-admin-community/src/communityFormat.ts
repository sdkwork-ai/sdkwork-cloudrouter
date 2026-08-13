/** Display formatting helpers for the Community Center admin module. */

export function formatCommunityMoney(value: number | undefined, currencySymbol = '¥'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  return `${currencySymbol}${value.toFixed(2)}`;
}

export function formatCommunityCount(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '0';
  }
  return String(value);
}

export function formatCommunityDateTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
