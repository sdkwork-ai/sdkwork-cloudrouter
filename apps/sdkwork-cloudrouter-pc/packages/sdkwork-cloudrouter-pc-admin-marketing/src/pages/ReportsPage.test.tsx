// 经营报表页契约（设计规范 §2.2 / §2.8）：
// KPI 条（发放/领取/核销/过期+作废+停用、抵扣申请）、基点 → 一位小数百分比、
// 分币种金额表、热门优惠表、空态、窗口校验与服务端 400（可复制 traceId）。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendPromotionReport } from '../marketingService';
import { ReportsPage } from './ReportsPage';

vi.mock('react-i18next', () => {
  const translate = (
    key: string,
    fallbackOrOptions?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): string => {
    const resolvedOptions = typeof fallbackOrOptions === 'object' && fallbackOrOptions !== null
      ? fallbackOrOptions
      : options;
    const template = typeof fallbackOrOptions === 'string'
      ? fallbackOrOptions
      : typeof resolvedOptions?.['defaultValue'] === 'string'
        ? resolvedOptions['defaultValue']
        : key;
    return Object.entries(resolvedOptions ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) };
});

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return { ...actual, backendPromotionReport: vi.fn() };
});

const report = {
  from: '2026-09-01T00:00:00Z',
  to: '2026-09-30T23:59:59Z',
  counts: {
    issuedCodes: '10000',
    claimedCoupons: '3750',
    redeemedCoupons: '2500',
    expiredCoupons: '120',
    voidedCoupons: '30',
    disabledCodes: '10',
    applicationsApplied: '800',
    applicationsSettled: '600',
    applicationsReleased: '50',
  },
  rates: {
    claimRateBp: '3750',
    redemptionRateBp: '2500',
    voidRateBp: '300',
  },
  byCurrency: [
    {
      currencyCode: 'CNY',
      discountAppliedMinor: '1234500',
      discountSettledMinor: '1000000',
      budgetTotalMinor: '5000000',
      budgetReservedMinor: '250000',
      budgetUsedMinor: '2000000',
    },
    {
      currencyCode: 'USD',
      discountAppliedMinor: '2500',
      discountSettledMinor: '2000',
      budgetTotalMinor: '10000',
      budgetReservedMinor: '100',
      budgetUsedMinor: '5000',
    },
  ],
  topOffers: [
    {
      offerId: 'o1',
      offerNo: 'OF-1',
      displayName: 'Spring Coupon',
      redeemed: '1200',
      discountSettledMinor: '450000',
      currencyCode: 'CNY',
    },
  ],
};

const emptyReport = {
  ...report,
  counts: {
    issuedCodes: '0',
    claimedCoupons: '0',
    redeemedCoupons: '0',
    expiredCoupons: '0',
    voidedCoupons: '0',
    disabledCodes: '0',
    applicationsApplied: '0',
    applicationsSettled: '0',
    applicationsReleased: '0',
  },
  rates: { claimRateBp: '0', redemptionRateBp: '0', voidRateBp: '0' },
  byCurrency: [],
  topOffers: [],
};

function sectionOf(headingName: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: headingName });
  const section = heading.closest('section');
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

beforeEach(() => {
  vi.mocked(backendPromotionReport).mockReset();
  vi.mocked(backendPromotionReport).mockResolvedValue(report as never);
});

afterEach(cleanup);

describe('ReportsPage', () => {
  it('renders the KPI strips, rates, per-currency money, and top offers from the report', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Coupon Reports')).toBeInTheDocument();

    const counts = sectionOf('Codes and coupons');
    expect(counts).toHaveTextContent('Issued codes');
    expect(counts).toHaveTextContent('10,000');
    expect(counts).toHaveTextContent('Claimed coupons');
    expect(counts).toHaveTextContent('3,750');
    expect(counts).toHaveTextContent('Redeemed coupons');
    expect(counts).toHaveTextContent('2,500');
    // 过期 + 作废 + 停用 分组：显式标签 + 合计 + 明细。
    expect(counts).toHaveTextContent('Expired + voided + disabled');
    expect(counts).toHaveTextContent('160');
    expect(counts).toHaveTextContent('Expired 120 · Voided 30 · Disabled 10');

    const applications = sectionOf('Discount applications');
    expect(applications).toHaveTextContent('Applications applied');
    expect(applications).toHaveTextContent('800');
    expect(applications).toHaveTextContent('Applications settled');
    expect(applications).toHaveTextContent('600');
    expect(applications).toHaveTextContent('Applications released');
    expect(applications).toHaveTextContent('50');

    expect(screen.getByText('37.5%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText('3.0%')).toBeInTheDocument();
    expect(screen.getByText('of issued codes in the selected window')).toBeInTheDocument();

    const money = sectionOf('Money by currency');
    expect(money).toHaveTextContent('12,345.00 CNY');
    expect(money).toHaveTextContent('10,000.00 CNY');
    expect(money).toHaveTextContent('50,000.00 CNY');
    expect(money).toHaveTextContent('2,500.00 CNY');
    expect(money).toHaveTextContent('20,000.00 CNY');
    expect(money).toHaveTextContent('25.00 USD');
    expect(money).toHaveTextContent('100.00 USD');

    const topOffers = sectionOf('Top offers');
    expect(topOffers).toHaveTextContent('OF-1');
    expect(topOffers).toHaveTextContent('Spring Coupon');
    expect(topOffers).toHaveTextContent('1,200');
    expect(topOffers).toHaveTextContent('4,500.00 CNY');
  });

  it('renders basis points as one-decimal percentages, including 0 and 100%', async () => {
    vi.mocked(backendPromotionReport).mockResolvedValue({
      ...report,
      rates: { claimRateBp: '0', redemptionRateBp: '10000', voidRateBp: '3750' },
    } as never);

    render(<ReportsPage />);

    expect(await screen.findByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('37.5%')).toBeInTheDocument();
  });

  it('renders an empty state for each table when the window has no rows', async () => {
    vi.mocked(backendPromotionReport).mockResolvedValue({
      ...report,
      byCurrency: [],
      topOffers: [],
    } as never);

    render(<ReportsPage />);

    expect(await screen.findByText('No currency totals in this window')).toBeInTheDocument();
    expect(screen.getByText('No redeemed offers in this window')).toBeInTheDocument();
    // 计数仍非零 → 页面级“无数据”空态不出现。
    expect(screen.queryByText('No data in this window')).not.toBeInTheDocument();
  });

  it('shows the explicit no-data state when the whole window is empty', async () => {
    vi.mocked(backendPromotionReport).mockResolvedValue(emptyReport as never);

    render(<ReportsPage />);

    expect(await screen.findByText('No data in this window')).toBeInTheDocument();
    expect(screen.queryByText('Issued codes')).not.toBeInTheDocument();
  });

  it('blocks a from > to submission client-side without calling the service again', async () => {
    render(<ReportsPage />);
    await screen.findByText('Coupon Reports');
    await waitFor(() => expect(backendPromotionReport).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-30T18:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01T08:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The start time must be on or before the end time.',
    );
    expect(backendPromotionReport).toHaveBeenCalledTimes(1);
  });

  it('surfaces a server 400 problem message with its traceId, then retries', async () => {
    vi.mocked(backendPromotionReport)
      .mockRejectedValueOnce({
        problem: { code: 400, detail: 'from must not be after to', traceId: 'trace-400' },
      })
      .mockResolvedValueOnce(report as never);

    render(<ReportsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('from must not be after to');
    expect(alert).toHaveTextContent('trace-400');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Issued codes')).toBeInTheDocument();
    expect(screen.queryByText('from must not be after to')).not.toBeInTheDocument();
  });

  it('sends from/to to the service as RFC 3339 strings converted from datetime-local', async () => {
    render(<ReportsPage />);
    await screen.findByText('Coupon Reports');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01T08:30' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30T18:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(backendPromotionReport).toHaveBeenLastCalledWith({
        from: new Date('2026-09-01T08:30').toISOString(),
        to: new Date('2026-09-30T18:00').toISOString(),
      });
    });
    expect(new Date('2026-09-01T08:30').toISOString()).toMatch(/Z$/u);
  });
});
