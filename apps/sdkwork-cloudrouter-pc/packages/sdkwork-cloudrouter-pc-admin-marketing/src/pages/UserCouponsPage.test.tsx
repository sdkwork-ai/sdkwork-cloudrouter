// 钱包券（领取记录）止损操作契约：
// - 只有 claimed / active / pending 的行可以作废或延期；其余行按钮禁用并给出原因；
// - 作废必须填写原因（1..256，trim 后非空），确认后以原因调用 `userCoupons.voids.create`；
// - 延期把 `datetime-local` 转换成 RFC 3339 后调用 `userCoupons.extensions.create`，
//   并展示服务端返回的新到期时间；
// - 400（过去时间）把 ProblemDetail 原文贴回字段下方；409/404 展示问题信息 + 可复制 traceId。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendExtendPromotionUserCoupon,
  backendPromotionUserCouponsList,
  backendVoidPromotionUserCoupon,
  formatMarketingTimestamp,
  toDatetimeLocal,
} from '../marketingService';
import { UserCouponsPage } from './UserCouponsPage';

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
  return {
    ...actual,
    backendPromotionUserCouponsList: vi.fn(),
    backendVoidPromotionUserCoupon: vi.fn(),
    backendExtendPromotionUserCoupon: vi.fn(),
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '1', totalPages: '1', hasMore: false };

const CLAIMED_EXPIRY = '2026-12-01T00:00:00.000Z';

const claimedCoupon = {
  id: 'uc1',
  couponNo: 'CP-1',
  couponCode: 'WELC****0001',
  ownerUserId: 'u1',
  status: 'claimed',
  expiresAt: CLAIMED_EXPIRY,
};

const redeemedCoupon = {
  ...claimedCoupon,
  id: 'uc2',
  couponNo: 'CP-2',
  status: 'redeemed',
  redeemedAt: '2026-11-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(backendPromotionUserCouponsList).mockReset();
  vi.mocked(backendVoidPromotionUserCoupon).mockReset();
  vi.mocked(backendExtendPromotionUserCoupon).mockReset();
  vi.mocked(backendPromotionUserCouponsList).mockResolvedValue({
    items: [claimedCoupon],
    pageInfo,
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const voidRowButton = 'Void coupon CP-1';
const extendRowButton = 'Extend coupon CP-1 expiry';

describe('UserCouponsPage void', () => {
  it('requires a non-blank reason and calls the void service with the trimmed reason', async () => {
    vi.mocked(backendVoidPromotionUserCoupon).mockResolvedValue({ userCouponId: 'uc1', status: 'voided' });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: voidRowButton }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Void coupon?');
    expect(dialog).toHaveTextContent('Void coupon "CP-1"?');
    expect(dialog).toHaveTextContent('cannot be undone');

    const confirmButton = screen.getByRole('button', { name: 'Void coupon' });
    const reasonInput = screen.getByLabelText('Reason');
    expect(confirmButton).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: '   ' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: '  Customer reported fraud  ' } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => expect(backendVoidPromotionUserCoupon).toHaveBeenCalledTimes(1));
    expect(backendVoidPromotionUserCoupon).toHaveBeenCalledWith('uc1', 'Customer reported fraud');
    expect(await screen.findByText('Coupon "CP-1" voided.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // 成功后刷新列表（首次加载 + 刷新）。
    await waitFor(() => expect(backendPromotionUserCouponsList).toHaveBeenCalledTimes(2));
  });

  it('disables void and extend for a redeemed coupon and explains why', async () => {
    vi.mocked(backendPromotionUserCouponsList).mockResolvedValue({
      items: [redeemedCoupon],
      pageInfo,
    } as never);
    render(<UserCouponsPage />);

    const voidButton = await screen.findByRole('button', { name: 'Void coupon CP-2' });
    const extendButton = screen.getByRole('button', { name: 'Extend coupon CP-2 expiry' });

    expect(voidButton).toBeDisabled();
    expect(extendButton).toBeDisabled();
    const explanation = 'Only claimed, active, or pending coupons can be voided or extended; this coupon is redeemed.';
    expect(voidButton).toHaveAttribute('title', explanation);
    expect(extendButton).toHaveAttribute('title', explanation);

    fireEvent.click(voidButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendVoidPromotionUserCoupon).not.toHaveBeenCalled();
  });

  it('surfaces a 409 problem message with a copyable traceId inside the dialog', async () => {
    vi.mocked(backendVoidPromotionUserCoupon).mockRejectedValue({
      problem: { status: 409, detail: 'Coupon was already redeemed', traceId: 'trace-void-409' },
    });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: voidRowButton }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Fraud ring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Void coupon' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Coupon was already redeemed');
    expect(alert).toHaveTextContent('trace-void-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('closes the dialog and explains a 404 on the page with a traceId', async () => {
    vi.mocked(backendVoidPromotionUserCoupon).mockRejectedValue({
      problem: { status: 404, detail: 'User coupon not found', traceId: 'trace-void-404' },
    });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: voidRowButton }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Fraud ring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Void coupon' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('User coupon not found');
    expect(alert).toHaveTextContent('trace-void-404');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('UserCouponsPage extend', () => {
  it('converts the datetime-local input to RFC 3339 and shows the new expiry', async () => {
    const newExpiry = '2027-01-02T03:04:00.000Z';
    vi.mocked(backendExtendPromotionUserCoupon).mockResolvedValue({
      userCouponId: 'uc1',
      expiresAt: newExpiry,
    });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: extendRowButton }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Extend coupon expiry?');
    expect(dialog).toHaveTextContent(`Current expiry: ${formatMarketingTimestamp(CLAIMED_EXPIRY, 'en')}`);

    const expiryInput = screen.getByLabelText('New expiry') as HTMLInputElement;
    // 默认值 = 当前到期时间；最小值 = 现在（datetime-local 形态）。
    expect(expiryInput.value).toBe(toDatetimeLocal(CLAIMED_EXPIRY));
    expect(expiryInput.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u);

    const localValue = '2027-01-02T03:04';
    fireEvent.change(expiryInput, { target: { value: localValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend expiry' }));

    await waitFor(() => expect(backendExtendPromotionUserCoupon).toHaveBeenCalledTimes(1));
    const expectedRfc3339 = new Date(localValue).toISOString();
    expect(expectedRfc3339).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    expect(backendExtendPromotionUserCoupon).toHaveBeenCalledWith('uc1', expectedRfc3339);
    expect(await screen.findByText(
      `Coupon "CP-1" now expires at ${formatMarketingTimestamp(newExpiry, 'en')}.`,
    )).toBeInTheDocument();
    await waitFor(() => expect(backendPromotionUserCouponsList).toHaveBeenCalledTimes(2));
  });

  it('shows the backend 400 past-date problem message inline instead of a generic failure', async () => {
    vi.mocked(backendExtendPromotionUserCoupon).mockRejectedValue({
      problem: {
        status: 400,
        detail: 'expires_at must be later than the database clock',
        traceId: 'trace-extend-400',
      },
    });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: extendRowButton }));
    fireEvent.change(screen.getByLabelText('New expiry'), { target: { value: '2027-01-02T03:04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend expiry' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('expires_at must be later than the database clock');
    expect(alert).toHaveTextContent('trace-extend-400');
    expect(alert).not.toHaveTextContent('Failed to extend the coupon');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('blocks a past date locally without calling the service', async () => {
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: extendRowButton }));
    fireEvent.change(screen.getByLabelText('New expiry'), { target: { value: '2020-01-01T00:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend expiry' }));

    expect(await screen.findByText('The new expiry must be in the future.')).toBeInTheDocument();
    expect(backendExtendPromotionUserCoupon).not.toHaveBeenCalled();
  });

  it('surfaces a 409 problem message with a copyable traceId when the coupon state changed', async () => {
    vi.mocked(backendExtendPromotionUserCoupon).mockRejectedValue({
      problem: { status: 409, detail: 'Coupon is no longer extendable', traceId: 'trace-extend-409' },
    });
    render(<UserCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: extendRowButton }));
    fireEvent.change(screen.getByLabelText('New expiry'), { target: { value: '2027-01-02T03:04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend expiry' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Coupon is no longer extendable');
    expect(alert).toHaveTextContent('trace-extend-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
