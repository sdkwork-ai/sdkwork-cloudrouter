import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { SdkworkBaseDataCurrencySelect } from '@sdkwork/appbase-pc-react';
import {
  backendPromotionCampaignsList,
  normalizeCouponDiscountType,
  validateCouponDiscountTerms,
  type CouponDiscountField,
  type CouponDiscountValidationCode,
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
  /**
   * `create`：新建/复制优惠券；`edit`：编辑既有优惠券。
   *
   * 编辑模式隐藏发放设置（库存类型、总量、发码模式、初始券码批次），提交时
   * 不创建任何库存或批次；同时展示“保存会生成新规则版本、已发券码仍按原版本
   * 核销”的提示。
   */
  mode?: 'create' | 'edit';
  initialValues?: Partial<CouponOfferCreateFormValues>;
  /**
   * 编辑模式的乐观锁版本：后端 `offer.version`，int64 十进制字符串。
   * 原样通过 `onSubmit` 的第二个参数交回，绝不转成 number。
   */
  initialVersion?: string;
  onSubmit: (values: CouponOfferCreateFormValues, version?: string) => void;
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
  discountType: 'NONE',
  discountValue: '',
  minimumAmount: '',
  maximumDiscountAmount: '',
  grantAmount: '',
  bonusAmount: '',
  grantPoints: '',
  period: 'month',
  durationDays: '30',
  dailyQuota: '',
  totalQuota: '',
  productId: '',
  skuId: '',
  packageId: '',
  stockType: 'limited',
  codeIssueMode: 'realtime',
  budgetAmount: '',
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

/** 正整数（算力额度/会员积分/配额）。 */
const positiveIntegerPattern = /^[1-9][0-9]*$/;
/** 非负整数（赠送额度）。 */
const nonNegativeIntegerPattern = /^(0|[1-9][0-9]*)$/;
/** 正金额（最多两位小数，现金券以元输入）。 */
const positiveMoneyPattern = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

/**
 * 抵扣条款校验失败码 → i18n 文案。文案镜像后端 `validate_discount_terms`，
 * 让运营在字段下方直接看到被拒绝的原因，而不是提交后才收到 400。
 */
const COUPON_DISCOUNT_ISSUE_MESSAGES: Record<
  CouponDiscountValidationCode,
  { key: string; fallback: string }
> = {
  fixedDiscountRequired: {
    key: 'admin.marketing.coupon.form.fixedDiscountRequired',
    fallback: 'Fixed discount amount must be greater than 0',
  },
  percentageOutOfRange: {
    key: 'admin.marketing.coupon.form.percentageDiscountInvalid',
    fallback: 'Percentage discount must be greater than 0 and at most 100',
  },
  decimalInvalid: {
    key: 'admin.marketing.coupon.form.discountDecimalInvalid',
    fallback: 'Enter a plain decimal amount with at most 2 fraction digits (no signs, exponents or commas)',
  },
  minimumAmountInvalid: {
    key: 'admin.marketing.coupon.form.minimumAmountInvalid',
    fallback: 'Minimum order amount must be 0 or greater, with at most 2 fraction digits',
  },
  maximumDiscountNotAllowed: {
    key: 'admin.marketing.coupon.form.maximumDiscountNotAllowed',
    fallback: 'Maximum discount amount is only allowed for a percentage discount',
  },
  maximumDiscountInvalid: {
    key: 'admin.marketing.coupon.form.maximumDiscountInvalid',
    fallback: 'Maximum discount amount must be greater than 0, with at most 2 fraction digits',
  },
};

export function CouponOfferCreateDrawerForm({
  error,
  mode = 'create',
  initialValues,
  initialVersion,
  onSubmit,
}: CouponOfferCreateDrawerFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CouponOfferCreateFormValues>({
    ...INITIAL_VALUES,
    ...initialValues,
  });
  // 兑换券（EXCHANGE）：通过兑换码发放的权益券，权益子类型单独选择
  const [cardKind, setCardKind] = useState<CouponOfferCardKind>(
    initialValues?.offerType === 'EXCHANGE' ? 'exchange' : (initialValues?.benefitKind ?? 'token_bank_credit'),
  );
  const [exchangeBenefitKind, setExchangeBenefitKind] = useState<CouponOfferBenefitKind>(
    initialValues?.benefitKind ?? 'token_bank_credit',
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [discountErrors, setDiscountErrors] = useState<
    Partial<Record<CouponDiscountField, string>>
  >({});
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
    setDiscountErrors({});
  };

  /**
   * 切换抵扣方式：离开 `PERCENTAGE` 时清掉封顶金额（后端只允许百分比折扣带
   * 封顶），避免隐藏字段被原样提交后收到 400。
   */
  const changeDiscountType = (next: string) => {
    const discountType = normalizeCouponDiscountType(next);
    setValues((current) => ({
      ...current,
      discountType,
      ...(discountType === 'PERCENTAGE' ? {} : { maximumDiscountAmount: '' }),
    }));
    setValidationError(null);
    setDiscountErrors({});
  };

  const benefitKind: CouponOfferBenefitKind = cardKind === 'exchange' ? exchangeBenefitKind : cardKind;
  const isExchange = cardKind === 'exchange';
  const codeIssueMode: CouponCodeIssueMode = isExchange ? 'batch' : values.codeIssueMode;
  const stockType: CouponStockType = values.stockType;
  const discountType = normalizeCouponDiscountType(values.discountType);

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
    // 满减/折扣条款：镜像后端校验（含金额格式、区间、封顶金额的适用方式），
    // 失败时把每条原因贴到对应字段下方并阻止提交。
    const discountIssues = validateCouponDiscountTerms(values);
    if (discountIssues.length > 0) {
      const nextErrors: Partial<Record<CouponDiscountField, string>> = {};
      for (const issue of discountIssues) {
        if (nextErrors[issue.field]) {
          continue;
        }
        const message = COUPON_DISCOUNT_ISSUE_MESSAGES[issue.code];
        nextErrors[issue.field] = t(message.key, message.fallback);
      }
      setDiscountErrors(nextErrors);
      setValidationError(null);
      return;
    }
    setDiscountErrors({});
    if (benefitKind === 'token_bank_credit') {
      if (!requirePositiveInteger(values.grantAmount ?? '', t('admin.marketing.coupon.form.requiredGrant', 'Compute Credits are required for Compute Credits coupons'))) {
        return;
      }
      if (values.bonusAmount?.trim() && !nonNegativeIntegerPattern.test(values.bonusAmount.trim())) {
        setValidationError(t('admin.marketing.coupon.form.invalidBonus', 'Bonus Compute Credits must be a non-negative integer'));
        return;
      }
    }
    if (benefitKind === 'points_credit' && !requirePositiveInteger(values.grantPoints ?? '', t('admin.marketing.coupon.form.requiredPoints', 'Membership points are required for membership point coupons'))) {
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
      // 会员套餐三元组必须同时填写或同时留空：缺项会在订单侧核销前被驳回。
      const membershipTargets = [
        values.productId?.trim() ?? '',
        values.skuId?.trim() ?? '',
        values.packageId?.trim() ?? '',
      ];
      const filledMembershipTargets = membershipTargets.filter((value) => value.length > 0).length;
      if (filledMembershipTargets > 0 && filledMembershipTargets < membershipTargets.length) {
        setValidationError(t('admin.marketing.coupon.form.membershipTargetIncomplete'));
        return;
      }
      if (filledMembershipTargets === membershipTargets.length && !positiveIntegerPattern.test(values.packageId?.trim() ?? '')) {
        setValidationError(t('admin.marketing.coupon.form.invalidPackageId'));
        return;
      }
    }
    // 发放设置只在创建时生效：编辑不会创建新库存/新批次，因此也不校验这些字段。
    if (mode === 'create') {
      if (stockType === 'limited' && !requirePositiveInteger(values.totalQuantity, t('admin.marketing.coupon.form.requiredQuantity', 'Total quantity is required for limited stock'))) {
        return;
      }
      // 库存预算上限可选：留空 = 不设上限；填写时必须是大于 0 的金额。
      const budgetAmount = values.budgetAmount?.trim() ?? '';
      if (budgetAmount && (!positiveMoneyPattern.test(budgetAmount) || Number(budgetAmount) <= 0)) {
        setValidationError(t(
          'admin.marketing.coupon.form.invalidBudget',
          'Stock budget cap must be a positive amount, or left blank for no cap',
        ));
        return;
      }
      if (codeIssueMode === 'batch' && !requirePositiveInteger(values.batchQuantity ?? '', t('admin.marketing.coupon.form.requiredBatch', 'Batch quantity is required for exchange/batch code coupons'))) {
        return;
      }
    }
    onSubmit({
      ...values,
      ...(mode === 'edit' && initialVersion ? { version: initialVersion } : {}),
      benefitKind,
      offerType: isExchange ? 'EXCHANGE' : values.offerType,
      codeIssueMode,
      stockType,
      // `NONE` 只发权益：金额固定为 0；`FIXED` 不携带封顶金额。
      discountType,
      ...(discountType === 'NONE' ? { discountValue: '0', minimumAmount: '0' } : {}),
      ...(discountType === 'PERCENTAGE' ? {} : { maximumDiscountAmount: null }),
      endsAt: values.endsAt || undefined,
      claimStartsAt: values.claimStartsAt || undefined,
      claimEndsAt: values.claimEndsAt || undefined,
      batchStartsAt: values.batchStartsAt || undefined,
      batchExpiresAt: values.batchExpiresAt || undefined,
    }, mode === 'edit' ? initialVersion : undefined);
  };

  const renderBenefitFields = () => {
    if (benefitKind === 'token_bank_credit') {
      return (
        <>
          <MarketingField
            label={t('admin.marketing.coupon.form.grantAmount', 'Compute Credits to grant')}
            required
            hint={t('admin.marketing.coupon.form.grantAmountHint', 'Amount in whole Compute Credits')}
          >
            <input
              type="text"
              value={values.grantAmount ?? ''}
              onChange={(event) => update('grantAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.grantAmountPlaceholder', 'e.g. 500')}
            />
          </MarketingField>
          <MarketingField label={t('admin.marketing.coupon.form.bonusAmount', 'Bonus Compute Credits')} hint={t('admin.marketing.coupon.form.bonusAmountHint', 'Optional bonus Compute Credits on top of the grant')}>
            <input
              type="text"
              value={values.bonusAmount ?? ''}
              onChange={(event) => update('bonusAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.bonusAmountPlaceholder', 'e.g. 50')}
            />
          </MarketingField>
        </>
      );
    }
    if (benefitKind === 'points_credit') {
      return (
        <MarketingField
          label={t('admin.marketing.coupon.form.grantPoints', 'Grant Membership Points')}
          required
          hint={t('admin.marketing.coupon.form.grantPointsHint', 'Amount in whole membership points')}
        >
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
          <MarketingField
            label={t('admin.marketing.coupon.form.cashGrantAmount', 'Grant Amount ({{currency}})', {
              currency: values.currencyCode || 'CNY',
            })}
            required
          >
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
            onChange={(event) => update('period', event.target.value as 'day' | 'week' | 'month' | 'year')}
            className={marketingSelectClassName}
          >
            <option value="day">{t('admin.marketing.enums.period.day', 'Day')}</option>
            <option value="week">{t('admin.marketing.enums.period.week', 'Week')}</option>
            <option value="month">{t('admin.marketing.enums.period.month', 'Month')}</option>
            {/* Quarter is not offered: membership fulfilment only accepts
                day/week/month/year, so a quarter coupon would be rejected
                before redemption. Use month with 90-92 days instead. */}
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
        <MarketingField
          label={t('admin.marketing.coupon.form.productId')}
          hint={t('admin.marketing.coupon.form.membershipTargetHint')}
        >
          <input
            type="text"
            value={values.productId ?? ''}
            onChange={(event) => update('productId', event.target.value)}
            className={marketingInputClassName}
            placeholder={t('admin.marketing.coupon.form.membershipProductPlaceholder')}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.skuId')}>
          <input
            type="text"
            value={values.skuId ?? ''}
            onChange={(event) => update('skuId', event.target.value)}
            className={marketingInputClassName}
            placeholder={t('admin.marketing.coupon.form.membershipSkuPlaceholder')}
          />
        </MarketingField>
        <MarketingField label={t('admin.marketing.coupon.form.packageId')}>
          <input
            type="text"
            inputMode="numeric"
            value={values.packageId ?? ''}
            onChange={(event) => update('packageId', event.target.value.replace(/[^0-9]/gu, ''))}
            className={marketingInputClassName}
            placeholder={t('admin.marketing.coupon.form.membershipPackagePlaceholder')}
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
        <option value="token_bank_credit">{t('admin.marketing.coupon.form.benefit.token_bank_credit', 'Compute Credits Coupon')}</option>
        <option value="points_credit">{t('admin.marketing.coupon.form.benefit.points_credit', 'Membership Points Coupon')}</option>
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
      {mode === 'edit' ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <p className="font-medium">
            {t('admin.marketing.coupon.form.editWarningTitle', 'Saving creates a new coupon rule version')}
          </p>
          <p className="mt-1">
            {t(
              'admin.marketing.coupon.form.editWarning',
              'Coupons and codes already issued stay pinned to the rule version they were created with, so this edit does not change how existing codes redeem.',
            )}
          </p>
        </div>
      ) : null}
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

      <MarketingFormSection title={t('admin.marketing.coupon.form.discountTerms', 'Discount terms')}>
        <MarketingField
          label={t('admin.marketing.coupon.form.discountType', 'Discount Type')}
          required
          className="sm:col-span-2"
          hint={t(
            'admin.marketing.coupon.form.discountTypeHint',
            'Benefit-only coupons do not discount an order; amount-off and percentage-off coupons do.',
          )}
          // 封顶金额只在百分比折扣下渲染，此处的错误用于提示“残留封顶金额不适用”。
          error={discountType === 'PERCENTAGE' ? undefined : discountErrors.maximumDiscountAmount}
        >
          <select
            name="discountType"
            value={discountType}
            onChange={(event) => changeDiscountType(event.target.value)}
            className={marketingSelectClassName}
          >
            <option value="NONE">
              {t('admin.marketing.coupon.form.discountType.NONE', 'Benefit only (no order discount)')}
            </option>
            <option value="FIXED">
              {t('admin.marketing.coupon.form.discountType.FIXED', 'Amount off (FIXED)')}
            </option>
            <option value="PERCENTAGE">
              {t('admin.marketing.coupon.form.discountType.PERCENTAGE', 'Percentage off (PERCENTAGE)')}
            </option>
          </select>
        </MarketingField>

        {discountType !== 'NONE' ? (
          <p
            role="status"
            className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
          >
            {t(
              'admin.marketing.coupon.form.discountCheckoutPending',
              'Order-discount coupons need checkout integration: the current checkout does not apply FIXED/PERCENTAGE coupons yet, so customers cannot use this coupon at checkout.',
            )}
          </p>
        ) : null}

        {discountType === 'FIXED' ? (
          <MarketingField
            label={t('admin.marketing.coupon.form.fixedDiscountAmount', 'Discount amount ({{currency}})', {
              currency: values.currencyCode || 'CNY',
            })}
            required
            hint={t(
              'admin.marketing.coupon.form.discountAmountHint',
              'Amount taken off the order total; must be greater than 0.',
            )}
            error={discountErrors.discountValue}
          >
            <input
              type="text"
              inputMode="decimal"
              name="discountValue"
              value={values.discountValue ?? ''}
              onChange={(event) => update('discountValue', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.fixedDiscountAmountPlaceholder', 'e.g. 12.50')}
            />
          </MarketingField>
        ) : null}

        {discountType === 'PERCENTAGE' ? (
          <>
            <MarketingField
              label={t('admin.marketing.coupon.form.percentageDiscountValue', 'Discount percentage (%)')}
              required
              hint={t(
                'admin.marketing.coupon.form.discountPercentageHint',
                'Percentage taken off the order total; greater than 0 and at most 100, with up to 2 decimals. 12.5 means 12.5%.',
              )}
              error={discountErrors.discountValue}
            >
              <input
                type="text"
                inputMode="decimal"
                name="discountValue"
                value={values.discountValue ?? ''}
                onChange={(event) => update('discountValue', event.target.value)}
                className={marketingInputClassName}
                placeholder={t('admin.marketing.coupon.form.percentageDiscountValuePlaceholder', 'e.g. 12.5')}
              />
            </MarketingField>
            <MarketingField
              label={t('admin.marketing.coupon.form.maximumDiscountAmount', 'Maximum Discount Amount')}
              hint={t(
                'admin.marketing.coupon.form.maximumDiscountAmountHint',
                'Optional cap on the percentage discount; must be greater than 0.',
              )}
              error={discountErrors.maximumDiscountAmount}
            >
              <input
                type="text"
                inputMode="decimal"
                name="maximumDiscountAmount"
                value={values.maximumDiscountAmount ?? ''}
                onChange={(event) => update('maximumDiscountAmount', event.target.value)}
                className={marketingInputClassName}
                placeholder={t('admin.marketing.coupon.form.maximumDiscountAmountPlaceholder', 'e.g. 20')}
              />
            </MarketingField>
          </>
        ) : null}

        {discountType !== 'NONE' ? (
          <MarketingField
            label={t('admin.marketing.coupon.form.minimumOrderAmount', 'Minimum order amount')}
            hint={t(
              'admin.marketing.coupon.form.minimumAmountHint',
              'Optional; leave blank or 0 for no minimum order amount.',
            )}
            error={discountErrors.minimumAmount}
          >
            <input
              type="text"
              inputMode="decimal"
              name="minimumAmount"
              value={values.minimumAmount ?? ''}
              onChange={(event) => update('minimumAmount', event.target.value)}
              className={marketingInputClassName}
              placeholder={t('admin.marketing.coupon.form.minimumOrderAmountPlaceholder', '0')}
            />
          </MarketingField>
        ) : null}
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

      {mode === 'create' ? (
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
              <MarketingField
                label={t('admin.marketing.coupon.form.budgetAmount', 'Stock Budget Cap')}
                hint={t(
                  'admin.marketing.coupon.form.budgetAmountHint',
                  'Optional cap in {{currency}}, enforced at discount-application time (reserve → settle/release); it only affects monetary discounts. Leave blank for no cap.',
                  { currency: values.currencyCode || 'CNY' },
                )}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={values.budgetAmount ?? ''}
                  onChange={(event) => update('budgetAmount', event.target.value)}
                  className={marketingInputClassName}
                  placeholder={t('admin.marketing.coupon.form.budgetAmountPlaceholder', 'e.g. 5000')}
                />
              </MarketingField>
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
      ) : null}

      {validationError || error ? (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {validationError ?? error}
        </p>
      ) : null}
    </form>
  );
}
