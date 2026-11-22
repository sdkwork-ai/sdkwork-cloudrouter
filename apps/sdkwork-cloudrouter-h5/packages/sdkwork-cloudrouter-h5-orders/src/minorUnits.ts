/**
 * Minor-unit money formatting for the cashier surfaces.
 *
 * API_SPEC §13.2.3 and §13.6 require integer money to be formatted with the
 * currency's registered exponent and forbid round-tripping it through a
 * JavaScript `number` (or writing a literal `/ 100`): a zero-decimal currency
 * such as JPY would silently render 100x too small, and integers beyond
 * `Number.MAX_SAFE_INTEGER` lose precision.
 *
 * This helper formats the digit string directly, so no float ever enters the
 * path and every currency is rendered at its own scale.
 */

/** ISO 4217 exponents that are not the default 2. */
const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  // Zero-decimal
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VUV: 0,
  VND: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // Three-decimal
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

/** Default ISO 4217 exponent. */
const DEFAULT_EXPONENT = 2;

/** Max exponent this formatter renders. */
const MAX_EXPONENT = 3;

/** Returns the ISO 4217 exponent of a currency code. */
export function minorUnitExponent(currency: string): number {
  const code = currency.trim().toUpperCase();
  const exponent = CURRENCY_EXPONENTS[code];
  if (exponent === undefined) {
    return DEFAULT_EXPONENT;
  }
  return Math.min(exponent, MAX_EXPONENT);
}

/**
 * Formats an integer minor-unit string at the currency's own exponent.
 *
 * Returns `null` when the value is not an integer string, so the caller can fall
 * back without inventing an amount.
 */
export function formatMinorUnits(minor: string, currency: string): string | null {
  const raw = minor.trim();
  if (!/^-?[0-9]+$/u.test(raw)) {
    return null;
  }
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;
  const exponent = minorUnitExponent(currency);
  // Pad so the integer part always has at least one digit.
  const padded = digits.padStart(exponent + 1, '0');
  const whole = exponent === 0 ? padded : padded.slice(0, -exponent);
  const fraction = exponent === 0 ? '' : `.${padded.slice(-exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}
