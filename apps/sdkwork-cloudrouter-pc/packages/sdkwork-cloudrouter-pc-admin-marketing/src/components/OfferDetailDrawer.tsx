import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingDrawer } from './MarketingDrawer';
import { marketingEnumLabel } from './MarketingValueBadge';
import {
  formatMarketingAmountMinor,
  formatMarketingInteger,
  formatMarketingPercent,
  formatMarketingTimestamp,
  MARKETING_EMPTY_VALUE,
  readCouponBenefit,
  readCouponDiscountTerms,
  retrievePromotionOffer,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

/**
 * 金额小数文本（后端 `numeric` 投影，主单位）→ 两位小数 + 币种。
 * 只接受十进制字面量；解析失败时原样返回，由调用方给出说明。
 */
const MARKETING_DECIMAL_AMOUNT_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/u;

interface OfferAmountDisplay {
  text: string;
  /** 解析失败时解释原始值为何不能按金额展示（悬停可见）。 */
  title?: string;
  muted?: boolean;
}

interface OfferDetailDrawerProps {
  offerId: string | null;
  onClose: () => void;
  /**
   * 打开编辑流程：由页面注入同一个编辑抽屉，详情抽屉只负责触发，不复制逻辑。
   * 参数是当前优惠券 id。
   */
  onEdit?: (offerId: string) => void;
}

function formatOfferDecimalAmount(
  value: unknown,
  currency: string,
  locale: string,
  unparsedTitle: string,
): OfferAmountDisplay {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) {
    return { text: MARKETING_EMPTY_VALUE };
  }
  const match = MARKETING_DECIMAL_AMOUNT_PATTERN.exec(raw);
  if (!match) {
    return { text: raw, title: unparsedTitle, muted: true };
  }
  const [, sign, wholeText, fractionText = ''] = match;
  let whole = wholeText;
  try {
    whole = new Intl.NumberFormat(locale.trim() || 'en').format(BigInt(wholeText));
  } catch {
    whole = wholeText;
  }
  const fraction = fractionText.padEnd(2, '0').slice(0, 2);
  return { text: `${sign === '-' ? '-' : ''}${whole}.${fraction} ${currency}` };
}

function DetailRow({
  label,
  value,
  muted = false,
  title,
}: {
  label: string;
  value: unknown;
  /** 值为不可解析的原始文本时用弱色展示，避免看起来像已格式化的金额。 */
  muted?: boolean;
  title?: string;
}) {
  const { i18n } = useTranslation();
  // 空值 `—`；时间统一成本地 YYYY-MM-DD HH:mm；不可解析的文本原样展示。
  const text = formatMarketingTimestamp(
    value === null || value === undefined ? '' : String(value),
    i18n.language,
  );
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 text-sm dark:border-white/5">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`text-right ${muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}
        title={title}
      >
        {text}
      </span>
    </div>
  );
}

export function OfferDetailDrawer({ offerId, onClose, onEdit }: OfferDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const [offer, setOffer] = useState<ApiRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { stockByOffer } = usePromotionReferences();

  useEffect(() => {
    if (!offerId) {
      setOffer(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setOffer(null);
    setError(null);
    void retrievePromotionOffer(offerId)
      .then((value) => {
        if (!cancelled) {
          setOffer(value as unknown as ApiRecord);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(resolveProblemMessage(loadError, t, t('admin.marketing.offers.detail.loadError', 'Failed to load offer')));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const stocks = offerId ? (stockByOffer[offerId] ?? []) : [];
  // 币种来自 offer 自身；仅在缺失时使用 i18n 的“币种未知”，不再硬编码 CNY。
  const offerCurrencyCode = offer
    ? String(offer['currencyCode'] ?? offer['currency_code'] ?? '').trim()
    : '';
  const currencyLabel = offerCurrencyCode
    || t('admin.marketing.offers.detail.currencyUnknown', 'Currency unknown');
  // 满减/折扣条款：`NONE`（仅权益）不额外渲染，权益区块已经说明发什么。
  const discountTerms = offer ? readCouponDiscountTerms(offer) : null;
  const unparsedOfferAmountTitle = t(
    'admin.marketing.offers.detail.minimumAmountUnparsed',
    'Raw value: not a decimal amount, shown exactly as received.',
  );
  const minimumAmount = formatOfferDecimalAmount(
    discountTerms?.minimumAmount ?? undefined,
    currencyLabel,
    i18n.language,
    unparsedOfferAmountTitle,
  );
  const fixedDiscountAmount = discountTerms?.discountType === 'FIXED'
    ? formatOfferDecimalAmount(
        discountTerms.discountValue ?? undefined,
        currencyLabel,
        i18n.language,
        unparsedOfferAmountTitle,
      )
    : null;
  const maximumDiscountAmount = discountTerms?.discountType === 'PERCENTAGE'
    ? formatOfferDecimalAmount(
        discountTerms.maximumDiscountAmount ?? undefined,
        currencyLabel,
        i18n.language,
        unparsedOfferAmountTitle,
      )
    : null;

  return (
    <MarketingDrawer
      title={t('admin.marketing.offers.detail.title', 'Coupon Offer Detail')}
      description={offer ? String(offer['displayName'] ?? '') : undefined}
      isOpen={offerId !== null}
      onClose={onClose}
      footer={offer && onEdit ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onEdit(String(offer['id']))}
            className="inline-flex items-center gap-1.5 rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 focus-visible:ring-2 focus-visible:ring-lobster-500"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t('admin.marketing.promotions.offers.edit', 'Edit')}
          </button>
        </div>
      ) : undefined}
    >
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      ) : offer ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.marketing.offers.detail.basic', 'Basic Information')}
          </h4>
          <DetailRow label={t('admin.col.offerNo', 'Offer No')} value={offer['offerNo']} />
          <DetailRow label={t('admin.marketing.coupon.form.name', 'Coupon Name')} value={offer['displayName']} />
          <DetailRow label={t('admin.col.type', 'Type')} value={marketingEnumLabel(offer['offerType'], 'admin.marketing.enums.offerType', t)} />
          <DetailRow label={t('admin.col.audience', 'Audience')} value={marketingEnumLabel(offer['audienceScope'], 'admin.marketing.enums.audience', t)} />
          <DetailRow label={t('admin.marketing.coupon.form.combinability', 'Combinability')} value={marketingEnumLabel(offer['combinability'], 'admin.marketing.enums.combinability', t)} />
          <DetailRow label={t('admin.marketing.coupon.form.goodsScope', 'Goods Scope')} value={marketingEnumLabel(offer['goodsScope'], 'admin.marketing.enums.goodsScope', t)} />
          <DetailRow label={t('admin.marketing.coupon.form.priority', 'Priority')} value={offer['priority']} />
          <DetailRow label={t('admin.marketing.coupon.form.startsAt', 'Starts At')} value={offer['startsAt']} />
          <DetailRow label={t('admin.marketing.coupon.form.endsAt', 'Ends At')} value={offer['endsAt']} />
          <DetailRow
            label={t('admin.col.status', 'Status')}
            value={offer['status'] === 'active'
              ? t('admin.marketing.promotions.status.active', 'Active')
              : t('admin.marketing.promotions.status.inactive', 'Inactive')}
          />
          <DetailRow label={t('admin.col.version', 'Version')} value={offer['version']} />
          <DetailRow label={t('admin.col.updated', 'Updated')} value={offer['updatedAt']} />

          <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.marketing.offers.detail.benefit', 'Benefit')}
          </h4>
          <DetailRow label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} value={offer['currencyCode'] ?? offer['currency_code']} />
          {(() => {
            const benefit = readCouponBenefit(offer as ApiRecord);
            if (!benefit) {
              return <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={MARKETING_EMPTY_VALUE} />;
            }
            const kindLabel = t(`admin.marketing.coupon.form.benefit.${benefit.kind}`);
            switch (benefit.kind) {
              case 'token_bank_credit':
                return (
                  <>
                    <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={kindLabel} />
                    <DetailRow
                      label={t('admin.marketing.offers.detail.tokenBankGrantAmount', 'Grant Amount (Compute Credits)')}
                      value={formatMarketingInteger(benefit.grantAmount)}
                    />
                    {benefit.bonusAmount ? (
                      <DetailRow
                        label={t('admin.marketing.offers.detail.tokenBankBonusAmount', 'Bonus Amount (Compute Credits)')}
                        value={formatMarketingInteger(benefit.bonusAmount)}
                      />
                    ) : null}
                  </>
                );
              case 'points_credit':
                return (
                  <>
                    <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={kindLabel} />
                    <DetailRow label={t('admin.marketing.coupon.form.grantPoints', 'Grant Points')} value={benefit.grantPoints} />
                  </>
                );
              case 'cash_credit':
                return (
                  <>
                    <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={kindLabel} />
                    <DetailRow
                      label={t(
                        'admin.marketing.offers.detail.cashGrantAmount',
                        'Grant Amount ({{currency}})',
                        { currency: currencyLabel },
                      )}
                      value={formatMarketingAmountMinor(benefit.grantAmount, currencyLabel, i18n.language)}
                    />
                  </>
                );
              case 'subscription':
                return (
                  <>
                    <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={kindLabel} />
                    <DetailRow label={t('admin.marketing.coupon.form.period', 'Period')} value={marketingEnumLabel(benefit.period, 'admin.marketing.enums.period', t)} />
                    <DetailRow label={t('admin.marketing.coupon.form.durationDays', 'Duration Days')} value={benefit.durationDays} />
                    <DetailRow label={t('admin.marketing.coupon.form.dailyQuota', 'Daily Quota')} value={benefit.dailyQuota} />
                    <DetailRow label={t('admin.marketing.coupon.form.totalQuota', 'Total Quota')} value={benefit.totalQuota} />
                  </>
                );
            }
          })()}

          {discountTerms ? (
            <>
              <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.marketing.offers.detail.discountTerms', 'Discount terms')}
              </h4>
              <DetailRow
                label={t('admin.marketing.coupon.form.discountType', 'Discount Type')}
                value={discountTerms.discountType === 'FIXED'
                  ? t('admin.marketing.offers.detail.discountKindFixed', 'Fixed amount off')
                  : t('admin.marketing.offers.detail.discountKindPercentage', 'Percentage off')}
              />
              {discountTerms.discountType === 'FIXED' && fixedDiscountAmount ? (
                <DetailRow
                  label={t('admin.marketing.offers.detail.discountAmount', 'Discount amount')}
                  value={fixedDiscountAmount.text}
                  muted={fixedDiscountAmount.muted}
                  title={fixedDiscountAmount.title}
                />
              ) : (
                <DetailRow
                  label={t('admin.marketing.offers.detail.discountPercentage', 'Discount percentage')}
                  value={formatMarketingPercent(discountTerms.discountValue)}
                />
              )}
              <DetailRow
                label={t('admin.marketing.coupon.form.minimumAmount', 'Minimum Amount')}
                value={minimumAmount.text}
                muted={minimumAmount.muted}
                title={minimumAmount.title}
              />
              {discountTerms.discountType === 'PERCENTAGE' && maximumDiscountAmount ? (
                <DetailRow
                  label={t('admin.marketing.coupon.form.maximumDiscountAmount', 'Maximum Discount Amount')}
                  value={maximumDiscountAmount.text}
                  muted={maximumDiscountAmount.muted}
                  title={maximumDiscountAmount.title}
                />
              ) : null}
            </>
          ) : null}

          {stocks.length > 0 ? (
            <>
              <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.marketing.offers.detail.issuance', 'Issuance Settings')}
              </h4>
              {stocks.map((stock) => (
                <div key={String(stock['id'])}>
                  <DetailRow label={t('admin.col.stock', 'Stock')} value={stock['stockNo']} />
                  <DetailRow label={t('admin.col.stockType', 'Stock Type')} value={marketingEnumLabel(stock['stockType'], 'admin.marketing.enums.stockType', t)} />
                  <DetailRow
                    label={t('admin.col.codeIssueMode', 'Code Mode')}
                    value={stock['codeIssueMode'] === 'batch'
                      ? t('admin.marketing.promotions.codeIssue.batch', 'Batch Pool')
                      : t('admin.marketing.promotions.codeIssue.realtime', 'Realtime')}
                  />
                  <DetailRow
                    label={t('admin.col.total', 'Total')}
                    value={stock['stockType'] === 'unlimited' ? '∞' : stock['totalQuantity']}
                  />
                  <DetailRow label={t('admin.col.available', 'Available')} value={stock['availableQuantity']} />
                  <DetailRow label={t('admin.col.claimed', 'Claimed')} value={stock['claimedQuantity']} />
                  <DetailRow label={t('admin.col.redeemed', 'Redeemed')} value={stock['redeemedQuantity']} />
                  <DetailRow label={t('admin.col.perUserLimit', 'Per User')} value={stock['perUserLimit']} />
                  <DetailRow label={t('admin.col.claimStartsAt', 'Claim Starts')} value={stock['claimStartsAt']} />
                  <DetailRow label={t('admin.col.claimEndsAt', 'Claim Ends')} value={stock['claimEndsAt']} />
                </div>
              ))}
            </>
          ) : null}

          {offer['description'] ? (
            <>
              <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.marketing.coupon.form.description', 'Description')}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">{String(offer['description'])}</p>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.marketing.offers.detail.loading', 'Loading offer...')}</p>
      )}
    </MarketingDrawer>
  );
}
