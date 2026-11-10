// 数字/金额/时间/库存格式化契约（设计规范 §2.8）：
// 金额入参是最小单位整数，非整数不得静默 ÷100；int64 不得丢精度；空值统一 —；
// 无限库存展示 ∞；时间三种后端形态统一成本地 YYYY-MM-DD HH:mm。
// 本包 vitest 仅收集 `src/**/*.test.tsx`，因此纯函数测试也使用 .tsx 后缀。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatMarketingAmountMinor,
  formatMarketingInteger,
  formatMarketingPercent,
  formatMarketingRateBp,
  formatMarketingTimestamp,
  marketingTimestampTitle,
  readMarketingProblemTraceId,
  readPromotionStockQuantity,
  readPromotionStockReconciliation,
} from './marketingService';

function expectLocalDateTime(iso: string, locale = 'en'): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('formatMarketingAmountMinor', () => {
  it('converts integer minor units to a two-decimal major amount', () => {
    expect(formatMarketingAmountMinor('500', 'CNY', 'en')).toBe('5.00 CNY');
    expect(formatMarketingAmountMinor('0', 'CNY', 'en')).toBe('0.00 CNY');
    expect(formatMarketingAmountMinor('5', 'CNY', 'en')).toBe('0.05 CNY');
    expect(formatMarketingAmountMinor('2500000', 'USD', 'en')).toBe('25,000.00 USD');
  });

  it('keeps int64 values above 2^53 exact', () => {
    expect(formatMarketingAmountMinor('9007199254740993', 'CNY', 'en'))
      .toBe('90,071,992,547,409.93 CNY');
  });

  it('accepts an explicit plus sign and negative minor units', () => {
    expect(formatMarketingAmountMinor('+250', 'CNY', 'en')).toBe('2.50 CNY');
    expect(formatMarketingAmountMinor('-250', 'CNY', 'en')).toBe('-2.50 CNY');
  });

  it('never divides a major-looking string by 100', () => {
    expect(formatMarketingAmountMinor('5.00', 'CNY', 'en')).toBe('5.00 CNY');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('"5.00"');

    expect(formatMarketingAmountMinor('5.5', 'CNY', 'en')).toBe('5.5 CNY');
    expect(String(warnSpy.mock.calls[1]?.[0])).toContain('100x');
  });

  it('renders non-numeric text as-is with the currency instead of a dash', () => {
    expect(formatMarketingAmountMinor('n/a', 'EUR', 'en')).toBe('n/a EUR');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('renders an em dash for empty values', () => {
    expect(formatMarketingAmountMinor('', 'CNY', 'en')).toBe('—');
    expect(formatMarketingAmountMinor('   ', 'CNY', 'en')).toBe('—');
    expect(formatMarketingAmountMinor(undefined, 'CNY', 'en')).toBe('—');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to CNY when the currency is blank', () => {
    expect(formatMarketingAmountMinor('500', '', 'en')).toBe('5.00 CNY');
  });
});

describe('formatMarketingInteger', () => {
  it('groups thousands for int64 wire strings and creates no dash for integers', () => {
    expect(formatMarketingInteger('1234567')).toBe('1,234,567');
    expect(formatMarketingInteger('9007199254740993')).toBe('9,007,199,254,740,993');
    expect(formatMarketingInteger(42)).toBe('42');
  });

  it('renders an em dash for empty or invalid values', () => {
    expect(formatMarketingInteger(null)).toBe('—');
    expect(formatMarketingInteger(undefined)).toBe('—');
    expect(formatMarketingInteger('')).toBe('—');
    expect(formatMarketingInteger('   ')).toBe('—');
    expect(formatMarketingInteger('5.5')).toBe('—');
    expect(formatMarketingInteger('abc')).toBe('—');
    expect(formatMarketingInteger(Number.NaN)).toBe('—');
  });

  it('renders infinity when the caller knows the stock is unlimited', () => {
    expect(formatMarketingInteger('0', { unlimited: true })).toBe('∞');
  });
});

describe('formatMarketingPercent', () => {
  it('renders one decimal plus a percent sign', () => {
    expect(formatMarketingPercent(85.67)).toBe('85.7%');
    expect(formatMarketingPercent('0')).toBe('0.0%');
    expect(formatMarketingPercent('100')).toBe('100.0%');
  });

  it('renders an em dash for empty or invalid values', () => {
    expect(formatMarketingPercent(null)).toBe('—');
    expect(formatMarketingPercent('')).toBe('—');
    expect(formatMarketingPercent('n/a')).toBe('—');
  });
});

describe('formatMarketingRateBp', () => {
  it('converts integer basis points to one-decimal percentages', () => {
    expect(formatMarketingRateBp('3750')).toBe('37.5%');
    expect(formatMarketingRateBp('0')).toBe('0.0%');
    expect(formatMarketingRateBp('10000')).toBe('100.0%');
    expect(formatMarketingRateBp('9')).toBe('0.1%');
    expect(formatMarketingRateBp('9999')).toBe('100.0%');
  });

  it('never produces NaN or Infinity for a zero denominator value', () => {
    expect(formatMarketingRateBp(0)).toBe('0.0%');
    expect(formatMarketingRateBp('0')).not.toMatch(/NaN|Infinity/u);
  });

  it('renders an em dash for empty or non-integer values', () => {
    expect(formatMarketingRateBp(null)).toBe('—');
    expect(formatMarketingRateBp(undefined)).toBe('—');
    expect(formatMarketingRateBp('')).toBe('—');
    expect(formatMarketingRateBp('37.5')).toBe('—');
    expect(formatMarketingRateBp('-10')).toBe('—');
    expect(formatMarketingRateBp('n/a')).toBe('—');
  });
});

describe('formatMarketingTimestamp', () => {
  it('parses RFC 3339 and renders local YYYY-MM-DD HH:mm', () => {
    expect(formatMarketingTimestamp('2026-11-10T09:12:00.000Z', 'en'))
      .toBe(expectLocalDateTime('2026-11-10T09:12:00.000Z'));
  });

  it('parses the backend CAST space form as local wall time', () => {
    expect(formatMarketingTimestamp('2026-11-10 09:12:00', 'en')).toBe('2026-11-10 09:12');
  });

  it('parses an offset form', () => {
    expect(formatMarketingTimestamp('2026-11-10T09:12:00+08:00', 'en'))
      .toBe(expectLocalDateTime('2026-11-10T09:12:00+08:00'));
    expect(formatMarketingTimestamp('2026-11-10 09:12:00+00', 'en'))
      .toBe(expectLocalDateTime('2026-11-10T09:12:00+00:00'));
  });

  it('returns the raw text for unparseable input, never Invalid Date', () => {
    expect(formatMarketingTimestamp('not-a-date', 'en')).toBe('not-a-date');
    expect(formatMarketingTimestamp('2026-13-45T99:99:99Z', 'en')).toBe('2026-13-45T99:99:99Z');
  });

  it('renders an em dash for empty values', () => {
    expect(formatMarketingTimestamp('', 'en')).toBe('—');
    expect(formatMarketingTimestamp('   ', 'en')).toBe('—');
    expect(formatMarketingTimestamp(null, 'en')).toBe('—');
  });

  it('exposes the raw value as the hover title', () => {
    expect(marketingTimestampTitle('2026-11-10T09:12:00.000Z')).toBe('2026-11-10T09:12:00.000Z');
    expect(marketingTimestampTitle('  ')).toBeUndefined();
  });
});

describe('promotion stock reconciliation', () => {
  const stock = {
    id: '11',
    stockType: 'limited',
    totalQuantity: '1000',
    availableQuantity: '930',
    claimedQuantity: '40',
    redeemedQuantity: '30',
    lockedQuantity: '2',
  };

  it('reads every reconciliation counter', () => {
    const values = readPromotionStockReconciliation(stock);

    expect(values.unlimited).toBe(false);
    expect(values.issued.raw).toBe('1000');
    expect(values.available.raw).toBe('930');
    expect(values.claimed.raw).toBe('40');
    expect(values.redeemed.raw).toBe('30');
    expect(values.locked.raw).toBe('2');
    expect(values.drift).toBe(false);
  });

  it('flags drift when available + claimed + redeemed does not reconcile with total', () => {
    const values = readPromotionStockReconciliation({ ...stock, availableQuantity: '900' });

    expect(values.drift).toBe(true);
  });

  it('treats the unlimited pool (total 0 + stock_type unlimited) as infinite, not empty', () => {
    const unlimitedStock = {
      id: '12',
      stockType: 'unlimited',
      totalQuantity: '0',
      availableQuantity: '0',
      claimedQuantity: '7',
      redeemedQuantity: '5',
      lockedQuantity: '0',
    };
    const values = readPromotionStockReconciliation(unlimitedStock);
    const quantity = readPromotionStockQuantity(unlimitedStock, 'totalQuantity');

    expect(values.unlimited).toBe(true);
    expect(values.drift).toBe(false);
    expect(quantity.unlimited).toBe(true);
    expect(formatMarketingInteger(quantity.raw, { unlimited: quantity.unlimited })).toBe('∞');
  });

  it('does not report drift when a counter is missing', () => {
    const values = readPromotionStockReconciliation({
      id: '13',
      stockType: 'limited',
      totalQuantity: '1000',
      availableQuantity: '930',
    });

    expect(values.claimed.raw).toBeNull();
    expect(values.drift).toBe(false);
  });
});

describe('readMarketingProblemTraceId', () => {
  it('reads the problem traceId and its snake_case variant', () => {
    expect(readMarketingProblemTraceId({ problem: { traceId: 'trace-1' } })).toBe('trace-1');
    expect(readMarketingProblemTraceId({ problem: { trace_id: 'trace-2' } })).toBe('trace-2');
    expect(readMarketingProblemTraceId({ traceId: 'trace-3' })).toBe('trace-3');
  });

  it('returns null when there is no trace id', () => {
    expect(readMarketingProblemTraceId(new Error('boom'))).toBeNull();
    expect(readMarketingProblemTraceId({ problem: {} })).toBeNull();
    expect(readMarketingProblemTraceId(null)).toBeNull();
  });
});
