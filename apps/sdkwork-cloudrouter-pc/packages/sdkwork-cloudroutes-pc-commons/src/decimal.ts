import { formatMoney } from '@sdkwork/utils/money';
import { decimalStringToMicro, microToDecimalString } from '@sdkwork/utils';
import { readString, type ApiRecord } from './api-result.ts';

const DEFAULT_DECIMAL_DIGITS = 6;

/** Token Bank carries points with up to 6 decimal places (1 point = 1e6 micro). */
export const TOKEN_POINTS_SCALE = 6;

/**
 * Discounted price for an admin package: `value * discountPercent / 100`,
 * computed with integer units so no floating-point rounding leaks into the
 * displayed price. An out-of-range discount falls back to no discount (100),
 * matching the read semantics of the backend discount columns. The default
 * scale matches the 8-decimal price ceiling of the admin package contracts.
 */
export function computeDiscountedAmount(
  value: string,
  discountPercent: number,
  digits = 8,
): string {
  const discount = Number.isInteger(discountPercent) && discountPercent >= 1 && discountPercent <= 100
    ? BigInt(discountPercent)
    : 100n;
  const units = decimalUnits(value, digits);
  if (units === 0n) {
    return formatDecimalUnits(0n, digits);
  }
  const scaled = units * discount;
  const remainder = scaled % 100n;
  const discounted = scaled / 100n + (remainder * 2n >= 100n ? 1n : 0n);
  return formatDecimalUnits(discounted, digits);
}

export function readDecimalString(
  record: ApiRecord,
  key: string,
  digits = DEFAULT_DECIMAL_DIGITS,
): string {
  return formatDecimalAmount(readString(record, key, zeroDecimal(digits)).trim(), digits);
}

export function sumDecimalStrings(values: string[], digits = DEFAULT_DECIMAL_DIGITS): string {
  const totalUnits = values.reduce((sum, value) => sum + decimalUnits(value, digits), 0n);
  return formatDecimalUnits(totalUnits, digits);
}

export function formatDecimalAmount(value: string, digits = DEFAULT_DECIMAL_DIGITS): string {
  return formatDecimalUnits(decimalUnits(value, digits), digits);
}

export function decimalNumber(value: string, digits = DEFAULT_DECIMAL_DIGITS): number {
  return Number(decimalUnits(value, digits)) / 10 ** digits;
}

export function formatLocalizedInteger(value: string | number, locale: string): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('integer value must be a safe integer');
    }
    return value.toLocaleString(locale);
  }
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error('integer value must be a non-negative int64 string');
  }
  return BigInt(value).toLocaleString(locale);
}

export function formatLocalizedDecimalAmount(
  value: string | number,
  locale: string,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0,
): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('decimal value must be finite');
    }
    return value.toLocaleString(locale, { maximumFractionDigits, minimumFractionDigits });
  }
  const normalizedMaximum = normalizeDisplayDigits(maximumFractionDigits);
  const normalizedMinimum = Math.min(normalizeDisplayDigits(minimumFractionDigits), normalizedMaximum);
  if (!/^[0-9]+(?:\.[0-9]{1,18})?$/u.test(value)) {
    throw new Error('decimal value must be a non-negative decimal string');
  }

  const [whole = '0', fraction = ''] = value.split('.');
  const sourceUnits = BigInt(`${whole}${fraction}`);
  const removedDigits = Math.max(fraction.length - normalizedMaximum, 0);
  const divisor = 10n ** BigInt(removedDigits);
  const roundedUnits = removedDigits > 0
    ? (sourceUnits + divisor / 2n) / divisor
    : sourceUnits * 10n ** BigInt(normalizedMaximum - fraction.length);
  const scale = 10n ** BigInt(normalizedMaximum);
  const roundedWhole = roundedUnits / scale;
  let roundedFraction = normalizedMaximum > 0
    ? String(roundedUnits % scale).padStart(normalizedMaximum, '0')
    : '';
  while (roundedFraction.length > normalizedMinimum && roundedFraction.endsWith('0')) {
    roundedFraction = roundedFraction.slice(0, -1);
  }

  const formattedWhole = roundedWhole.toLocaleString(locale);
  if (!roundedFraction) {
    return formattedWhole;
  }
  return `${formattedWhole}${decimalSeparator(locale)}${roundedFraction}`;
}

export function formatLocalizedCurrencyAmount(
  value: string,
  locale: string,
  currency = 'USD',
): string {
  const formatted = formatMoney(value, {
    currency,
    locale,
    mode: 'symbol',
  });
  if (formatted === null) {
    throw new Error('currency amount must use a supported ISO 4217 code');
  }
  return formatted;
}

export function formatLocalizedCompactDecimalAmount(value: string, locale: string): string {
  if (!/^[0-9]+(?:\.[0-9]{1,18})?$/u.test(value)) {
    throw new Error('decimal value must be a non-negative decimal string');
  }
  const [whole = '0'] = value.split('.');
  const integer = BigInt(whole);
  if (integer < 1_000n) {
    return formatLocalizedDecimalAmount(value, locale, 2, 0);
  }
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(integer);
}

/**
 * 展示用十进制格式化：去掉多余的尾零（"1.000000000000" → "1"、"1.020000" → "1.02"）。
 * 空值或非法数值返回 fallback（默认 '-'）；合法输入不做四舍五入。
 */
export function formatDecimalDisplay(
  value: string | number | null | undefined,
  fallback = '-',
): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (text === '') return fallback;
  if (!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/u.test(text)) return fallback;
  return text.replace(/\.?0+$/, '') || '0';
}

function decimalUnits(value: string, digits: number): bigint {
  const normalizedDigits = normalizeDigits(digits);
  const trimmed = value.trim();
  const pattern =
    normalizedDigits === 0
      ? /^-?\d+$/
      : new RegExp(`^-?\\d+(?:\\.\\d{1,${normalizedDigits}})?$`);
  if (!pattern.test(trimmed)) {
    return 0n;
  }

  const sign = trimmed.startsWith('-') ? -1n : 1n;
  const unsigned = sign < 0n ? trimmed.slice(1) : trimmed;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const scale = 10n ** BigInt(normalizedDigits);
  const fractionUnits =
    normalizedDigits === 0 || fraction === ''
      ? 0n
      : BigInt(fraction.padEnd(normalizedDigits, '0'));
  return sign * (BigInt(whole) * scale + fractionUnits);
}

function formatDecimalUnits(units: bigint, digits: number): string {
  const normalizedDigits = normalizeDigits(digits);
  const sign = units < 0n ? '-' : '';
  const absolute = units < 0n ? -units : units;
  const scale = 10n ** BigInt(normalizedDigits);
  const whole = absolute / scale;
  if (normalizedDigits === 0) {
    return `${sign}${whole}`;
  }
  const fraction = String(absolute % scale).padStart(normalizedDigits, '0');
  return `${sign}${whole}.${fraction}`;
}

function zeroDecimal(digits: number): string {
  return formatDecimalUnits(0n, digits);
}

function normalizeDigits(digits: number): number {
  if (!Number.isInteger(digits) || digits < 0 || digits > 18) {
    return DEFAULT_DECIMAL_DIGITS;
  }
  return digits;
}

function normalizeDisplayDigits(digits: number): number {
  if (!Number.isInteger(digits) || digits < 0 || digits > 18) {
    throw new Error('fraction digits must be an integer between 0 and 18');
  }
  return digits;
}

function decimalSeparator(locale: string): string {
  return new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.';
}

/**
 * Convert a Token Bank micro-point integer (`bigint` or int64 decimal string)
 * into a points decimal string with up to 6 fractional digits, trimming
 * trailing zeros ("4200000" -> "4.2"). Delegates to the shared
 * `@sdkwork/utils/token_bank` implementation so console and admin render the
 * exact same fractional-point value regardless of source.
 */
export function microPointsToDecimalString(value: string | bigint): string {
  const micro = typeof value === 'bigint' ? value : parseMicroPoints(value);
  return microToDecimalString(micro);
}

/**
 * Parse a Token Bank points decimal string into the integer micro-point unit
 * used by the account ledger (1 point = 1e6 micro). Returns `"0"` for empty
 * or invalid input. Mirrors the shared `@sdkwork/utils/token_bank` parser.
 */
export function pointsDecimalToMicroString(value: string): string {
  const micro = decimalStringToMicro(value);
  return (micro ?? 0n).toString();
}

/**
 * Locale-formatted Token Bank point count for display. Converts micro-points
 * into a points decimal string first, then formats with up to 6 fractional
 * digits while trimming trailing zeros. Never rounds away recorded precision.
 */
export function formatTokenBankPoints(
  value: string | bigint,
  locale: string,
  maximumFractionDigits = TOKEN_POINTS_SCALE,
): string {
  return formatLocalizedDecimalAmount(
    microPointsToDecimalString(value),
    locale,
    maximumFractionDigits,
    0,
  );
}

function parseMicroPoints(value: string): bigint {
  // `formatTokenBankPoints` / `microPointsToDecimalString` receive the raw
  // integer micro-point ledger value (e.g. "1234567000"), NOT a points
  // decimal. Feed it through `decimalStringToMicro` would re-scale by 1e6,
  // overstating the shown points. Parse it as an integer micro unit directly.
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) return 0n;
  return BigInt(trimmed);
}
