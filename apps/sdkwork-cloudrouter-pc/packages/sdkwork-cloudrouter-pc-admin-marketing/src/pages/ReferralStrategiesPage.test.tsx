// 枚举标签化（#U12/#4）：rewardType/rewardTarget/triggerEvent 必须走 i18n 词表，
// 不得把 POINTS/INVITER/REGISTER 这类原始枚举直接展示。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingService } from '../marketingService';
import { ReferralStrategiesPage } from './ReferralStrategiesPage';

vi.mock('react-i18next', () => {
  const dictionary: Record<string, string> = {
    'admin.marketing.referralStrategies.rewardType.points': 'Compute Credits',
    'admin.marketing.referralStrategies.rewardTarget.inviter': 'Inviter',
    'admin.marketing.referralStrategies.triggerEvent.REGISTER': 'Successful registration',
  };
  const translate = (key: string, fallback?: string, options?: Record<string, unknown>): string => {
    const template = dictionary[key] ?? (typeof fallback === 'string' ? fallback : key);
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
    MarketingService: { fetchReferralStrategies: vi.fn() },
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '1', totalPages: '1', hasMore: false };

beforeEach(() => {
  vi.mocked(MarketingService.fetchReferralStrategies).mockResolvedValue({
    items: [{
      id: 's1',
      name: 'Invite Bonus',
      description: 'Invite a friend',
      status: 'active',
      rewardType: 'POINTS',
      rewardValue: '200',
      rewardTarget: 'INVITER',
      triggerEvent: 'REGISTER',
      maxRewardsPerInviter: '0',
      startsAt: '2026-11-01T00:00:00Z',
      endsAt: '2026-12-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    }],
    pageInfo,
  } as never);
});

afterEach(cleanup);

describe('ReferralStrategiesPage enum labels', () => {
  it('renders reward type, target, and trigger through the i18n enum vocabulary', async () => {
    render(<ReferralStrategiesPage />);

    expect(await screen.findByText('Compute Credits')).toBeInTheDocument();
    expect(screen.getByText('Inviter')).toBeInTheDocument();
    expect(screen.getByText('Successful registration')).toBeInTheDocument();
    expect(screen.queryByText('POINTS')).not.toBeInTheDocument();
    expect(screen.queryByText('INVITER')).not.toBeInTheDocument();
    expect(screen.queryByText('REGISTER')).not.toBeInTheDocument();
  });
});
