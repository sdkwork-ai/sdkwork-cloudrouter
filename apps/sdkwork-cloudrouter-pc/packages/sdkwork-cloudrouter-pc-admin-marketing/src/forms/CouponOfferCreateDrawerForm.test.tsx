// 库存预算上限（创建表单）契约：
// - 可选字段：留空 = 不设上限，提交的库存请求里不出现 `budgetAmountMinor`；
// - 填写时以「元」输入，提交前经 `yuanToMinorUnits` 换算成最小单位（分），
//   绝不使用浮点乘 100；
// - 非正数（0 / 负数）被表单拦截，不会触达提交回调。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCouponOfferCreateRequests, type CouponOfferCreateFormValues } from '../marketingService';
import { CouponOfferCreateDrawerForm } from './CouponOfferCreateDrawerForm';

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
    backendPromotionCampaignsList: vi.fn().mockResolvedValue({ items: [], pageInfo: {} }),
  };
});

/** 只填创建所需的最小字段：用积分券避开币种选择器，聚焦预算字段行为。 */
const baseInitialValues: Partial<CouponOfferCreateFormValues> = {
  benefitKind: 'points_credit',
  displayName: 'Budget Coupon',
  startsAt: '2026-12-01T00:00',
  grantPoints: '100',
  totalQuantity: '100',
  budgetAmount: '',
};

function renderForm(onSubmit: (values: CouponOfferCreateFormValues) => void) {
  return render(
    <CouponOfferCreateDrawerForm
      error={null}
      initialValues={baseInitialValues}
      onSubmit={onSubmit}
    />,
  );
}

function submitForm() {
  const form = document.querySelector('form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

const budgetInputPlaceholder = 'e.g. 5000';

afterEach(cleanup);

function renderFormWithDiscounts(
  onSubmit: (values: CouponOfferCreateFormValues) => void,
  discount: Partial<CouponOfferCreateFormValues>,
) {
  return render(
    <CouponOfferCreateDrawerForm
      error={null}
      initialValues={{ ...baseInitialValues, ...discount }}
      onSubmit={onSubmit}
    />,
  );
}

const discountTypeSelectLabel = 'Benefit only (no order discount)';

function changeDiscountType(value: 'NONE' | 'FIXED' | 'PERCENTAGE'): void {
  fireEvent.change(screen.getByDisplayValue(discountTypeSelectLabel), { target: { value } });
}

describe('CouponOfferCreateDrawerForm discount terms', () => {
  it('defaults to NONE and keeps the benefit-only payload unchanged', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    expect(screen.getByText('Discount terms')).toBeInTheDocument();
    expect(screen.queryByText('Discount percentage (%)')).not.toBeInTheDocument();
    expect(screen.queryByText('Minimum order amount')).not.toBeInTheDocument();

    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as CouponOfferCreateFormValues;
    expect(values.discountType).toBe('NONE');
    expect(values.discountValue).toBe('0');
    expect(values.minimumAmount).toBe('0');
    expect(values.maximumDiscountAmount).toBeNull();

    const { offerRequest } = buildCouponOfferCreateRequests(values, 'idem-none');
    expect(offerRequest.discountType).toBe('NONE');
    expect(offerRequest.discountValue).toBe('0');
    expect(offerRequest.minimumAmount).toBe('0');
    expect(offerRequest.maximumDiscountAmount).toBeNull();
  });

  it('authors a FIXED amount off and minimum order amount', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    changeDiscountType('FIXED');
    fireEvent.change(screen.getByPlaceholderText('e.g. 12.50'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100.50' } });
    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as CouponOfferCreateFormValues;
    const { offerRequest } = buildCouponOfferCreateRequests(values, 'idem-fixed');
    expect(offerRequest.discountType).toBe('FIXED');
    expect(offerRequest.discountValue).toBe('12.5');
    expect(offerRequest.minimumAmount).toBe('100.50');
    expect(offerRequest.maximumDiscountAmount).toBeNull();
  });

  it('authors a PERCENTAGE discount with a cap and minimum', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    changeDiscountType('PERCENTAGE');
    fireEvent.change(screen.getByPlaceholderText('e.g. 12.5'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 20'), { target: { value: '20' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } });
    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as CouponOfferCreateFormValues;
    const { offerRequest } = buildCouponOfferCreateRequests(values, 'idem-percentage');
    expect(offerRequest.discountType).toBe('PERCENTAGE');
    expect(offerRequest.discountValue).toBe('12.5');
    expect(offerRequest.minimumAmount).toBe('100');
    expect(offerRequest.maximumDiscountAmount).toBe('20');
  });

  it('rejects a FIXED discount of 0 and shows the message under the field', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    changeDiscountType('FIXED');
    fireEvent.change(screen.getByPlaceholderText('e.g. 12.50'), { target: { value: '0' } });
    submitForm();

    expect(await screen.findByText('Fixed discount amount must be greater than 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects PERCENTAGE 0 and values above 100', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    changeDiscountType('PERCENTAGE');
    const percentageInput = screen.getByPlaceholderText('e.g. 12.5');
    fireEvent.change(percentageInput, { target: { value: '0' } });
    submitForm();
    expect(await screen.findByText('Percentage discount must be greater than 0 and at most 100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(percentageInput, { target: { value: '100.01' } });
    submitForm();
    expect(await screen.findByText('Percentage discount must be greater than 0 and at most 100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects three-decimal values and a negative minimum', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    changeDiscountType('FIXED');
    const amountInput = screen.getByPlaceholderText('e.g. 12.50');
    fireEvent.change(amountInput, { target: { value: '12.345' } });
    submitForm();
    expect(await screen.findByText(
      'Enter a plain decimal amount with at most 2 fraction digits (no signs, exponents or commas)',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(amountInput, { target: { value: '12.5' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '-5' } });
    submitForm();
    expect(await screen.findByText(
      'Minimum order amount must be 0 or greater, with at most 2 fraction digits',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a cap on FIXED and NONE', async () => {
    const onSubmit = vi.fn();
    renderFormWithDiscounts(onSubmit, {
      discountType: 'FIXED',
      discountValue: '5',
      minimumAmount: '',
      maximumDiscountAmount: '20',
    });
    submitForm();

    expect(await screen.findByText(
      'Maximum discount amount is only allowed for a percentage discount',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    cleanup();

    renderFormWithDiscounts(onSubmit, {
      discountType: 'NONE',
      maximumDiscountAmount: '20',
    });
    submitForm();

    expect(await screen.findByText(
      'Maximum discount amount is only allowed for a percentage discount',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('CouponOfferCreateDrawerForm stock budget cap', () => {
  it('converts yuan to minor units and sends budgetAmountMinor', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    fireEvent.change(screen.getByPlaceholderText(budgetInputPlaceholder), {
      target: { value: '123.45' },
    });
    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as CouponOfferCreateFormValues;
    expect(values.budgetAmount).toBe('123.45');

    const requests = buildCouponOfferCreateRequests(values, 'idem-budget');
    expect(requests.stockRequest.budgetAmountMinor).toBe('12345');
    expect(typeof requests.stockRequest.budgetAmountMinor).toBe('string');
  });

  it('omits budgetAmountMinor when the field is blank (no cap)', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const requests = buildCouponOfferCreateRequests(
      onSubmit.mock.calls[0][0] as CouponOfferCreateFormValues,
      'idem-no-budget',
    );
    expect('budgetAmountMinor' in requests.stockRequest).toBe(false);
  });

  it('rejects a zero or negative cap without calling onSubmit', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    const budgetInput = screen.getByPlaceholderText(budgetInputPlaceholder);
    fireEvent.change(budgetInput, { target: { value: '0' } });
    submitForm();
    expect(await screen.findByText(
      'Stock budget cap must be a positive amount, or left blank for no cap',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(budgetInput, { target: { value: '-5' } });
    submitForm();
    expect(await screen.findByText(
      'Stock budget cap must be a positive amount, or left blank for no cap',
    )).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
