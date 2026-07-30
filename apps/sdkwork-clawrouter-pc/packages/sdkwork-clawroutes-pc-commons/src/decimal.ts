import { readString, type ApiRecord } from './api-result.ts';

const DEFAULT_DECIMAL_DIGITS = 6;

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
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const parts = formatter.formatToParts(0);
  const numericPartTypes = new Set(['integer', 'group', 'decimal', 'fraction']);
  const firstNumericIndex = parts.findIndex((part) => numericPartTypes.has(part.type));
  let lastNumericIndex = firstNumericIndex;
  parts.forEach((part, index) => {
    if (numericPartTypes.has(part.type)) {
      lastNumericIndex = index;
    }
  });
  const prefix = parts.slice(0, firstNumericIndex).map((part) => part.value).join('');
  const suffix = parts.slice(lastNumericIndex + 1).map((part) => part.value).join('');
  return `${prefix}${formatLocalizedDecimalAmount(value, locale, 2, 2)}${suffix}`;
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
