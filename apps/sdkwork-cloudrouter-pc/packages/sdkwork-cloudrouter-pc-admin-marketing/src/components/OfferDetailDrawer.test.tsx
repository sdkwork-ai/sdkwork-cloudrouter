// 金额/币种契约（设计规范 §2.8 / V5）：现金券按 offer 自身 currencyCode 标注，
// 不再硬编码 CNY；Token Bank 额度必须带单位；minimumAmount 只在可解析为小数时
// 按金额展示，否则原样展示并给出说明，空值一律 —。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retrievePromotionOffer } from '../marketingService';
import { OfferDetailDrawer } from './OfferDetailDrawer';

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
  usePromotionReferences: () => ({ offerNames: {}, stockNames: {}, stockByOffer: {} }),
}));

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return { ...actual, retrievePromotionOffer: vi.fn() };
});

const baseOffer = {
  id: 'o1',
  offerNo: 'OF-1',
  displayName: 'Cash Coupon',
  offerType: 'COUPON',
  audienceScope: 'ALL',
  combinability: 'EXCLUSIVE',
  goodsScope: 'ALL',
  priority: 100,
  status: 'active',
  version: 1,
  startsAt: '2026-11-01T00:00:00Z',
  endsAt: '2026-12-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  currencyCode: 'USD',
  discountType: 'FIXED',
  discountValue: '3',
  minimumAmount: '100.5',
  couponBenefit: { kind: 'cash_credit', grantAmount: '500' },
};

function mockOffer(record: Record<string, unknown>): void {
  vi.mocked(retrievePromotionOffer).mockResolvedValue(record as never);
}

beforeEach(() => {
  vi.mocked(retrievePromotionOffer).mockReset();
});

afterEach(cleanup);

describe('OfferDetailDrawer money labels', () => {
  it('labels the cash grant with the offer currency instead of a hard-coded CNY', async () => {
    mockOffer(baseOffer);
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Grant Amount (USD)')).toBeInTheDocument();
    expect(screen.getByText('5.00 USD')).toBeInTheDocument();
    expect(screen.queryByText(/CNY/u)).not.toBeInTheDocument();
  });

  it('falls back to the localised currency-unknown label when the offer has no currency', async () => {
    mockOffer({ ...baseOffer, currencyCode: '' });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Grant Amount (Currency unknown)')).toBeInTheDocument();
    expect(screen.queryByText(/CNY/u)).not.toBeInTheDocument();
  });

  it('adds an explicit Token Bank credit unit to grant and bonus amounts', async () => {
    mockOffer({
      ...baseOffer,
      currencyCode: 'CNY',
      couponBenefit: { grantAmount: '1000', bonusAmount: '250' },
    });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Grant Amount (Token Bank credits)')).toBeInTheDocument();
    expect(screen.getByText('Bonus Amount (Token Bank credits)')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('formats a decimal minimum amount as money in the offer currency', async () => {
    mockOffer(baseOffer);
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('100.50 USD')).toBeInTheDocument();
  });

  it('shows an unparseable minimum amount as received, with a muted explanation title', async () => {
    mockOffer({ ...baseOffer, minimumAmount: 'ten' });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    const raw = await screen.findByText('ten');
    expect(raw).toHaveAttribute('title', 'Raw value: not a decimal amount, shown exactly as received.');
    expect(raw).toHaveClass('text-slate-500');
  });

  it('renders an em dash rather than a hyphen when the minimum amount is empty', async () => {
    mockOffer({ ...baseOffer, minimumAmount: undefined });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    const label = await screen.findByText('Minimum Amount');
    expect(label.nextElementSibling).toHaveTextContent('—');
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });
});

describe('OfferDetailDrawer discount terms', () => {
  it('renders the FIXED amount off and minimum order amount with the offer currency', async () => {
    mockOffer({
      ...baseOffer,
      discountType: 'FIXED',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: null,
    });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Discount terms')).toBeInTheDocument();
    expect(screen.getByText('Fixed amount off')).toBeInTheDocument();
    expect(screen.getByText('Discount amount')).toBeInTheDocument();
    expect(screen.getByText('12.50 USD')).toBeInTheDocument();
    expect(screen.getByText('100.00 USD')).toBeInTheDocument();
    expect(screen.queryByText('Maximum Discount Amount')).not.toBeInTheDocument();
  });

  it('renders the PERCENTAGE value, minimum, and cap', async () => {
    mockOffer({
      ...baseOffer,
      discountType: 'PERCENTAGE',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Discount terms')).toBeInTheDocument();
    expect(screen.getByText('Percentage off')).toBeInTheDocument();
    expect(screen.getByText('Discount percentage')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('100.00 USD')).toBeInTheDocument();
    expect(screen.getByText('Maximum Discount Amount')).toBeInTheDocument();
    expect(screen.getByText('20.00 USD')).toBeInTheDocument();
  });

  it('adds nothing extra for a benefit-only NONE coupon', async () => {
    mockOffer({ ...baseOffer, discountType: 'NONE' });
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} />);

    expect(await screen.findByText('Basic Information')).toBeInTheDocument();
    expect(screen.queryByText('Discount terms')).not.toBeInTheDocument();
    expect(screen.queryByText('Discount amount')).not.toBeInTheDocument();
    expect(screen.queryByText('Minimum Amount')).not.toBeInTheDocument();
  });
});

describe('OfferDetailDrawer edit entry point', () => {
  it('hands the loaded offer id to the page edit flow instead of duplicating it', async () => {
    mockOffer(baseOffer);
    const onEdit = vi.fn<(offerId: string) => void>();
    render(<OfferDetailDrawer offerId="o1" onClose={() => undefined} onEdit={onEdit} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith('o1');
  });
});
