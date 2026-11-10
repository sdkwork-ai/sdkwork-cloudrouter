// 库存对账契约（设计规范 §2.8 / §3）：每行展示 issued/claimed/redeemed/available/locked，
// available + claimed + redeemed 与 total 不一致时给出漂移提示；无限库存总量展示 ∞；
// 引用名称取不到时只显示弱化且截断的裸 id。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendPromotionCouponStocksList } from '../marketingService';
import { CouponStocksPage } from './CouponStocksPage';

vi.mock('react-i18next', () => {
  const translate = (key: string, fallback?: string, options?: Record<string, unknown>): string => {
    const template = typeof fallback === 'string' ? fallback : key;
    return Object.entries(options ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) };
});

vi.mock('../usePromotionReferences', () => ({
  usePromotionReferences: () => ({
    offerNames: { o1: 'Spring Coupon' },
    offerCurrencies: { o1: 'CNY' },
    stockNames: {},
    stockByOffer: {},
  }),
}));

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return { ...actual, backendPromotionCouponStocksList: vi.fn() };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '3', totalPages: '1', hasMore: false };

const stocks = [
  {
    id: 's1',
    stockNo: 'ST-1',
    offerId: 'o1',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '1000',
    availableQuantity: '930',
    claimedQuantity: '40',
    redeemedQuantity: '30',
    lockedQuantity: '2',
    status: 'active',
  },
  {
    id: 's2',
    stockNo: 'ST-2',
    offerId: 'o-missing',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '1000',
    availableQuantity: '900',
    claimedQuantity: '40',
    redeemedQuantity: '30',
    lockedQuantity: '2',
    status: 'active',
  },
  {
    id: 's3',
    stockNo: 'ST-3',
    offerId: 'o1',
    stockType: 'unlimited',
    codeIssueMode: 'realtime',
    totalQuantity: '0',
    availableQuantity: '0',
    claimedQuantity: '7',
    redeemedQuantity: '5',
    lockedQuantity: '0',
    status: 'active',
  },
];

beforeEach(() => {
  vi.mocked(backendPromotionCouponStocksList).mockResolvedValue({ items: stocks, pageInfo } as never);
});

afterEach(cleanup);

describe('CouponStocksPage reconciliation', () => {
  it('renders every reconciliation counter for each row', async () => {
    render(<CouponStocksPage />);

    expect(await screen.findByText('ST-1')).toBeInTheDocument();
    expect(screen.getAllByText('Issued')).toHaveLength(3);
    expect(screen.getAllByText('Claimed')).toHaveLength(3);
    expect(screen.getAllByText('Redeemed')).toHaveLength(3);
    expect(screen.getAllByText('Available')).toHaveLength(3);
    expect(screen.getAllByText('Locked')).toHaveLength(3);
  });

  it('shows the issued total once per limited row and infinity for the unlimited pool', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-1');

    expect(screen.getAllByText('1,000')).toHaveLength(2);
    expect(screen.getAllByText('∞')).toHaveLength(1);
  });

  it('flags drift on the row where available + claimed + redeemed does not equal total', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-1');

    expect(screen.getAllByText('Drift')).toHaveLength(1);
    const driftRow = screen.getByText('Drift').closest('tr');
    expect(driftRow).not.toBeNull();
    expect(within(driftRow as HTMLElement).getByText('ST-2')).toBeInTheDocument();
  });

  it('keeps counting claimed coupons on an unlimited pool instead of showing infinity', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-3');

    const unlimitedRow = screen.getByText('ST-3').closest('tr') as HTMLElement;
    expect(within(unlimitedRow).getByText('7')).toBeInTheDocument();
    expect(within(unlimitedRow).getByText('5')).toBeInTheDocument();
  });

  it('resolves offer names and shows a muted, truncated raw id fallback', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-1');

    expect(screen.getAllByText('Spring Coupon')).toHaveLength(2);
    const fallback = screen.getByText('o-missing');
    expect(fallback).toHaveClass('text-slate-400');
    expect(fallback).toHaveClass('truncate');
    expect(fallback).toHaveAttribute('title', 'Unresolved offer reference: o-missing');
  });
});

/**
 * 预算可见性契约（设计规范 §2.8）：库存带预算时展示 total/available/reserved/used
 * 与 `used / total` 使用率；没有预算账户时**不渲染**预算块（不是显示 0）；
 * `used + reserved > total` 的防御性场景显示错误态而不是越界进度条。
 */
const budgetedStocks = [
  {
    id: 'b1',
    stockNo: 'ST-B1',
    offerId: 'o1',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '1000',
    availableQuantity: '500',
    claimedQuantity: '200',
    redeemedQuantity: '300',
    lockedQuantity: '0',
    status: 'active',
    budgetAmountMinor: '500000',
    budgetAvailableMinor: '200000',
    budgetReservedMinor: '100000',
    budgetUsedMinor: '200000',
  },
  {
    id: 'b2',
    stockNo: 'ST-B2',
    offerId: 'o1',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '1000',
    availableQuantity: '500',
    claimedQuantity: '200',
    redeemedQuantity: '300',
    lockedQuantity: '0',
    status: 'active',
    budgetAmountMinor: null,
    budgetAvailableMinor: null,
    budgetReservedMinor: null,
    budgetUsedMinor: null,
  },
  {
    id: 'b3',
    stockNo: 'ST-B3',
    offerId: 'o1',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '1000',
    availableQuantity: '500',
    claimedQuantity: '200',
    redeemedQuantity: '300',
    lockedQuantity: '0',
    status: 'active',
    // 防御性：已用 + 已预留 (40000 + 80000) > 总额 (100000)，数据库约束下不应出现。
    budgetAmountMinor: '100000',
    budgetAvailableMinor: '0',
    budgetReservedMinor: '80000',
    budgetUsedMinor: '40000',
  },
];

function budgetRow(stockNo: string): HTMLElement {
  const row = screen.getByText(stockNo).closest('tr');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

describe('CouponStocksPage budget', () => {
  beforeEach(() => {
    vi.mocked(backendPromotionCouponStocksList).mockResolvedValue({
      items: budgetedStocks,
      pageInfo: { ...pageInfo, totalItems: '3' },
    } as never);
  });

  it('renders total, available, reserved, used and the utilization bar for a budgeted stock', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-B1');

    const row = budgetRow('ST-B1');
    expect(within(row).getByText('Total budget')).toBeInTheDocument();
    expect(within(row).getByText('5,000.00 CNY')).toBeInTheDocument();
    expect(within(row).getByText('Budget reserved')).toBeInTheDocument();
    expect(within(row).getByText('1,000.00 CNY')).toBeInTheDocument();
    // available 与 used 都是 200000（2,000.00 CNY）。
    expect(within(row).getAllByText('2,000.00 CNY')).toHaveLength(2);
    expect(within(row).getByText('Utilization 40.0%')).toBeInTheDocument();
    expect(within(row).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('renders no budget block at all when the stock has no budget account', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-B2');

    const row = budgetRow('ST-B2');
    expect(within(row).queryByText('Total budget')).not.toBeInTheDocument();
    expect(within(row).queryByText('Budget available')).not.toBeInTheDocument();
    expect(within(row).queryByRole('progressbar')).not.toBeInTheDocument();
    // 对账条仍然存在，且没有预算数字被误显示成 0。
    expect(within(row).getByText('Issued')).toBeInTheDocument();
  });

  it('shows an error state instead of a bar when used + reserved exceeds the total', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-B3');

    const row = budgetRow('ST-B3');
    expect(within(row).getByRole('alert')).toHaveTextContent(
      'Over-committed: used + reserved exceeds the total budget',
    );
    expect(within(row).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(row).queryByText(/Utilization/u)).not.toBeInTheDocument();
  });

  it('keeps the reconciliation drift indicator working on budgeted rows', async () => {
    render(<CouponStocksPage />);
    await screen.findByText('ST-B1');

    expect(within(budgetRow('ST-B1')).queryByText('Drift')).not.toBeInTheDocument();
  });
});
