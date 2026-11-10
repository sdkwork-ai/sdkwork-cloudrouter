// 破坏性操作确认契约：停用/启用线上优惠券必须先确认并写明后果；删除先要求停用，
// 且删除走 commons ConfirmDialog；失败反馈为行内条 + 可复制 traceId，不使用原生
// window.confirm / window.alert。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendPromotionOffersList,
  deletePromotionOffer,
  fetchPromotionOverview,
  retrievePromotionOffer,
  updatePromotionOffer,
  updatePromotionOfferStatus,
} from '../marketingService';
import { OffersPage } from './OffersPage';

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
    backendPromotionOffersList: vi.fn(),
    createCouponOffer: vi.fn(),
    deletePromotionOffer: vi.fn(),
    retrievePromotionOffer: vi.fn(),
    updatePromotionOffer: vi.fn(),
    updatePromotionOfferStatus: vi.fn(),
    fetchPromotionOverview: vi.fn(),
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '1', totalPages: '1', hasMore: false };

const activeOffer = {
  id: 'o1',
  offerNo: 'OF-1',
  displayName: 'Spring Coupon',
  status: 'active',
  offerType: 'COUPON',
  audienceScope: 'ALL',
};

const disabledOffer = { ...activeOffer, status: 'disabled' };

/** 超过 `Number.MAX_SAFE_INTEGER`（2^53）的 int64 版本，用于证明未转 number。 */
const INT64_VERSION = '9007199254740993';

const editableOffer = {
  id: 'o1',
  offerNo: 'OF-1',
  displayName: 'Spring Coupon',
  offerType: 'COUPON',
  audienceScope: 'NEW_USER',
  combinability: 'COMBINABLE',
  goodsScope: 'RECHARGE',
  priority: 42,
  startsAt: '2026-11-01T00:00:00Z',
  endsAt: '2026-12-01T00:00:00Z',
  status: 'active',
  currencyCode: 'USD',
  discountType: 'PERCENTAGE',
  discountValue: '12.5',
  minimumAmount: '100.50',
  maximumDiscountAmount: '20',
  couponBenefit: {
    kind: 'subscription',
    period: 'month',
    durationDays: '30',
    dailyQuota: '1000',
    totalQuota: '30000',
    productId: 'pro-membership',
    skuId: 'sku-pro-monthly',
    packageId: '1002',
  },
  version: INT64_VERSION,
  updatedAt: '2026-11-01T00:00:00Z',
};

function mockOffers(items: Array<Record<string, unknown>>): void {
  vi.mocked(backendPromotionOffersList).mockResolvedValue({ items, pageInfo } as never);
}

beforeEach(() => {
  vi.mocked(fetchPromotionOverview).mockResolvedValue({});
  vi.mocked(deletePromotionOffer).mockReset();
  vi.mocked(deletePromotionOffer).mockResolvedValue(undefined);
  vi.mocked(updatePromotionOfferStatus).mockReset();
  vi.mocked(updatePromotionOfferStatus).mockResolvedValue(undefined);
  vi.mocked(retrievePromotionOffer).mockReset();
  vi.mocked(updatePromotionOffer).mockReset();
  vi.mocked(backendPromotionOffersList).mockReset();
});

afterEach(cleanup);

describe('OffersPage status toggle confirmation', () => {
  it('requires confirmation with the offer name and consequence before disabling', async () => {
    mockOffers([activeOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Disable coupon?');
    expect(dialog).toHaveTextContent('Spring Coupon');
    expect(dialog).toHaveTextContent('stops redemptions immediately');
    expect(updatePromotionOfferStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(updatePromotionOfferStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disable coupon' }));

    await waitFor(() => expect(updatePromotionOfferStatus).toHaveBeenCalledWith('o1', 'disabled'));
  });

  it('states that enabling starts redemptions again', async () => {
    mockOffers([disabledOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Enable coupon?');
    expect(dialog).toHaveTextContent('starts redemptions again');

    fireEvent.click(screen.getByRole('button', { name: 'Enable coupon' }));
    await waitFor(() => expect(updatePromotionOfferStatus).toHaveBeenCalledWith('o1', 'active'));
  });

  it('shows an inline alert with a copyable traceId when the toggle fails', async () => {
    mockOffers([activeOffer]);
    vi.mocked(updatePromotionOfferStatus).mockRejectedValue({
      problem: { detail: 'Status update rejected', traceId: 'trace-9' },
    });
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disable coupon' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Status update rejected');
    expect(alert).toHaveTextContent('trace-9');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
  });
});

describe('OffersPage delete gating', () => {
  it('blocks deleting a live offer and explains that it must be disabled first', async () => {
    mockOffers([activeOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Disable the offer before deleting it.');
    expect(deletePromotionOffer).not.toHaveBeenCalled();
  });

  it('requires confirmation with the offer name before deleting a disabled offer', async () => {
    mockOffers([disabledOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete coupon?');
    expect(dialog).toHaveTextContent('Spring Coupon');
    expect(deletePromotionOffer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete coupon' }));
    await waitFor(() => expect(deletePromotionOffer).toHaveBeenCalledWith('o1'));
  });
});

describe('OffersPage success feedback', () => {
  it('shows a dismissible success alert naming the deleted coupon', async () => {
    mockOffers([disabledOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete coupon' }));

    expect(await screen.findByText('Coupon "Spring Coupon" deleted.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByText('Coupon "Spring Coupon" deleted.')).not.toBeInTheDocument();
  });

  it('clears a stale success alert when a new action starts', async () => {
    mockOffers([disabledOffer]);
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete coupon' }));
    expect(await screen.findByText('Coupon "Spring Coupon" deleted.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('Coupon "Spring Coupon" deleted.')).not.toBeInTheDocument();
  });
});

/** 表单在 Footer 里通过 `form=` 关联，直接提交表单比点击带 form 属性的按钮更稳定。 */
function submitCouponForm(): void {
  const form = document.getElementById('couponOfferCreateForm');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('Coupon offer form is not rendered');
  }
  fireEvent.submit(form);
}

async function openEditDrawer(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  await screen.findByText('Edit Coupon');
}

describe('OffersPage edit flow', () => {
  it('prefills from the retrieved offer and submits the int64 version unchanged', async () => {
    mockOffers([activeOffer]);
    vi.mocked(retrievePromotionOffer).mockResolvedValue(editableOffer as never);
    vi.mocked(updatePromotionOffer).mockResolvedValue(editableOffer as never);
    render(<OffersPage />);

    await openEditDrawer();

    // 预填：名称不带“（复制）”后缀，会员券的套餐/配额与优先级都来自后端现值。
    expect(screen.getByDisplayValue('Spring Coupon')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    // 满减/折扣条款按后端现值回填，编辑保存后不会被重置。
    expect(screen.getByDisplayValue('Percentage off (PERCENTAGE)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100.50')).toBeInTheDocument();

    submitCouponForm();

    await waitFor(() => expect(updatePromotionOffer).toHaveBeenCalledTimes(1));
    const [offerId, body] = vi.mocked(updatePromotionOffer).mock.calls[0];
    expect(offerId).toBe('o1');
    expect(body.version).toBe(INT64_VERSION);
    expect(typeof body.version).toBe('string');
    expect(body.version).not.toBe(Number(INT64_VERSION));
    expect(body.displayName).toBe('Spring Coupon');
    expect(body.audienceScope).toBe('NEW_USER');
    expect(body.combinability).toBe('COMBINABLE');
    expect(body.goodsScope).toBe('RECHARGE');
    expect(body.priority).toBe(42);
    expect(body.currencyCode).toBe('USD');
    expect(body.discountType).toBe('PERCENTAGE');
    expect(body.minimumAmount).toBe('100.50');
    expect(body.maximumDiscountAmount).toBe('20');
    expect(body.discountValue).toBe('12.5');
    // 会员套餐三元组与配额原样回写，编辑不会丢字段。
    expect(body.couponBenefit).toEqual({
      kind: 'subscription',
      period: 'month',
      durationDays: '30',
      dailyQuota: '1000',
      totalQuota: '30000',
      productId: 'pro-membership',
      skuId: 'sku-pro-monthly',
      packageId: '1002',
    });
  });

  it('keeps the drawer open on a 409 and reloads only the version', async () => {
    mockOffers([activeOffer]);
    vi.mocked(retrievePromotionOffer).mockResolvedValue(editableOffer as never);
    vi.mocked(updatePromotionOffer).mockRejectedValueOnce({
      httpStatus: 409,
      code: 'CONFLICT',
      problem: { status: 409, detail: 'Offer version is stale', traceId: 'trace-409' },
    });
    render(<OffersPage />);

    await openEditDrawer();
    const nameInput = screen.getByDisplayValue('Spring Coupon');
    fireEvent.change(nameInput, { target: { value: 'Spring Coupon v2' } });
    submitCouponForm();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('changed by another session');
    expect(alert).toHaveTextContent('trace-409');
    // 抽屉保持打开，运营已输入的内容不丢。
    expect(screen.getByText('Edit Coupon')).toBeInTheDocument();
    expect(nameInput).toHaveValue('Spring Coupon v2');

    const reloadedOffer = {
      ...editableOffer,
      displayName: 'Spring Coupon v2',
      version: '9007199254740994',
    };
    vi.mocked(retrievePromotionOffer).mockResolvedValue(reloadedOffer as never);
    fireEvent.click(screen.getByRole('button', { name: 'Reload offer' }));

    await waitFor(() => expect(retrievePromotionOffer).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(nameInput).toHaveValue('Spring Coupon v2');

    submitCouponForm();
    await waitFor(() => expect(updatePromotionOffer).toHaveBeenCalledTimes(2));
    const retried = vi.mocked(updatePromotionOffer).mock.calls[1][1];
    expect(retried.version).toBe('9007199254740994');
    expect(retried.displayName).toBe('Spring Coupon v2');
  });

  it('closes the drawer and reports a missing coupon on a 404 update', async () => {
    mockOffers([activeOffer]);
    vi.mocked(retrievePromotionOffer).mockResolvedValue(editableOffer as never);
    vi.mocked(updatePromotionOffer).mockRejectedValue({
      httpStatus: 404,
      code: 'NOT_FOUND',
      problem: { status: 404, detail: 'Offer not found', traceId: 'trace-404' },
    });
    render(<OffersPage />);

    await openEditDrawer();
    submitCouponForm();

    expect(await screen.findByText('This coupon no longer exists.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Edit Coupon')).not.toBeInTheDocument());
  });

  it('hides creation-only issuance fields and warns that issued codes stay pinned', async () => {
    mockOffers([activeOffer]);
    vi.mocked(retrievePromotionOffer).mockResolvedValue(editableOffer as never);
    render(<OffersPage />);

    await openEditDrawer();

    expect(screen.getByText('Saving creates a new coupon rule version')).toBeInTheDocument();
    expect(screen.getByText(/stay pinned to the rule version/u)).toBeInTheDocument();
    expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Issuance Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Stock Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Quantity')).not.toBeInTheDocument();
    expect(screen.queryByText('Code Issuance Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Batch Quantity')).not.toBeInTheDocument();
  });
});

describe('OffersPage delete-in-use guidance', () => {
  it('tells the operator to disable the coupon first when delete returns 409', async () => {
    mockOffers([disabledOffer]);
    vi.mocked(deletePromotionOffer).mockRejectedValue({
      httpStatus: 409,
      code: 'CONFLICT',
      problem: { status: 409, detail: 'Offer still has issued stock', traceId: 'trace-in-use' },
    });
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete coupon' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Disable the coupon first');
    expect(alert).toHaveTextContent('trace-in-use');
  });
});
