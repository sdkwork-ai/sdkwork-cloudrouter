// 死搜索契约（#U8）：`billing.referralStats.list` 的生成 SDK 只有 page/pageSize，
// 没有 q；因此页面不得渲染搜索框，也不得向下传 q。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingService } from '../marketingService';
import { ReferralsPage } from './ReferralsPage';

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
    MarketingService: { fetchReferralStats: vi.fn() },
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '1', totalPages: '1', hasMore: false };

beforeEach(() => {
  vi.mocked(MarketingService.fetchReferralStats).mockReset();
  vi.mocked(MarketingService.fetchReferralStats).mockResolvedValue({
    items: [{
      id: '1',
      inviter: 'alice',
      totalInvited: '1234',
      totalRevenue: '99.00',
      bonusAwarded: '10.00',
      link: 'https://example.com/i/1',
    }],
    pageInfo,
  } as never);
});

afterEach(cleanup);

describe('ReferralsPage unsupported search', () => {
  it('does not render a search control and never sends q to referralStats.list', async () => {
    render(<ReferralsPage />);

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search by inviter')).not.toBeInTheDocument();

    await waitFor(() => expect(MarketingService.fetchReferralStats).toHaveBeenCalled());
    expect(MarketingService.fetchReferralStats).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    const firstCall = vi.mocked(MarketingService.fetchReferralStats).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall).not.toHaveProperty('q');
  });

  it('formats the invited count with thousands separators in a numeric column', async () => {
    render(<ReferralsPage />);

    const cell = await screen.findByText('1,234');
    expect(cell).toHaveClass('text-right');
    expect(cell).toHaveClass('tabular-nums');
  });
});
