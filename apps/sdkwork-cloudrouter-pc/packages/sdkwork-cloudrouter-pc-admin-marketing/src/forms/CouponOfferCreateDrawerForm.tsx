import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { SdkworkBaseDataCurrencySelect } from '@sdkwork/appbase-pc-react';
import {
  backendPromotionCampaignsList,
  type CouponOfferCreateFormValues,
  type CouponOfferBenefitKind,
  type CouponCodeIssueMode,
  type CouponStockType,
} from '../marketingService';
import {
  CouponBenefitTypeSelector,
  type CouponOfferCardKind,
} from '../components/CouponBenefitTypeSelector';
import {
  marketingInputClassName,
  marketingSelectClassName,
  MarketingField,
  MarketingFormSection,
} from '../components/MarketingFormControls';

export interface CouponOfferCreateDrawerFormProps {
  error: string | null;
  initialValue?: Partial<CouponOfferCreateFormValues>;
  onSubmit: (values: CouponOfferCreateFormValues) => void;
}

const INITIAL_VALUES: CouponOfferCreateFormValues = {
  campaignId: '',
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
  currencyCode: 'CNY',
  grantAmount: '',
  bonusAmount: '',
  grantPoints: '',
  period: 'month',
  durationDays: '30',
  dailyQuota: '',
  totalQuota: '',
  stockType: 'limited',
  codeIssueMode: 'realtime',
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

/** 正整数（Token Bank 额度/积分/配额）。 */
const positiveIntegerPattern = /^[1-9][0-9]*$/;
/** 非负整数（赠送额度）。 */
const nonNegativeIntegerPattern = /^(0|[1-9][0-9]*)$/;
/** 正金额（最多两位小数，现金券以元输入）。 */
const positiveMoneyPattern = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

export function CouponOfferCreateDrawerForm({
  error,
  initialValue,
  onSubmit,
}: CouponOfferCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CouponOfferCreateFormValues>({
    ...INITIAL_VALUES,
    ...initialValue,
  });
  // 兑换券（EXCHANGE）：通过兑换码发放的权益券，权益子类型单独选择
  const [cardKind, setCardKind] = useState<CouponOfferCardKind>(
    initialValue?.offerType === 'EXCHANGE' ? 'exchange' : (initialValue?.benefitKind ?? 'token_bank_credit'),
  );
  const [exchangeBenefitKind, setExchangeBenefitKind] = useState<CouponOfferBenefitKind>(
    initialValue?.benefitKind ?? 'token_bank_credit',
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    void backendPromotionCampaignsList({ page: 1, pageSize: 200 })
      .then((page) => {
        if (!cancelled) {
          setCampaignOptions(page.items.map((item) => ({
            id: String(item['id']),
            label: String(item['displayName'] ?? ''),
          })));
        }
      })
      .catch(() => {
        // 活动列表加载失败不影响券创建
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = <K extends keyof CouponOfferCreateFormValues>(
    key: K,
    value: CouponOfferCreateFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const benefitKind: CouponOfferBenefitKind = cardKind === 'exchange' ? exchangeBenefitKind : cardKind;
  const isExchange = cardKind === 'exchange';
  const codeIssueMode: CouponCodeIssueMode = isExchange ? 'batch' : values.codeIssueMode;
  const stockType: CouponStockType = values.stockType;

  const requirePositiveInteger = (value: string, message: string): boolean => {
    if (!positiveIntegerPattern.test(value.trim())) {
      setValidationError(message);
      return false;
    }
    return true;
  };

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
      if (!requirePositiveInteger(values.grantAmount ?? '', t('admin.marketing.coupon.form.requiredGrant', 'Grant amount is required for token bank credit coupons'))) {
        return;
      }
      if (values.bonusAmount?.trim() && !nonNegativeIntegerPattern.test(values.bonusAmount.trim())) {
        setValidationError(t('admin.marketing.coupon.form.invalidBonus', 'Bonus amount must be a non-negative integer'));
        return;
      }
    }
    if (benefitKind === 'points_credit' && !requirePositiveInteger(values.grantPoints ?? '', t('admin.marketing.coupon.form.requiredPoints', 'Grant points are required for points coupons'))) {
      return;
    }
    if (benefitKind === 'cash_credit') {
      const cashAmount = values.grantAmount?.trim() ?? '';
      if (!cashAmount || !positiveMoneyPattern.test(cashAmount) || Number(cashAmount) <= 0) {
        setValidationError(t('admin.marketing.coupon.form.requiredCash', 'Grant amount is required for cash coupons and must be a positive amount'));
        return;
      }
    }
    if (benefitKind === 'subscription') {
      if (!requirePositiveInteger(values.dailyQuota ?? '', t('admin.marketing.coupon.form.requiredSubscription', 'Daily quota and total quota are required for member card coupons'))) {
        return;
      }
      if (!requirePositiveInteger(values.totalQuota ?? '', t('admin.marketing.coupon.form.requiredSubscription', 'Daily quota and total quota are required for member card coupons'))) {
        return;
      }
      if (Number(values.totalQuota) < Number(values.dailyQuota)) {
        setValidationError(t('admin.marketing.coupon.form.totalBelowDaily', 'Total quota must not be less than daily quota'));
        return;
      }
    }
    if (stockType === 'limited' && !requirePositiveInteger(values.totalQuantity, t('admin.marketing.coupon.form.requiredQuantity', 'Total quantity is required for limited stock'))) {
      return;
    }
    if (codeIssueMode === 'batch' && !requirePositiveInteger(values.batchQuantity ?? '', t('admin.marketing.coupon.form.requiredBatch', 'Batch quantity is required for exchange/batch code coupons'))) {
      return;
    }
    onSubmit({
      ...values,
      benefitKind,
      offerType: isExchange ? 'EXCHANGE' : values.offerType,
      codeIssueMode,
      stockType,
      endsAt: values.endsAt || undefined,
      claimStartsAt: values.claimStartsAt || undefined,
      claimEndsAt: values.claimEndsAt || undefined,
      batchStartsAt: values.batchStartsAt || undefined,
      batchExpiresAt: values.batchExpiresAt || undefined,
    });
  };

  const renderBenefitFields = () => {
    if (benefitKind === 'token_bank_credit') {
      return (
        <>
          <MarketingField label={t('admin.marketing.coupon.form.grantAmount', 'Grant Amount')} required>
            <input
              type="text"
              value={values.grantAmount ?? ''}
              onChange={(event) => update('grantAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.grantAmountPlaceholder', 'e.g. 500')}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.bonusAmount', 'Bonus Amount')} hint={t('admin.marketing.coupon.form.bonusAmountHint', 'Optional granted bonus on top of the grant amount')}>
            <input
              type="text"
              value={values.bonusAmount ?? ''}
              onChange={(event) => update('bonusAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.bonusAmountPlaceholder', 'e.g. 50')}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} required>
            <SdkworkBaseDataCurrencySelect
              className={marketingInputClassName}
              emptyText={t('admin.marketing.coupon.form.currencyEmpty', 'No matching currency')}
              onValueChange={(value) => update('currencyCode', value)}
              placeholder={t('admin.marketing.coupon.form.currencyCodePlaceholder', 'CNY')}
              searchPlaceholder={t('admin.marketing.coupon.form.currencySearch', 'Search currency by code or name')}
              value={values.currencyCode}
            />
          </MarketingField>
        </>
      );
    }
    if (benefitKind === 'points_credit') {
      return (
        <MarketingField label={t('admin.marketing.coupon.form.grantPoints', 'Grant Points')} required>
          <input
            type="text"
            value={values.grantPoints ?? ''}
            onChange={(event) => update('grantPoints', event.target.value)}
            className={marketingInputClassName}
            placeholder={t('admin.marketing.coupon.form.grantPointsPlaceholder', 'e.g. 1000')}
          />
        </MarketingField>
      );
    }
    if (benefitKind === 'cash_credit') {
      return (
        <>
          <MarketingField label={t('admin.marketing.coupon.form.cashGrantAmount', 'Grant Amount (CNY)')} required>
            <input
              type="text"
              value={values.grantAmount ?? ''}
              onChange={(event) => update('grantAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.grantAmountPlaceholder', 'e.g. 500')}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} required>
            <SdkworkBaseDataCurrencySelect
              className={marketingInputClassName}
              emptyText={t('admin.marketing.coupon.form.currencyEmpty', 'No matching currency')}
              onValueChange={(value) => update('currencyCode', value)}
              placeholder={t('admin.marketing.coupon.form.currencyCodePlaceholder', 'CNY')}
              searchPlaceholder={t('admin.marketing.coupon.form.currencySearch', 'Search currency by code or name')}
              value={values.currencyCode}
            />
          </MarketingField>
        </>
      );
    }
    // 订阅会员卡：兑换/领取后开通会员卡，卡承载每日使用限额与总额度（额度与消耗记录）
    return (
      <>
        <MarketingField label={t('admin.marketing.coupon.form.period', 'Period')} required>
          <select
            value={values.period ?? 'month'}
            onChange={(event) => update('period', event.target.value as 'day' | 'week' | 'month' | 'quarter' | 'year')}
            className={marketingSelectClassName}
          >
            <option value="day">{t('admin.marketing.enums.period.day', 'Day')}</option>
            <option value="week">{t('admin.marketing.enums.period.week', 'Week')}</option>
            <option value="month">{t('admin.marketing.enums.period.month', 'Month')}</option>
            <option value="quarter">{t('admin.marketing.enums.period.quarter', 'Quarter')}</option>
            <option value="year">{t('admin.marketing.enums.period.year', 'Year')}</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.durationDays', 'Duration Days')} required>
          <input
            type="text"
            value={values.durationDays ?? '30'}
            onChange={(event) => update('durationDays', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.dailyQuota', 'Daily Quota')} required hint={t('admin.marketing.coupon.form.dailyQuotaHint', 'Max usage per day on the member card')}>
          <input
            type="text"
            value={values.dailyQuota ?? ''}
            onChange={(event) => update('dailyQuota', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.totalQuota', 'Total Quota')} required hint={t('admin.marketing.coupon.form.totalQuotaHint', 'Total usage limit of the member card; consumption is recorded')}>
          <input
            type="text"
            value={values.totalQuota ?? ''}
            onChange={(event) => update('totalQuota', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
      </>
    );
  };

  const renderExchangeBenefitSelector = () => (
    <MarketingField
      label={t('admin.marketing.coupon.form.exchangeBenefit', 'Redeemable Benefit')}
      required
      className="sm:col-span-2"
      hint={t('admin.marketing.coupon.form.exchangeBenefitHint', 'Users redeem a code to receive this benefit')}
    >
      <select
        value={exchangeBenefitKind}
        onChange={(event) => setExchangeBenefitKind(event.target.value as CouponOfferBenefitKind)}
        className={marketingSelectClassName}
      >
        <option value="token_bank_credit">{t('admin.marketing.coupon.form.benefit.token_bank_credit', 'Token Bank Credit')}</option>
        <option value="points_credit">{t('admin.marketing.coupon.form.benefit.points_credit', 'Points Credit')}</option>
        <option value="cash_credit">{t('admin.marketing.coupon.form.benefit.cash_credit', 'Cash Credit')}</option>
        <option value="subscription">{t('admin.marketing.coupon.form.benefit.subscription', 'Member Card')}</option>
      </select>
    </MarketingField>
  );

  const renderCodeBatchFields = () => (
    <MarketingFormSection title={t('admin.marketing.coupon.form.batch', 'Exchange Code Pool')}>
      <MarketingField label={t('admin.marketing.coupon.form.batchQuantity', 'Code Quantity')} required>
        <input
          type="text"
          value={values.batchQuantity ?? ''}
          onChange={(event) => update('batchQuantity', event.target.value)}
          className={marketingInputClassName}
        />
      </MarketingField>
      <MarketingField label={t('admin.marketing.coupon.form.batchCodeLength', 'Code Length')}>
        <input
          type="number"
          min={12}
          max={32}
          value={values.batchCodeLength ?? 16}
          onChange={(event) => update('batchCodeLength', Number(event.target.value))}
          className={marketingInputClassName}
        />
      </MarketingField>
      <MarketingField label={t('admin.marketing.coupon.form.batchCodePrefix', 'Code Prefix')}>
        <input
          type="text"
          value={values.batchCodePrefix ?? ''}
          onChange={(event) => update('batchCodePrefix', event.target.value.toUpperCase())}
          className={marketingInputClassName}
          placeholder={t('admin.marketing.coupon.form.codePrefixPlaceholder', 'e.g. WELCOME')}
        />
      </MarketingField>
      <MarketingField label={t('admin.marketing.coupon.form.batchStartsAt', 'Codes Valid From')}>
        <input
          type="datetime-local"
          value={values.batchStartsAt ?? ''}
          onChange={(event) => update('batchStartsAt', event.target.value)}
          className={marketingInputClassName}
        />
      </MarketingField>
      <MarketingField label={t('admin.marketing.coupon.form.batchExpiresAt', 'Codes Valid Until')}>
        <input
          type="datetime-local"
          value={values.batchExpiresAt ?? ''}
          onChange={(event) => update('batchExpiresAt', event.target.value)}
          className={marketingInputClassName}
        />
      </MarketingField>
    </MarketingFormSection>
  );

  return (
    <form id="couponOfferCreateForm" onSubmit={handleSubmit} className="flex h-full flex-col">
      <MarketingFormSection title={t('admin.marketing.coupon.form.basic', 'Basic Information')}>
        <MarketingField label={t('admin.marketing.coupon.form.name', 'Coupon Name')} required>
          <input
            type="text"
            value={values.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            className={marketingInputClassName}
            placeholder={t('admin.marketing.coupon.form.namePlaceholder', 'e.g. New User Welcome Coupon')}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.campaigns.form.campaign', 'Campaign')}>
          <select
            value={values.campaignId ?? ''}
            onChange={(event) => update('campaignId', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="">{t('admin.marketing.campaigns.form.noCampaign', 'No campaign')}</option>
            {campaignOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </MarketingField>
        <MarketingField
          label={t('admin.marketing.coupon.form.benefitKind', 'Coupon Type')}
          required
          className="sm:col-span-2"
        >
          <CouponBenefitTypeSelector value={cardKind} onChange={setCardKind} />
        </MarketingField>
        <MarketingField
          label={t('admin.marketing.coupon.form.description', 'Description')}
          className="sm:col-span-2"
        >
          <textarea
            value={values.description ?? ''}
            onChange={(event) => update('description', event.target.value)}
            className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </MarketingField>
      </MarketingFormSection>

      <MarketingFormSection title={t('admin.marketing.coupon.form.benefit', 'Benefit')}>
        {isExchange ? renderExchangeBenefitSelector() : null}
        {renderBenefitFields()}
      </MarketingFormSection>

      <MarketingFormSection title={t('admin.marketing.coupon.form.usage', 'Validity & Rules')}>
        <MarketingField label={t('admin.marketing.coupon.form.goodsScope', 'Goods Scope')} required>
          <select
            value={values.goodsScope}
            onChange={(event) => update('goodsScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">{t('admin.marketing.enums.goodsScope.ALL', 'All goods')}</option>
            <option value="RECHARGE">{t('admin.marketing.enums.goodsScope.RECHARGE', 'Recharge')}</option>
            <option value="SUBSCRIPTION">{t('admin.marketing.enums.goodsScope.SUBSCRIPTION', 'Subscription')}</option>
          </select>
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.audience', 'Audience Scope')} required>
          <select
            value={values.audienceScope}
            onChange={(event) => update('audienceScope', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="ALL">{t('admin.marketing.enums.audience.ALL', 'All users')}</option>
            <option value="NEW_USER">{t('admin.marketing.enums.audience.NEW_USER', 'New users')}</option>
            <option value="RETURNING_USER">{t('admin.marketing.enums.audience.RETURNING_USER', 'Returning users')}</option>
          </select>
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
            value={values.endsAt ?? ''}
            onChange={(event) => update('endsAt', event.target.value)}
            className={marketingInputClassName}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.combinability', 'Combinability')} required>
          <select
            value={values.combinability}
            onChange={(event) => update('combinability', event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="EXCLUSIVE">{t('admin.marketing.enums.combinability.EXCLUSIVE', 'Exclusive')}</option>
            <option value="COMBINABLE">{t('admin.marketing.enums.combinability.COMBINABLE', 'Combinable')}</option>
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
        <MarketingField label={t('admin.marketing.coupon.form.offerType', 'Offer Type')} required>
          <select
            value={values.offerType}
            onChange={(event) => update('offerType', event.target.value)}
            className={marketingSelectClassName}
            disabled={isExchange}
          >
            <option value="COUPON">{t('admin.marketing.enums.offerType.COUPON', 'Coupon')}</option>
            <option value="VOUCHER">{t('admin.marketing.enums.offerType.VOUCHER', 'Voucher')}</option>
            <option value="DISCOUNT">{t('admin.marketing.enums.offerType.DISCOUNT', 'Discount')}</option>
            <option value="EXCHANGE">{t('admin.marketing.enums.offerType.EXCHANGE', 'Exchange')}</option>
          </select>
        </MarketingField>
      </MarketingFormSection>

      <details className="group mb-6 rounded-md border border-slate-200 dark:border-white/10">
        <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>{t('admin.marketing.coupon.form.advanced', 'Advanced Settings')}</span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 px-4 py-4 dark:border-white/5">
          <MarketingFormSection title={t('admin.marketing.coupon.form.issuance', 'Issuance Settings')}>
            <MarketingField label={t('admin.marketing.coupon.form.stockType', 'Stock Type')} required>
              <select
                value={stockType}
                onChange={(event) => update('stockType', event.target.value as CouponStockType)}
                className={marketingSelectClassName}
              >
                <option value="limited">{t('admin.marketing.enums.stockType.LIMITED', 'Limited')}</option>
                <option value="unlimited">{t('admin.marketing.enums.stockType.UNLIMITED', 'Unlimited')}</option>
              </select>
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.codeIssueMode', 'Code Issuance Mode')} required>
              <select
                value={codeIssueMode}
                onChange={(event) => update('codeIssueMode', event.target.value as CouponCodeIssueMode)}
                className={marketingSelectClassName}
                disabled={isExchange}
              >
                <option value="realtime">{t('admin.marketing.coupon.form.codeIssue.realtime', 'Generate at claim time')}</option>
                <option value="batch">{t('admin.marketing.coupon.form.codeIssue.batch', 'Pre-generated batch pool')}</option>
              </select>
            </MarketingField>
            {stockType === 'limited' ? (
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
                value={values.claimStartsAt ?? ''}
                onChange={(event) => update('claimStartsAt', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
            <MarketingField label={t('admin.marketing.coupon.form.claimEndsAt', 'Claim Ends At')}>
              <input
                type="datetime-local"
                value={values.claimEndsAt ?? ''}
                onChange={(event) => update('claimEndsAt', event.target.value)}
                className={marketingInputClassName}
              />
            </MarketingField>
          </MarketingFormSection>
          {codeIssueMode === 'batch' ? renderCodeBatchFields() : null}
        </div>
      </details>

      {validationError || error ? (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {validationError ?? error}
        </p>
      ) : null}
    </form>
  );
}
