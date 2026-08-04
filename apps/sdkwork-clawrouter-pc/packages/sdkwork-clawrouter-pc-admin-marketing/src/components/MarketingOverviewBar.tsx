import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { fetchPromotionOverview } from '../marketingService';

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function MarketingOverviewBar() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<ApiRecord | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPromotionOverview()
      .then((value) => {
        if (!cancelled) {
          setOverview(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return null;
  }

  const cards = overview
    ? [
        { key: 'active_offers', label: t('admin.marketing.overview.activeOffers', 'Active Offers') },
        { key: 'total_offers', label: t('admin.marketing.overview.totalOffers', 'Total Offers') },
        { key: 'total_coupon_stock', label: t('admin.marketing.overview.totalStock', 'Total Stock') },
        { key: 'available_coupons', label: t('admin.marketing.overview.available', 'Available') },
        { key: 'claimed_coupons', label: t('admin.marketing.overview.claimed', 'Claimed') },
        { key: 'redeemed_coupons', label: t('admin.marketing.overview.redeemed', 'Redeemed') },
        { key: 'active_codes', label: t('admin.marketing.overview.activeCodes', 'Active Codes') },
        { key: 'discount_applications', label: t('admin.marketing.overview.applications', 'Applications') },
      ]
    : [];

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {cards.map((card) => (
        <OverviewCard
          key={card.key}
          label={card.label}
          value={String(overview?.[card.key] ?? '0')}
        />
      ))}
    </div>
  );
}
