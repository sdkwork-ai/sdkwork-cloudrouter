// 兑换尝试台账契约：
// - 成功与失败都展示，券码只展示后缀（完整券码从不出现）；
// - 失败原因按 failureCode 词表翻译，未知码回退原始值；
// - 结果筛选把 status 映射为后端闭集 outcome；
// - 空态说明「本窗口尚无兑换尝试」，错误态给出可复制的 traceId；
// - 复制 traceId 的按钮可访问名称包含该行请求编号。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendRedemptionAttemptsList } from '../marketingService';
import { RedemptionAttemptsPage } from './RedemptionAttemptsPage';

vi.mock('react-i18next', () => {
  const translate = (
    key: string,
    fallback?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): string => {
    const template = typeof fallback === 'string' ? fallback : key;
    const values = typeof fallback === 'object' && fallback !== null ? fallback : options;
    return Object.entries(values ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) };
});

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return { ...actual, backendRedemptionAttemptsList: vi.fn() };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '2', totalPages: '1', hasMore: false };

const succeededAttempt = {
  id: 'attempt-1',
  codeId: 'code-1',
  submittedCodeSuffix: '9F2K',
  subjectType: 'user',
  subjectId: 'user-1001-with-a-very-long-identifier',
  outcome: 'succeeded',
  failureCode: null,
  failureDetail: null,
  benefitKind: 'points_credit',
  grantedAmount: '1000',
  currencyCode: null,
  requestNo: 'REQ-20261110-0001',
  orderId: null,
  traceId: 'trace-abc-1',
  occurredAt: '2026-11-10 09:12:00',
};

const failedAttempt = {
  id: 'attempt-2',
  codeId: 'code-2',
  submittedCodeSuffix: '7Q1X',
  subjectType: 'user',
  subjectId: 'user-2002',
  outcome: 'failed',
  failureCode: 'per_user_limit_reached',
  failureDetail: 'User already reached the per-user claim limit for this coupon.',
  benefitKind: null,
  grantedAmount: null,
  currencyCode: null,
  requestNo: 'REQ-20261110-0002',
  orderId: null,
  traceId: '',
  occurredAt: '2026-11-10 09:13:00',
};

function mockAttempts(items: Array<Record<string, unknown>>): void {
  vi.mocked(backendRedemptionAttemptsList).mockResolvedValue({ items, pageInfo } as never);
}

beforeEach(() => {
  vi.mocked(backendRedemptionAttemptsList).mockReset();
  mockAttempts([succeededAttempt, failedAttempt]);
});

afterEach(cleanup);

describe('RedemptionAttemptsPage rows', () => {
  it('renders both succeeded and failed attempts with outcome badges', async () => {
    render(<RedemptionAttemptsPage />);

    expect(await screen.findByText('REQ-20261110-0001')).toBeInTheDocument();

    const succeededRow = screen.getByText('REQ-20261110-0001').closest('tr') as HTMLElement;
    const failedRow = screen.getByText('REQ-20261110-0002').closest('tr') as HTMLElement;
    // Outcome text is always present, and the domain colours are emerald / red.
    expect(within(succeededRow).getByText('Succeeded')).toHaveClass('bg-emerald-50');
    expect(within(failedRow).getByText('Failed')).toHaveClass('bg-red-50');
    expect(within(failedRow).getByText('Per-user limit reached')).toBeInTheDocument();
    // Succeeded rows have no failure reason; the cell shows an em dash.
    expect(within(succeededRow).getByText('—')).toBeInTheDocument();
    // The human failure detail is shown as a secondary line, never parsed.
    expect(
      within(failedRow).getByText('User already reached the per-user claim limit for this coupon.'),
    ).toHaveAttribute('title', 'User already reached the per-user claim limit for this coupon.');
  });

  it('labels every known failure code and falls back to the raw value for unknown codes', async () => {
    const failureCases: Array<[string, string]> = [
      ['code_unavailable', 'Code invalid or unavailable'],
      ['issue_limit_reached', 'Issue limit reached'],
      ['per_user_limit_reached', 'Per-user limit reached'],
      ['idempotency_conflict', 'Idempotency conflict'],
      ['redemption_in_progress', 'Redemption in progress'],
      ['benefit_invalid', 'Benefit rule invalid'],
      ['internal_error', 'System error'],
      ['rate_limited', 'Too many attempts'],
      ['coupon_not_redeemable', 'Coupon no longer redeemable'],
      ['coupon_expired', 'Coupon expired'],
      ['audience_not_eligible', 'Audience not eligible'],
      ['mystery_code', 'mystery_code'],
    ];
    mockAttempts(failureCases.map(([failureCode], index) => ({
      ...failedAttempt,
      id: `failure-${index}`,
      failureCode,
      failureDetail: null,
      requestNo: `REQ-FAIL-${index}`,
      submittedCodeSuffix: `SF${index}`,
    })));

    render(<RedemptionAttemptsPage />);

    expect(await screen.findByText('Code invalid or unavailable')).toBeInTheDocument();
    for (const [, label] of failureCases) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows only the submitted code suffix, never a full code', async () => {
    mockAttempts([{ ...succeededAttempt, fullCode: 'WELCOME-FULL-CODE-1234' }]);

    render(<RedemptionAttemptsPage />);

    const suffix = await screen.findByText('9F2K');
    expect(suffix).toHaveAttribute('title', 'last 4 characters of the submitted code');
    expect(suffix).toHaveClass('font-mono');
    expect(screen.queryByText('WELCOME-FULL-CODE-1234')).not.toBeInTheDocument();
  });

  it('shows an em dash for the code suffix when codeId or suffix is empty', async () => {
    mockAttempts([{
      ...failedAttempt,
      id: 'attempt-no-code',
      codeId: null,
      submittedCodeSuffix: '',
      requestNo: 'REQ-NO-CODE',
    }]);

    render(<RedemptionAttemptsPage />);

    const row = (await screen.findByText('REQ-NO-CODE')).closest('tr') as HTMLElement;
    expect(row.querySelectorAll('td')[1]).toHaveTextContent('—');
  });
});

describe('RedemptionAttemptsPage filters and states', () => {
  it('passes the selected outcome through to the service as the closed-set outcome filter', async () => {
    render(<RedemptionAttemptsPage />);
    await screen.findByText('REQ-20261110-0001');

    fireEvent.change(screen.getByRole('combobox', { name: 'All statuses' }), {
      target: { value: 'failed' },
    });

    await waitFor(
      () => expect(backendRedemptionAttemptsList).toHaveBeenLastCalledWith(
        expect.objectContaining({ outcome: 'failed' }),
      ),
      { timeout: 3000 },
    );
  });

  it('explains what an empty result means', async () => {
    mockAttempts([]);

    render(<RedemptionAttemptsPage />);

    expect(await screen.findByText('No redemption attempts')).toBeInTheDocument();
    expect(
      screen.getByText(/No redemption has been attempted yet in this window/),
    ).toBeInTheDocument();
  });

  it('surfaces the problem message with a copyable traceId on error', async () => {
    vi.mocked(backendRedemptionAttemptsList).mockRejectedValue({
      problem: { detail: 'Redemption ledger unavailable', traceId: 'trace-error-9' },
    });

    render(<RedemptionAttemptsPage />);

    expect(await screen.findByText('Redemption ledger unavailable')).toBeInTheDocument();
    expect(screen.getByText('trace-error-9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
  });

  it('gives the row copy button an accessible name containing the request context', async () => {
    render(<RedemptionAttemptsPage />);

    expect(
      await screen.findByRole('button', {
        name: 'Copy trace ID for request REQ-20261110-0001',
      }),
    ).toBeInTheDocument();
  });
});
