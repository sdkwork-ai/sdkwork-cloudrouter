import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingDrawer } from './MarketingDrawer';
import { marketingEnumLabel } from './MarketingValueBadge';
import {
  formatMarketingAmountMinor,
  readCouponBenefit,
  retrievePromotionOffer,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

interface OfferDetailDrawerProps {
  offerId: string | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  let text = value === null || value === undefined || value === '' ? '-' : String(value);
  // 后端时间字段为 ISO 8601（含 T），展示为本地时间
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      text = date.toLocaleString();
    }
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 text-sm dark:border-white/5">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-slate-900 dark:text-white">{text}</span>
    </div>
  );
}

export function OfferDetailDrawer({ offerId, onClose }: OfferDetailDrawerProps) {
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
          setError(loadError instanceof Error ? loadError.message : t('admin.marketing.offers.detail.loadError', 'Failed to load offer'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const stocks = offerId ? (stockByOffer[offerId] ?? []) : [];

  return (
    <MarketingDrawer
      title={t('admin.marketing.offers.detail.title', 'Coupon Offer Detail')}
      description={offer ? String(offer['displayName'] ?? '') : undefined}
      isOpen={offerId !== null}
      onClose={onClose}
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
          <DetailRow label={t('admin.col.discountType', 'Discount Type')} value={marketingEnumLabel(offer['discountType'], 'admin.marketing.enums.discountType', t)} />
          <DetailRow label={t('admin.marketing.coupon.form.minimumAmount', 'Minimum Amount')} value={offer['minimumAmount']} />
          <DetailRow label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} value={offer['currencyCode']} />
          {(() => {
            const benefit = readCouponBenefit(offer as ApiRecord);
            if (!benefit) {
              return <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value="-" />;
            }
            const kindLabel = t(`admin.marketing.coupon.form.benefit.${benefit.kind}`);
            switch (benefit.kind) {
              case 'token_bank_credit':
                return (
                  <>
                    <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={kindLabel} />
                    <DetailRow label={t('admin.marketing.coupon.form.grantAmount', 'Grant Amount')} value={benefit.grantAmount} />
                    {benefit.bonusAmount ? (
                      <DetailRow label={t('admin.marketing.coupon.form.bonusAmount', 'Bonus Amount')} value={benefit.bonusAmount} />
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
                      label={t('admin.marketing.coupon.form.cashGrantAmount', 'Grant Amount (CNY)')}
                      value={formatMarketingAmountMinor(benefit.grantAmount, String(offer['currencyCode'] ?? ''), i18n.language)}
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
