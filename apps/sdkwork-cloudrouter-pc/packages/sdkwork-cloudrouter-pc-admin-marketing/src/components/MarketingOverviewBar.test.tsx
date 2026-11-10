// KPI 条失败态契约（设计规范 §2.2/§2.5）：概览请求失败不能整条消失，
// 必须就地给出可重试的行内错误并保持条带高度。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPromotionOverview } from '../marketingService';
import { MarketingOverviewBar } from './MarketingOverviewBar';

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
  return { ...actual, fetchPromotionOverview: vi.fn() };
});

beforeEach(() => {
  vi.mocked(fetchPromotionOverview).mockReset();
});

afterEach(cleanup);

describe('MarketingOverviewBar failure state', () => {
  it('keeps the strip and offers a retry instead of vanishing', async () => {
    vi.mocked(fetchPromotionOverview)
      .mockRejectedValueOnce({ problem: { detail: 'Overview down' } })
      .mockResolvedValueOnce({ activeOffers: '3' } as never);

    render(<MarketingOverviewBar />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Overview down');
    expect(alert).toHaveClass('shrink-0');

    const retry = screen.getByRole('button', { name: 'Retry loading overview metrics' });
    fireEvent.click(retry);

    expect(await screen.findByText('Active Offers')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
