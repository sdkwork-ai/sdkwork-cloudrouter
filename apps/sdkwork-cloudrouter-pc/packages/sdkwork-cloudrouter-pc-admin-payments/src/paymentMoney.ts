import { formatMoney } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';

/**
 * Minor-unit formatting for payment money.
 *
 * The payment backend exposes every amount as an integer in the currency's
 * smallest unit (`1250` = 12.50 for a two-decimal currency). Rendering that raw
 * integer is the classic finance-console bug: the operator sees "1250" for a
 * ¥12.50 payment and reconciles against the wrong number. Every payment record,
 * refund, and attempt amount therefore goes through this module.
 */

/** Currencies whose minor unit is the major unit (no decimal subdivision). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Currencies with three decimal digits per major unit. */
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** Minor-unit exponent (decimal digits) of an ISO 4217 currency code. */
export function currencyMinorUnitExponent(currencyCode: unknown): number {
  const code = typeof currencyCode === 'string' ? currencyCode.trim().toUpperCase() : '';
  if (!code) {
    return 2;
  }
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 0;
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return 3;
  }
  return 2;
}

/**
 * Converts an integer minor-unit string into an exact decimal major-unit
 * string (`1250` + exponent 2 -> `"12.50"`). String arithmetic keeps the value
 * exact for amounts beyond `Number.MAX_SAFE_INTEGER`. Returns `null` for
 * non-integer input.
 */
export function minorUnitsToDecimalString(value: unknown, exponent: number): string | null {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!/^-?\d+$/.test(raw)) {
    return null;
  }
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;
  const safeExponent = Number.isInteger(exponent) && exponent >= 0 && exponent <= 6 ? exponent : 2;
  let major: string;
  if (safeExponent === 0) {
    major = digits;
  } else {
    const padded = digits.padStart(safeExponent + 1, '0');
    major = `${padded.slice(0, -safeExponent)}.${padded.slice(-safeExponent)}`;
  }
  return negative ? `-${major}` : major;
}

/**
 * Formats an integer minor-unit amount for display, currency-aware and
 * locale-aware. Falls back to `<major> <CODE>` for currencies the shared money
 * formatter does not know, and echoes the raw value when the backend sends an
 * unexpected (non-integer) amount instead of silently rescaling it.
 */
export function formatPaymentAmount(
  value: unknown,
  currencyCode: unknown,
  locale?: string,
): string {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) {
    return '-';
  }
  const currency = typeof currencyCode === 'string' ? currencyCode.trim().toUpperCase() : '';
  if (!/^-?\d+$/.test(raw)) {
    return currency ? `${raw} ${currency}` : raw;
  }
  const exponent = currencyMinorUnitExponent(currency);
  const major = minorUnitsToDecimalString(raw, exponent);
  if (major === null) {
    return raw;
  }
  if (!currency) {
    return major;
  }
  const formatted = formatMoney(major, {
    currency,
    locale: locale && locale.trim() ? locale : 'en-US',
    mode: 'symbol',
    minFractionDigits: exponent,
    maxFractionDigits: exponent,
  });
  return formatted ?? `${major} ${currency}`;
}
