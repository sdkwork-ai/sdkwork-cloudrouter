const TOKEN_UNITS = ['', 'K', 'M', 'B'] as const;

export function formatTokenCount(value: number, locale = 'zh-CN'): string {
  if (!Number.isFinite(value)) return '0';
  let scaled = Math.abs(value);
  let unit = 0;
  while (scaled >= 1000 && unit < TOKEN_UNITS.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 2,
  }).format(value < 0 ? -scaled : scaled);
  return `${formatted}${TOKEN_UNITS[unit]}`;
}

export function formatMinorUnitsAsCurrency(
  minorUnits: number,
  currency = 'CNY',
  locale = 'zh-CN',
): string {
  if (!Number.isFinite(minorUnits)) minorUnits = 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function formatPercent(ratio: number, locale = 'zh-CN'): string {
  if (!Number.isFinite(ratio)) ratio = 0;
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ratio);
}

export function formatIsoTimestamp(value: string | null | undefined, locale = 'zh-CN'): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

/** Retains only the leading and trailing fragments of a secret key. */
export function maskApiKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '*'.repeat(trimmed.length);
  return `${trimmed.slice(0, 4)}${'*'.repeat(8)}${trimmed.slice(-4)}`;
}
