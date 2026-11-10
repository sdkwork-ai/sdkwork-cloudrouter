// 奖励状态契约（设计规范 §2.6）: granted 成功、pending 信息、rejected/failed/
// cancelled 危险、expired 中性；未知值不得被猜成 Pending，必须原样展示为 slate。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingService } from '../marketingService';
import { ReferralRelationsPage } from './ReferralRelationsPage';

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

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return {
    ...actual,
    MarketingService: { fetchReferralRelations: vi.fn() },
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '7', totalPages: '1', hasMore: false };

function relation(id: string, rewardStatus: string) {
  return {
    id,
    inviter: `inviter-${id}`,
    invitee: `invitee-${id}`,
    inviteCode: `CODE-${id}`,
    source: 'invite',
    rewardStatus,
    claimedAt: '2026-11-10 09:12:00',
  };
}

beforeEach(() => {
  vi.mocked(MarketingService.fetchReferralRelations).mockResolvedValue({
    items: [
      relation('1', 'granted'),
      relation('2', 'pending'),
      relation('3', 'rejected'),
      relation('4', 'failed'),
      relation('5', 'cancelled'),
      relation('6', 'expired'),
      relation('7', 'mystery'),
    ],
    pageInfo,
  } as never);
});

afterEach(cleanup);

describe('ReferralRelationsPage reward status mapping', () => {
  it('renders each reward status with its own semantic tone instead of mapping everything to Pending', async () => {
    render(<ReferralRelationsPage />);

    expect(await screen.findByText('Granted')).toHaveClass('bg-emerald-50');
    expect(screen.getByText('Pending')).toHaveClass('bg-sky-50');
    expect(screen.getByText('Rejected')).toHaveClass('bg-red-50');
    expect(screen.getByText('Failed')).toHaveClass('bg-red-50');
    expect(screen.getByText('Cancelled')).toHaveClass('bg-red-50');
    expect(screen.getByText('Expired')).toHaveClass('bg-slate-100');
    expect(screen.getByText('mystery')).toHaveClass('bg-slate-100');
    expect(screen.queryByText('Bound At')).not.toBeInTheDocument();
  });

  it('labels the claimedAt column accurately as Claimed At', async () => {
    render(<ReferralRelationsPage />);

    expect(await screen.findByRole('columnheader', { name: 'Claimed At' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Bound At' })).not.toBeInTheDocument();
  });
});
