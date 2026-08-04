import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CouponOfferCreateFormValues,
  type CouponOfferBenefitKind,
  type CouponCodeIssueMode,
  type CouponStockType,
} from '../marketingService';
import {
  marketingInputClassName,
  marketingSelectClassName,
  MarketingField,
  MarketingFormActions,
  MarketingFormSection,
} from '../components/MarketingFormControls';

export interface CouponOfferCreateDrawerFormProps {
  isSaving: boolean;
  error: string | null;
  initialValue?: Partial<CouponOfferCreateFormValues>;
  onCancel: () => void;
  onSubmit: (values: CouponOfferCreateFormValues) => void;
}

const INITIAL_VALUES: CouponOfferCreateFormValues = {
  displayName: '',
  offerType: 'COUPON',
  description: '',
  audienceScope: 'ALL',
  combinability: 'EXCLUSIVE',
  goodsScope: 'ALL',
  priority: 100,
  startsAt: '',
  endsAt: '',
  status: 'active',
  benefitKind: 'token_bank_credit',
  discountType: 'FIXED',
  discountValue: '',
  minimumAmount: '0',
  maximumDiscountAmount: '',
  currencyCode: 'CNY',
  grantAmount: '',
  productId: '',
  skuId: '',
  packageId: '',
  period: 'month',
  durationDays: '30',
  dailyQuota: '',
  totalQuota: '',
  stockType: 'LIMITED',
  codeIssueMode: 'REALTIME',
  totalQuantity: '',
  perUserLimit: 1,
  claimStartsAt: '',
  claimEndsAt: '',
  batchQuantity: '',
  batchCodeLength: 16,
  batchCodePrefix: '',
  batchStartsAt: '',
  batchExpiresAt: '',
};

export function CouponOfferCreateDrawerForm({
  isSaving,
  error,
  initialValue,
  onCancel,
  onSubmit,
}: CouponOfferCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CouponOfferCreateFormValues>({
    ...INITIAL_VALUES,
    ...initialValue,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof CouponOfferCreateFormValues>(
    key: K,
    value: CouponOfferCreateFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const benefitKind: CouponOfferBenefitKind = values.benefitKind;
  const codeIssueMode: CouponCodeIssueMode = values.codeIssueMode;
  const stockType: CouponStockType = values.stockType;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.displayName.trim() || !values.startsAt) {
      setValidationError(t('admin.marketing.coupon.form.required', 'Coupon name and start time are required'));
      return;
    }
    if (values.endsAt && values.startsAt && new Date(values.endsAt) < new Date(values.startsAt)) {
      setValidationError(t('admin.marketing.coupon.form.endsBeforeStarts', 'End time must not be earlier than start time'));
      return;
    }
    if (benefitKind === 'token_bank_credit') {
      const amountFields = [
        ['grantAmount', values.grantAmount],
        ['discountValue', values.discountValue],
        ['minimumAmount', values.minimumAmount],
        ['maximumDiscountAmount', values.maximumDiscountAmount],
      ] as const;
      for (const [, value] of amountFields) {
        if (value && !/^\d+(\.\d{1,2})?$/.test(value.trim())) {
          setValidationError(t('admin.marketing.coupon.form.invalidAmount', 'Amount fields must be positive numbers with at most two decimals'));
          return;
        }
      }
    }
    if (benefitKind === 'token_bank_credit' && !values.grantAmount?.trim()) {
      setValidationError(t('admin.marketing.coupon.form.requiredGrant', 'Grant amount is required for token bank credit coupons'));
      return;
    }
    if (benefitKind === 'subscription' && (!values.packageId?.trim() || !values.dailyQuota?.trim() || !values.totalQuota?.trim())) {
      setValidationError(t('admin.marketing.coupon.form.requiredSubscription', 'Package, daily quota and total quota are required for subscription coupons'));
      return;
    }
    if (stockType === 'LIMITED' && !values.totalQuantity) {
      setValidationError(t('admin.marketing.coupon.form.requiredQuantity', 'Total quantity is required for limited stock'));
      return;
    }
    if (codeIssueMode === 'BATCH' && !values.batchQuantity) {
      setValidationError(t('admin.marketing.coupon.form.requiredBatch', 'Batch quantity is required for batch code mode'));
      return;
    }
    onSubmit({
      ...values,
      benefitKind,
      codeIssueMode,
      stockType,
      endsAt: values.endsAt || undefined,
      maximumDiscountAmount: values.maximumDiscountAmount || undefined,
      claimStartsAt: values.claimStartsAt || undefined,
      claimEndsAt: values.claimEndsAt || undefined,
      batchStartsAt: values.batchStartsAt || undefined,
      batchExpiresAt: values.batchExpiresAt || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.coupon.form.basic', 'Basic Information')}>
        <MarketingField label={t('admin.marketing.coupon.form.name', 'Coupon Name')} required>
          <input
            type="text"
            value={values.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            className={marketingInputClassName}
            placeholder="e.g. New User Welcome Coupon"
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.type', 'Offer Type')} required>
          <select
            value={values.offerType}
            onChange={(event) => update('offerType', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="COUPON">COUPON</option>
            <option value="VOUCHER">VOUCHER</option>
            <option value="DISCOUNT">DISCOUNT</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.audience', 'Audience Scope')} required>
          <select
            value={values.audienceScope}
            onChange={(event) => update('audienceScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">ALL</option>
            <option value="NEW_USER">NEW_USER</option>
            <option value="RETURNING_USER">RETURNING_USER</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.combinability', 'Combinability')} required>
          <select
            value={values.combinability}
            onChange={(event) => update('combinability', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="EXCLUSIVE">EXCLUSIVE</option>
            <option value="COMBINABLE">COMBINABLE</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.goodsScope', 'Goods Scope')} required>
          <select
            value={values.goodsScope}
            onChange={(event) => update('goodsScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">ALL</option>
            <option value="RECHARGE">RECHARGE</option>
            <option value="SUBSCRIPTION">SUBSCRIPTION</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.priority', 'Priority')} required>
          <input
            type="number"
            value={values.priority}
            onChange={(event) => update('priority', Number(event.target.value))}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.startsAt', 'Starts At')} required>
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) => update('startsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.endsAt', 'Ends At')}>
          <input
            type="datetime-local"
            value={values.endsAt}
            onChange={(event) => update('endsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.description', 'Description')}>
          <textarea
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </MarketingField>
      </MarketingFormSection>

      <MarketingFormSection title={t('admin.marketing.coupon.form.benefit', 'Coupon Benefit')}>
        <MarketingField label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} required>
          <select
            value={benefitKind}
            onChange={(event) => update('benefitKind', event.target.value as CouponOfferBenefitKind)}
            className={marketingSelectClassName}
          >
            <option value="token_bank_credit">{t('admin.marketing.coupon.form.benefit.tokenBank', 'Token Bank Credit (amount)')}</option>
            <option value="subscription">{t('admin.marketing.coupon.form.benefit.subscription', 'Subscription Entitlement')}</option>
          </select>
        </MarketingField>
        {benefitKind === 'token_bank_credit' ? (
          <>
            <MarketingField label={t('admin.marketing.coupon.form.grantAmount', 'Grant Amount')} required>
              <input
                type="text"
                value={values.grantAmount}
                onChange={(event) => update('grantAmount', event.target.value)}
                className={marketingInputClassName}
                placeholder="e.g. 500"
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.discountType', 'Discount Type')} required>
              <select
                value={values.discountType}
                onChange={(event) => update('discountType', event.target.value)}
                className={marketingSelectClassName}
              >
                <option value="FIXED">FIXED</option>
                <option value="PERCENT">PERCENT</option>
                <option value="NONE">NONE</option>
              </select>
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.discountValue', 'Discount Value')} required>
              <input
                type="text"
                value={values.discountValue}
                onChange={(event) => update('discountValue', event.target.value)}
                className={marketingInputClassName}
                placeholder="e.g. 10"
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.minimumAmount', 'Minimum Amount')} required>
              <input
                type="text"
                value={values.minimumAmount}
                onChange={(event) => update('minimumAmount', event.target.value)}
                className={marketingInputClassName}
                placeholder="0"
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.maximumDiscountAmount', 'Maximum Discount Amount')}>
              <input
                type="text"
                value={values.maximumDiscountAmount}
                onChange={(event) => update('maximumDiscountAmount', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} required>
              <input
                type="text"
                value={values.currencyCode}
                onChange={(event) => update('currencyCode', event.target.value.toUpperCase())}
                className={marketingInputClassName}
                placeholder="CNY"
              />
            </MarketingField>
          </>
        ) : (
          <>
            <MarketingField label={t('admin.marketing.coupon.form.productId', 'Product Id')} required>
              <input
                type="text"
                value={values.productId}
                onChange={(event) => update('productId', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.skuId', 'Sku Id')} required>
              <input
                type="text"
                value={values.skuId}
                onChange={(event) => update('skuId', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.packageId', 'Package Id')} required>
              <input
                type="text"
                value={values.packageId}
                onChange={(event) => update('packageId', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.period', 'Period')} required>
              <select
                value={values.period}
                onChange={(event) => update('period', event.target.value as 'day' | 'week' | 'month' | 'year')}
                className={marketingSelectClassName}
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.durationDays', 'Duration Days')} required>
              <input
                type="text"
                value={values.durationDays}
                onChange={(event) => update('durationDays', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.dailyQuota', 'Daily Quota')} required>
              <input
                type="text"
                value={values.dailyQuota}
                onChange={(event) => update('dailyQuota', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.totalQuota', 'Total Quota')} required>
              <input
                type="text"
                value={values.totalQuota}
                onChange={(event) => update('totalQuota', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
          </>
        )}
      </MarketingFormSection>

      <MarketingFormSection title={t('admin.marketing.coupon.form.issuance', 'Issuance Settings')}>
        <MarketingField label={t('admin.marketing.coupon.form.stockType', 'Stock Type')} required>
          <select
            value={stockType}
            onChange={(event) => update('stockType', event.target.value as CouponStockType)}
            className={marketingSelectClassName}
          >
            <option value="LIMITED">LIMITED</option>
            <option value="UNLIMITED">UNLIMITED</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.codeIssueMode', 'Code Issuance Mode')} required>
          <select
            value={codeIssueMode}
            onChange={(event) => update('codeIssueMode', event.target.value as CouponCodeIssueMode)}
            className={marketingSelectClassName}
          >
            <option value="REALTIME">{t('admin.marketing.coupon.form.codeIssue.realtime', 'Generate at claim time')}</option>
            <option value="BATCH">{t('admin.marketing.coupon.form.codeIssue.batch', 'Pre-generated batch pool')}</option>
          </select>
        </MarketingField>
        {stockType === 'LIMITED' ? (
          <MarketingField label={t('admin.marketing.coupon.form.totalQuantity', 'Total Quantity')} required>
            <input
              type="text"
              value={values.totalQuantity}
              onChange={(event) => update('totalQuantity', event.target.value)}
              className={marketingInputClassName}
            />
          </MarketingField>
        ) : null}
        <MarketingField label={t('admin.marketing.coupon.form.perUserLimit', 'Per User Limit')} required>
          <input
            type="number"
            min={1}
            value={values.perUserLimit}
            onChange={(event) => update('perUserLimit', Number(event.target.value))}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.claimStartsAt', 'Claim Starts At')}>
          <input
            type="datetime-local"
            value={values.claimStartsAt}
            onChange={(event) => update('claimStartsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.claimEndsAt', 'Claim Ends At')}>
          <input
            type="datetime-local"
            value={values.claimEndsAt}
            onChange={(event) => update('claimEndsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
      </MarketingFormSection>

      {codeIssueMode === 'BATCH' ? (
        <MarketingFormSection title={t('admin.marketing.coupon.form.batch', 'Initial Code Batch')}>
          <MarketingField label={t('admin.marketing.coupon.form.batchQuantity', 'Batch Quantity')} required>
            <input
              type="text"
              value={values.batchQuantity}
              onChange={(event) => update('batchQuantity', event.target.value)}
              className={marketingInputClassName}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.batchCodeLength', 'Code Length')}>
            <input
              type="number"
              min={12}
              max={32}
              value={values.batchCodeLength}
              onChange={(event) => update('batchCodeLength', Number(event.target.value))}
              className={marketingInputClassName}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.batchCodePrefix', 'Code Prefix')}>
            <input
              type="text"
              value={values.batchCodePrefix}
              onChange={(event) => update('batchCodePrefix', event.target.value.toUpperCase())}
              className={marketingInputClassName}
              placeholder="e.g. WELCOME"
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.batchStartsAt', 'Codes Valid From')}>
            <input
              type="datetime-local"
              value={values.batchStartsAt}
              onChange={(event) => update('batchStartsAt', event.target.value)}
              className={marketingInputClassName}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.batchExpiresAt', 'Codes Valid Until')}>
            <input
              type="datetime-local"
              value={values.batchExpiresAt}
              onChange={(event) => update('batchExpiresAt', event.target.value)}
              className={marketingInputClassName}
            />
          </MarketingField>
        </MarketingFormSection>
      ) : null}

      {validationError || error ? (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {validationError ?? error}
        </p>
      ) : null}

      <div className="mt-auto">
        <MarketingFormActions
          isSaving={isSaving}
          submitLabel={t('admin.marketing.coupon.form.create', 'Create Coupon')}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}
