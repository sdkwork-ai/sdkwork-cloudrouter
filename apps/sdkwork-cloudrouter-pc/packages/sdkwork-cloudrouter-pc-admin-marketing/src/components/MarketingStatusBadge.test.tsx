// 状态徽标语义契约（设计规范 §2.6）：颜色由「域 + 值」共同决定，未知值回退
// slate 并展示原始值；徽标必须始终带文字（颜色不是唯一信号）。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MarketingBatchStatusBadge,
  MarketingStatusBadge,
  marketingStatusTone,
} from './MarketingValueBadge';

const catalog: Record<string, string> = {
  'admin.marketing.promotions.status.active': 'Active',
  'admin.marketing.promotions.status.inactive': 'Inactive',
  'admin.marketing.enums.codeBatchStatus.generating': 'Generating',
  'admin.marketing.enums.codeBatchStatus.ready': 'Ready',
  'admin.marketing.enums.codeBatchStatus.failed': 'Failed',
  'admin.marketing.enums.userCouponStatus.claimed': 'Claimed',
  'admin.marketing.enums.userCouponStatus.redeemed': 'Redeemed',
  'admin.marketing.enums.userCouponStatus.expired': 'Expired',
  'admin.marketing.enums.userCouponStatus.voided': 'Voided',
  'admin.marketing.enums.applicationStatus.applied': 'Applied',
  'admin.marketing.enums.applicationStatus.settled': 'Settled',
  'admin.marketing.enums.applicationStatus.released': 'Released',
  'admin.marketing.enums.applicationStatus.rolled_back': 'Rolled Back',
};

vi.mock('react-i18next', () => {
  const translate = (key: string, fallback?: string): string => catalog[key] ?? fallback ?? key;
  return { useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) };
});

afterEach(cleanup);

describe('marketingStatusTone', () => {
  it('maps offer/stock/code lifecycle values by domain', () => {
    expect(marketingStatusTone('offer', 'active')).toBe('success');
    expect(marketingStatusTone('stock', 'active')).toBe('success');
    expect(marketingStatusTone('code', 'disabled')).toBe('default');
  });

  it('maps code batch values to sky / emerald / red', () => {
    expect(marketingStatusTone('codeBatch', 'generating')).toBe('info');
    expect(marketingStatusTone('codeBatch', 'ready')).toBe('success');
    expect(marketingStatusTone('codeBatch', 'failed')).toBe('danger');
  });

  it('maps user coupon values without reusing the same colour for available and used', () => {
    expect(marketingStatusTone('userCoupon', 'claimed')).toBe('info');
    expect(marketingStatusTone('userCoupon', 'redeemed')).toBe('success');
    expect(marketingStatusTone('userCoupon', 'expired')).toBe('default');
    expect(marketingStatusTone('userCoupon', 'voided')).toBe('danger');
    expect(marketingStatusTone('userCoupon', 'cancelled')).toBe('danger');
  });

  it('maps discount application values to sky / emerald / slate / amber', () => {
    expect(marketingStatusTone('application', 'applied')).toBe('info');
    expect(marketingStatusTone('application', 'settled')).toBe('success');
    expect(marketingStatusTone('application', 'released')).toBe('default');
    expect(marketingStatusTone('application', 'rolled_back')).toBe('warning');
  });

  it('falls back to slate for unknown values', () => {
    expect(marketingStatusTone('offer', 'mystery')).toBe('default');
    expect(marketingStatusTone('userCoupon', 'nope')).toBe('default');
    expect(marketingStatusTone('application', '')).toBe('default');
  });
});

describe('MarketingStatusBadge', () => {
  it('renders domain-coloured text for a claimed user coupon', () => {
    render(<MarketingStatusBadge status="claimed" domain="userCoupon" />);

    expect(screen.getByText('Claimed')).toHaveClass('bg-sky-50');
  });

  it('renders a redeemed user coupon in emerald, never colour-only', () => {
    render(<MarketingStatusBadge status="redeemed" domain="userCoupon" />);

    const badge = screen.getByText('Redeemed');
    expect(badge).toHaveClass('bg-emerald-50');
    expect(badge.textContent).not.toBe('');
  });

  it('renders a failed code batch in red', () => {
    render(<MarketingStatusBadge status="failed" domain="codeBatch" />);

    expect(screen.getByText('Failed')).toHaveClass('bg-red-50');
  });

  it('renders a generating code batch in sky, not amber', () => {
    render(<MarketingStatusBadge status="generating" domain="codeBatch" />);

    expect(screen.getByText('Generating')).toHaveClass('bg-sky-50');
  });

  it('renders a rolled back application in amber', () => {
    render(<MarketingStatusBadge status="rolled_back" domain="application" />);

    expect(screen.getByText('Rolled Back')).toHaveClass('bg-amber-50');
  });

  it('renders an unknown value with the raw label in slate', () => {
    render(<MarketingStatusBadge status="mystery" domain="offer" />);

    const badge = screen.getByText('mystery');
    expect(badge).toHaveClass('bg-slate-100');
    expect(badge).toHaveAttribute('title', 'mystery');
  });

  it('never renders an empty badge for a missing value', () => {
    render(<MarketingStatusBadge status={undefined} domain="userCoupon" />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('honours explicit legacy labels only when the value matches', () => {
    render(
      <MarketingStatusBadge
        status="active"
        domain="offer"
        activeLabel="Enabled"
        inactiveLabel="Disabled"
      />,
    );

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('does not mislabel an unknown offer status as inactive', () => {
    render(
      <MarketingStatusBadge
        status="archived"
        domain="offer"
        activeLabel="Active"
        inactiveLabel="Inactive"
      />,
    );

    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  });
});

describe('MarketingBatchStatusBadge', () => {
  it('reuses the code batch domain mapping', () => {
    render(<MarketingBatchStatusBadge status="ready" />);

    expect(screen.getByText('Ready')).toHaveClass('bg-emerald-50');
  });

  it('renders the raw value for unrecognised batch states', () => {
    render(<MarketingBatchStatusBadge status="weird" />);

    expect(screen.getByText('weird')).toBeInTheDocument();
  });
});
