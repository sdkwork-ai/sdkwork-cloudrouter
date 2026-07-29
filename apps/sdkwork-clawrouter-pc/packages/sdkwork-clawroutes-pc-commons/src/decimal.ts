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
