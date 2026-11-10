// 核销记录（抵扣申请）引用筛选契约：
// - 订单 / 券码 / 钱包券三个可选输入分别映射到生成 SDK 的 orderId / codeId /
//   userCouponId（wire 参数为 order_id / code_id / user_coupon_id）；
// - 任一筛选变化都回到第 1 页；
// - 既有搜索与状态筛选保持不变。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendPromotionDiscountApplicationsList,
  backendReleasePromotionDiscountApplication,
  backendSettlePromotionDiscountApplication,
} from '../marketingService';
import { DiscountApplicationsPage } from './DiscountApplicationsPage';

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
    backendPromotionDiscountApplicationsList: vi.fn(),
    backendSettlePromotionDiscountApplication: vi.fn(),
    backendReleasePromotionDiscountApplication: vi.fn(),
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '40', totalPages: '2', hasMore: true };

const applicationRow = {
  id: 'ap1',
  applicationNo: 'AP-1',
  orderNo: 'ORD-1',
  orderId: 'ord-1',
  offerId: 'o1',
  discountType: 'FIXED',
  discountAmount: '100',
  currencyCode: 'CNY',
  status: 'applied',
  appliedAt: '2026-11-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(backendPromotionDiscountApplicationsList).mockReset();
  vi.mocked(backendSettlePromotionDiscountApplication).mockReset();
  vi.mocked(backendReleasePromotionDiscountApplication).mockReset();
  vi.mocked(backendPromotionDiscountApplicationsList).mockResolvedValue({
    items: [applicationRow],
    pageInfo,
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function lastCallParams(): Record<string, unknown> | undefined {
  return vi.mocked(backendPromotionDiscountApplicationsList).mock.calls.at(-1)?.[0] as
    | Record<string, unknown>
    | undefined;
}

describe('DiscountApplicationsPage reference filters', () => {
  it('maps the optional inputs to the service and resets to page 1 on every change', async () => {
    render(<DiscountApplicationsPage />);

    await screen.findByText('AP-1');
    expect(lastCallParams()).toEqual({ page: 1, pageSize: 20, status: undefined });

    // 先翻到第 2 页，再输入筛选：必须回到第 1 页。
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastCallParams()).toMatchObject({ page: 2 }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Order ID' }), {
      target: { value: '  ord-9  ' },
    });
    await waitFor(() => expect(lastCallParams()).toMatchObject({ page: 1, orderId: 'ord-9' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Code ID' }), {
      target: { value: 'code-7' },
    });
    await waitFor(() => expect(lastCallParams()).toMatchObject({ page: 1, codeId: 'code-7' }));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastCallParams()).toMatchObject({ page: 2 }));

    fireEvent.change(screen.getByRole('textbox', { name: 'User Coupon ID' }), {
      target: { value: 'uc-3' },
    });

    await waitFor(() => expect(lastCallParams()).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      orderId: 'ord-9',
      codeId: 'code-7',
      userCouponId: 'uc-3',
    }));
  });

  it('keeps the existing status filter and search controls working alongside the reference filters', async () => {
    render(<DiscountApplicationsPage />);

    await screen.findByText('AP-1');
    fireEvent.change(screen.getByRole('combobox', { name: 'All statuses' }), {
      target: { value: 'settled' },
    });

    await waitFor(() => expect(lastCallParams()).toMatchObject({ page: 1, status: 'settled' }));
    expect(screen.getByRole('textbox', { name: 'Search by application no or order no' })).toBeInTheDocument();
  });

  it('omits blank reference filters from the request', async () => {
    render(<DiscountApplicationsPage />);

    await screen.findByText('AP-1');
    fireEvent.change(screen.getByRole('textbox', { name: 'Order ID' }), {
      target: { value: '   ' },
    });

    await waitFor(() => expect(lastCallParams()).toEqual({ page: 1, pageSize: 20, status: undefined }));
  });
});

/**
 * 结算/释放契约：
 * - 只有 `status === 'applied'` 的行可操作，其余状态禁用并在 `title` 说明当前状态；
 * - 结算前确认对话框写明订单与金额，确认后调用 settlements.create(applicationId)；
 * - 释放必须填原因（trim 后非空），调用 releases.create(applicationId, { reason })；
 * - 成功反馈包含订单、金额与 settledAmountMinor / releasedAmountMinor 并刷新列表；
 * - 409/404 展示后端问题原文 + 可复制 traceId。
 */
describe('DiscountApplicationsPage settle and release', () => {
  it('disables settle and release for a non-applied application and explains its status', async () => {
    vi.mocked(backendPromotionDiscountApplicationsList).mockResolvedValue({
      items: [{ ...applicationRow, id: 'ap2', applicationNo: 'AP-2', orderNo: 'ORD-2', status: 'settled' }],
      pageInfo,
    } as never);
    render(<DiscountApplicationsPage />);

    const settleButton = await screen.findByRole('button', { name: 'Settle the discount for order ORD-2' });
    const releaseButton = screen.getByRole('button', { name: 'Release the discount for order ORD-2' });

    expect(settleButton).toBeDisabled();
    expect(releaseButton).toBeDisabled();
    const explanation =
      'Only applied discount applications can be settled or released; this application is settled.';
    expect(settleButton).toHaveAttribute('title', explanation);
    expect(releaseButton).toHaveAttribute('title', explanation);

    fireEvent.click(settleButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendSettlePromotionDiscountApplication).not.toHaveBeenCalled();
  });

  it('settles the applied row through the confirm dialog and reports the settled amount', async () => {
    vi.mocked(backendSettlePromotionDiscountApplication).mockResolvedValue({
      applicationId: 'ap1',
      status: 'settled',
      settledAmountMinor: '100',
    });
    render(<DiscountApplicationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Settle the discount for order ORD-1' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Settle discount application?');
    expect(dialog).toHaveTextContent('Settle the discount for order ORD-1 of 1.00 CNY?');
    expect(dialog).toHaveTextContent('can no longer be released');

    fireEvent.click(screen.getByRole('button', { name: 'Settle' }));

    await waitFor(() => expect(backendSettlePromotionDiscountApplication).toHaveBeenCalledTimes(1));
    expect(backendSettlePromotionDiscountApplication).toHaveBeenCalledWith('ap1');
    expect(await screen.findByText(
      'Settled the discount for order ORD-1 (1.00 CNY). Budget settled: 1.00 CNY.',
    )).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // 成功后刷新列表（首次加载 + 刷新）。
    await waitFor(() => expect(backendPromotionDiscountApplicationsList).toHaveBeenCalledTimes(2));
  });

  it('requires a reason before releasing and sends the trimmed reason', async () => {
    vi.mocked(backendReleasePromotionDiscountApplication).mockResolvedValue({
      applicationId: 'ap1',
      status: 'released',
      releasedAmountMinor: '100',
    });
    render(<DiscountApplicationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Release the discount for order ORD-1' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Release discount application?');
    expect(dialog).toHaveTextContent('Release the discount for order ORD-1 of 1.00 CNY?');

    const confirmButton = screen.getByRole('button', { name: 'Release' });
    const reasonInput = screen.getByLabelText('Reason');
    expect(confirmButton).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: '   ' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: '  Order cancelled  ' } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => expect(backendReleasePromotionDiscountApplication).toHaveBeenCalledTimes(1));
    expect(backendReleasePromotionDiscountApplication).toHaveBeenCalledWith('ap1', 'Order cancelled');
    expect(await screen.findByText(
      'Released the discount for order ORD-1 (1.00 CNY). Budget released: 1.00 CNY.',
    )).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(backendPromotionDiscountApplicationsList).toHaveBeenCalledTimes(2));
  });

  it('surfaces a 409 problem message with a copyable traceId inside the dialog', async () => {
    vi.mocked(backendSettlePromotionDiscountApplication).mockRejectedValue({
      problem: { status: 409, detail: 'Discount application is already settled', traceId: 'trace-settle-409' },
    });
    render(<DiscountApplicationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Settle the discount for order ORD-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settle' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Discount application is already settled');
    expect(alert).toHaveTextContent('trace-settle-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('closes the dialog and explains a 404 on the page with a traceId', async () => {
    vi.mocked(backendReleasePromotionDiscountApplication).mockRejectedValue({
      problem: { status: 404, detail: 'Discount application not found', traceId: 'trace-release-404' },
    });
    render(<DiscountApplicationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Release the discount for order ORD-1' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Order cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Release' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Discount application not found');
    expect(alert).toHaveTextContent('trace-release-404');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(backendPromotionDiscountApplicationsList).toHaveBeenCalledTimes(2));
  });
});
