export interface RechargeSettingsSnapshot {
  baseCurrencyCode: string;
  basePointsPerCny: string;
  currencyToCnyRates: Record<string, string>;
  previewExamples?: Record<string, Record<string, { grantAmount: number }>>;
}

export const DEFAULT_RECHARGE_BASE_CURRENCY_CODE = 'CNY';
export const DEFAULT_RECHARGE_BASE_POINTS_PER_CNY = '10';
export const DEFAULT_RECHARGE_USD_TO_CNY_RATE = '7';

const RATE_SCALE = 1_000_000n;
const MONEY_SCALE = 100n;

export function defaultRechargeSettings(): RechargeSettingsSnapshot {
  return {
    baseCurrencyCode: DEFAULT_RECHARGE_BASE_CURRENCY_CODE,
    basePointsPerCny: DEFAULT_RECHARGE_BASE_POINTS_PER_CNY,
    currencyToCnyRates: {
      CNY: '1',
      USD: DEFAULT_RECHARGE_USD_TO_CNY_RATE,
    },
  };
}

export function normalizeRechargeSettings(
  value: Partial<RechargeSettingsSnapshot> | null | undefined,
): RechargeSettingsSnapshot {
  const fallback = defaultRechargeSettings();
  const baseCurrencyCode = normalizeCurrencyCode(
    value?.baseCurrencyCode,
    fallback.baseCurrencyCode,
  );
  const currencyToCnyRates = normalizeCurrencyRates(
    value?.currencyToCnyRates,
    baseCurrencyCode,
  );
  return {
    baseCurrencyCode,
    basePointsPerCny: normalizeDecimalString(
      value?.basePointsPerCny,
      6,
      fallback.basePointsPerCny,
    ),
    currencyToCnyRates,
  };
}

export function listRechargeCurrencyCodes(
  settings: Partial<RechargeSettingsSnapshot> | null | undefined,
): string[] {
  const normalized = normalizeRechargeSettings(settings);
  return Object.keys(normalized.currencyToCnyRates).sort((left, right) => {
    if (left === normalized.baseCurrencyCode) {
      return -1;
    }
    if (right === normalized.baseCurrencyCode) {
      return 1;
    }
    if (left === DEFAULT_RECHARGE_BASE_CURRENCY_CODE) {
      return -1;
    }
    if (right === DEFAULT_RECHARGE_BASE_CURRENCY_CODE) {
      return 1;
    }
    return left.localeCompare(right);
  });
}

export function computeGrantAmount(
  amount: string,
  currencyCode: string,
  bonusPoints: number,
  settings: Partial<RechargeSettingsSnapshot> | null | undefined,
): number {
  if (!Number.isInteger(bonusPoints) || bonusPoints < 0) {
    throw new Error('Compute Credits bonus must be a non-negative integer');
  }
  const normalizedSettings = normalizeRechargeSettings(settings);
  const amountScaled = decimalToScaledBigInt(amount, 2);
  if (amountScaled <= 0n) {
    throw new Error('amount must be greater than zero');
  }
  const basePointsScaled = decimalToScaledBigInt(
    normalizedSettings.basePointsPerCny,
    6,
  );
  const normalizedCurrencyCode = normalizeCurrencyCode(
    currencyCode,
    normalizedSettings.baseCurrencyCode,
  );
  const currencyRate = normalizedSettings.currencyToCnyRates[normalizedCurrencyCode]
    || normalizedSettings.currencyToCnyRates[DEFAULT_RECHARGE_BASE_CURRENCY_CODE]
    || '1';
  const currencyRateScaled = decimalToScaledBigInt(currencyRate, 6);
  const numerator = amountScaled * currencyRateScaled * basePointsScaled;
  const denominator = MONEY_SCALE * RATE_SCALE * RATE_SCALE;
  const rounded = roundDivide(numerator, denominator);
  const credited = rounded + BigInt(bonusPoints);
  if (credited > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('grant amount overflow');
  }
  return Number(credited);
}

export function safeComputeGrantAmount(
  amount: string,
  currencyCode: string,
  bonusPoints: number,
  settings: Partial<RechargeSettingsSnapshot> | null | undefined,
): number {
  try {
    return computeGrantAmount(amount, currencyCode, bonusPoints, settings);
  } catch {
    return 0;
  }
}

export function formatRechargeCurrencyAmount(
  amount: string,
  currencyCode: string,
): string {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const normalizedAmount = normalizeMoneyAmount(amount);
  const symbol = rechargeCurrencySymbol(normalizedCurrencyCode);
  return symbol
    ? `${symbol}${normalizedAmount}`
    : `${normalizedCurrencyCode} ${normalizedAmount}`;
}

export function normalizeCurrencyCode(
  value: string | null | undefined,
  fallback = DEFAULT_RECHARGE_BASE_CURRENCY_CODE,
): string {
  const normalized = (value || fallback).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,16}$/.test(normalized)) {
    throw new Error('currencyCode is invalid');
  }
  return normalized;
}

export function normalizeDecimalString(
  value: string | null | undefined,
  scale: number,
  fallback: string,
): string {
  const source = (value || fallback).trim().replace(/,/g, '');
  if (!source) {
    return fallback;
  }
  if (!/^\d+(?:\.\d+)?$/.test(source)) {
    throw new Error('decimal value is invalid');
  }
  const [wholeRaw = '0', fractionRaw = ''] = source.split('.');
  if (fractionRaw.length > scale) {
    throw new Error('decimal value exceeds precision');
  }
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.replace(/0+$/g, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

function normalizeCurrencyRates(
  value: Record<string, string> | null | undefined,
  baseCurrencyCode: string,
): Record<string, string> {
  const fallback = defaultRechargeSettings().currencyToCnyRates;
  const entries = Object.entries(value || {});
  const normalized: Record<string, string> = entries.length > 0
    ? {}
    : { ...fallback };
  for (const [rawCurrencyCode, rawRate] of entries) {
    const currencyCode = normalizeCurrencyCode(rawCurrencyCode);
    normalized[currencyCode] = normalizeDecimalString(rawRate, 6, '1');
  }
  normalized[DEFAULT_RECHARGE_BASE_CURRENCY_CODE] = normalized[DEFAULT_RECHARGE_BASE_CURRENCY_CODE] || '1';
  normalized[baseCurrencyCode] = normalized[baseCurrencyCode] || '1';
  return normalized;
}

function decimalToScaledBigInt(value: string, scale: number): bigint {
  const normalized = normalizeDecimalString(value, scale, '0');
  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.padEnd(scale, '0').slice(0, scale);
  return BigInt(`${whole}${paddedFraction}`);
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + (denominator / 2n)) / denominator;
}

function normalizeMoneyAmount(amount: string): string {
  const cents = decimalToScaledBigInt(amount, 2);
  const whole = cents / MONEY_SCALE;
  const fraction = String(cents % MONEY_SCALE).padStart(2, '0');
  return `${whole.toString()}.${fraction}`;
}

function rechargeCurrencySymbol(currencyCode: string): string {
  switch (currencyCode) {
    case 'CNY':
      return '¥';
    case 'USD':
      return '$';
    default:
      return '';
  }
}
