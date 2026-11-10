// 分页契约：后端按 API_SPEC §13.6 把 int64 序列化为十进制字符串，
// 分页计数必须先解析再判断，满页的最后一页不能显示“下一页”。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test

import { describe, expect, it } from 'vitest';
import {
  hasNextMarketingPage,
  marketingPageLabel,
  parseMarketingPageNumber,
  readMarketingPageInfoNumber,
} from './MarketingPageControls';

const translate = (key: string, fallback: string, options?: Record<string, unknown>): string =>
  options ? `${key}|${JSON.stringify(options)}` : fallback;

describe('parseMarketingPageNumber', () => {
  it('parses int64 wire strings', () => {
    expect(parseMarketingPageNumber('120')).toBe(120);
    expect(parseMarketingPageNumber(' 007 ')).toBe(7);
    expect(parseMarketingPageNumber('0')).toBe(0);
  });

  it('parses numbers that are already integers', () => {
    expect(parseMarketingPageNumber(120)).toBe(120);
    expect(parseMarketingPageNumber(0)).toBe(0);
  });

  it('returns null for missing or non-numeric values', () => {
    expect(parseMarketingPageNumber(undefined)).toBeNull();
    expect(parseMarketingPageNumber(null)).toBeNull();
    expect(parseMarketingPageNumber('')).toBeNull();
    expect(parseMarketingPageNumber('   ')).toBeNull();
    expect(parseMarketingPageNumber('12.5')).toBeNull();
    expect(parseMarketingPageNumber('12abc')).toBeNull();
    expect(parseMarketingPageNumber('-3')).toBeNull();
    expect(parseMarketingPageNumber(Number.NaN)).toBeNull();
    expect(parseMarketingPageNumber(1.5)).toBeNull();
  });

  it('refuses integers outside the safe range', () => {
    expect(parseMarketingPageNumber('9007199254740993')).toBeNull();
    expect(parseMarketingPageNumber(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });
});

describe('readMarketingPageInfoNumber', () => {
  it('reads string and number pageInfo values', () => {
    expect(readMarketingPageInfoNumber({ totalPages: '50' }, 'totalPages')).toBe(50);
    expect(readMarketingPageInfoNumber({ totalItems: 5000 }, 'totalItems')).toBe(5000);
  });

  it('treats a missing key or an unsupported value type as unknown', () => {
    expect(readMarketingPageInfoNumber(null, 'totalPages')).toBeNull();
    expect(readMarketingPageInfoNumber({}, 'totalPages')).toBeNull();
    expect(readMarketingPageInfoNumber({ totalPages: true }, 'totalPages')).toBeNull();
    expect(readMarketingPageInfoNumber({ totalPages: {} }, 'totalPages')).toBeNull();
  });
});

describe('hasNextMarketingPage', () => {
  it('does not show Next on a full last page when totalPages is a wire string', () => {
    const pageInfo = { page: '3', totalPages: '3', totalItems: '250', hasMore: false };

    expect(hasNextMarketingPage(pageInfo, 3, 100, 100)).toBe(false);
  });

  it('uses the parsed totalPages instead of the full-page heuristic', () => {
    expect(hasNextMarketingPage({ totalPages: '3' }, 1, 100, 100)).toBe(true);
    expect(hasNextMarketingPage({ totalPages: '3' }, 2, 100, 100)).toBe(true);
    expect(hasNextMarketingPage({ totalPages: '3' }, 3, 100, 100)).toBe(false);
    expect(hasNextMarketingPage({ totalPages: 1 }, 1, 20, 20)).toBe(false);
  });

  it('prefers an explicit hasMore flag when the backend sends one', () => {
    expect(hasNextMarketingPage({ hasMore: false, totalPages: '9' }, 1, 100, 100)).toBe(false);
    expect(hasNextMarketingPage({ hasMore: true, totalPages: '1' }, 1, 20, 20)).toBe(true);
  });

  it('falls back to the full-page heuristic only when totalPages is unavailable', () => {
    expect(hasNextMarketingPage({}, 1, 19, 20)).toBe(false);
    expect(hasNextMarketingPage({}, 1, 20, 20)).toBe(true);
    expect(hasNextMarketingPage({ totalPages: 'not-a-number' }, 1, 20, 20)).toBe(true);
  });
});

describe('marketingPageLabel', () => {
  it('shows page and total pages once the int64 string is parsed', () => {
    expect(marketingPageLabel(translate, 2, { totalPages: '50', totalItems: '5000' }))
      .toBe('admin.marketing.pagination.pageOfTotal|{"page":2,"totalPages":50}');
  });

  it('falls back to a bare page label when totalPages is missing', () => {
    expect(marketingPageLabel(translate, 2, { totalItems: '5000' }))
      .toBe('admin.marketing.pagination.page|{"page":2}');
  });
});
