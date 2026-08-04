import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingDrawer } from './MarketingDrawer';
import { retrievePromotionOffer } from '../marketingService';

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
  const { t } = useTranslation();
  const [offer, setOffer] = useState<ApiRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setError(loadError instanceof Error ? loadError.message : 'Failed to load offer');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  return (
    <MarketingDrawer
      title={t('admin.marketing.offers.detail.title', 'Coupon Offer Detail')}
      description={offer ? String(offer['display_name']) : undefined}
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
          <DetailRow label={t('admin.col.offerNo', 'Offer No')} value={offer['offer_no']} />
          <DetailRow label={t('admin.marketing.coupon.form.name', 'Coupon Name')} value={offer['display_name']} />
          <DetailRow label={t('admin.col.type', 'Type')} value={offer['offer_type']} />
          <DetailRow label={t('admin.col.audience', 'Audience')} value={offer['audience_scope']} />
          <DetailRow label={t('admin.marketing.coupon.form.combinability', 'Combinability')} value={offer['combinability']} />
          <DetailRow label={t('admin.marketing.coupon.form.goodsScope', 'Goods Scope')} value={offer['goods_scope']} />
          <DetailRow label={t('admin.marketing.coupon.form.priority', 'Priority')} value={offer['priority']} />
          <DetailRow label={t('admin.marketing.coupon.form.startsAt', 'Starts At')} value={offer['starts_at']} />
          <DetailRow label={t('admin.marketing.coupon.form.endsAt', 'Ends At')} value={offer['ends_at']} />
          <DetailRow label={t('admin.col.status', 'Status')} value={offer['status']} />
          <DetailRow label={t('admin.col.version', 'Version')} value={offer['version']} />
          <DetailRow label={t('admin.col.updated', 'Updated')} value={offer['updated_at']} />

          <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.marketing.offers.detail.benefit', 'Benefit')}
          </h4>
          <DetailRow label={t('admin.col.discountType', 'Discount Type')} value={offer['discount_type']} />
          <DetailRow label={t('admin.marketing.coupon.form.discountValue', 'Discount Value')} value={offer['discount_value']} />
          <DetailRow label={t('admin.marketing.coupon.form.minimumAmount', 'Minimum Amount')} value={offer['minimum_amount']} />
          <DetailRow label={t('admin.marketing.coupon.form.maximumDiscountAmount', 'Maximum Discount Amount')} value={offer['maximum_discount_amount']} />
          <DetailRow label={t('admin.marketing.coupon.form.currencyCode', 'Currency')} value={offer['currency_code']} />
          <DetailRow label={t('admin.marketing.coupon.form.benefitKind', 'Benefit Type')} value={offer['coupon_benefit'] ? (offer['coupon_benefit'] as ApiRecord)['kind'] : '-'} />
          {offer['coupon_benefit'] ? (
            (offer['coupon_benefit'] as ApiRecord)['kind'] === 'subscription' ? (
              <>
                <DetailRow label={t('admin.marketing.coupon.form.productId', 'Product Id')} value={(offer['coupon_benefit'] as ApiRecord)['productId']} />
                <DetailRow label={t('admin.marketing.coupon.form.skuId', 'Sku Id')} value={(offer['coupon_benefit'] as ApiRecord)['skuId']} />
                <DetailRow label={t('admin.marketing.coupon.form.packageId', 'Package Id')} value={(offer['coupon_benefit'] as ApiRecord)['packageId']} />
                <DetailRow label={t('admin.marketing.coupon.form.period', 'Period')} value={(offer['coupon_benefit'] as ApiRecord)['period']} />
                <DetailRow label={t('admin.marketing.coupon.form.durationDays', 'Duration Days')} value={(offer['coupon_benefit'] as ApiRecord)['durationDays']} />
                <DetailRow label={t('admin.marketing.coupon.form.dailyQuota', 'Daily Quota')} value={(offer['coupon_benefit'] as ApiRecord)['dailyQuota']} />
                <DetailRow label={t('admin.marketing.coupon.form.totalQuota', 'Total Quota')} value={(offer['coupon_benefit'] as ApiRecord)['totalQuota']} />
              </>
            ) : (
              <DetailRow label={t('admin.marketing.coupon.form.grantAmount', 'Grant Amount')} value={(offer['coupon_benefit'] as ApiRecord)['grantAmount']} />
            )
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
