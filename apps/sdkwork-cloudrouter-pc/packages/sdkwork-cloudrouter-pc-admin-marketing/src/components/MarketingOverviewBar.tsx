import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { fetchPromotionOverview, formatMarketingInteger, readMarketingProblemTraceId } from '../marketingService';
import { MarketingInlineAlert } from './MarketingInlineAlert';

/** KPI 卡片高度约为 `py-3 + text-xs + text-lg`；失败态沿用同一高度，避免整条跳动。 */
const KPI_STRIP_MIN_HEIGHT_CLASS = 'min-h-[4.75rem]';

/**
 * KPI 条（设计规范 §2.2）：3–5 个指标、等宽、`tabular-nums`、标签 `text-xs`。
 * 计数统一走 `formatMarketingInteger`（千分位 / `—` / `∞`）。
 */
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

/** 首次载入的骨架卡：占位但不编造数值，屏幕阅读器只感知 `aria-busy`。 */
function KpiSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/10" />
      <div className="mt-2 h-6 w-20 rounded bg-slate-100 dark:bg-white/10" />
    </div>
  );
}

function readKpiValue(overview: ApiRecord | null, key: string): string {
  const value = overview?.[key];
  if (typeof value === 'string' || typeof value === 'number') {
    return formatMarketingInteger(value);
  }
  return formatMarketingInteger(null);
}

export function MarketingOverviewBar() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<ApiRecord | null>(null);
  const [error, setError] = useState<{ message: string; traceId: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const value = await fetchPromotionOverview();
      setOverview(value);
      setError(null);
    } catch (loadError) {
      // 失败时保留条带：给出可重试的行内错误，而不是让整块 KPI 消失。
      setError({
        message: resolveProblemMessage(
          loadError,
          t,
          t('admin.marketing.overview.loadError', 'Overview metrics could not be loaded.'),
        ),
        traceId: readMarketingProblemTraceId(loadError),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const cards = [
    { key: 'activeOffers', label: t('admin.marketing.overview.activeOffers', 'Active Offers') },
    { key: 'totalOffers', label: t('admin.marketing.overview.totalOffers', 'Total Offers') },
    { key: 'totalCouponStock', label: t('admin.marketing.overview.totalStock', 'Total Stock') },
    { key: 'claimedCoupons', label: t('admin.marketing.overview.claimed', 'Claimed') },
    { key: 'redeemedCoupons', label: t('admin.marketing.overview.redeemed', 'Redeemed') },
  ];

  if (error) {
    return (
      <div className={`flex shrink-0 items-center ${KPI_STRIP_MIN_HEIGHT_CLASS}`}>
        <div className="flex w-full items-center gap-2">
          <div className="min-w-0 flex-1">
            <MarketingInlineAlert message={error.message} traceId={error.traceId} />
          </div>
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={isLoading}
            aria-label={t('admin.marketing.overview.retryLabel', 'Retry loading overview metrics')}
            className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {t('admin.marketing.overview.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div
        aria-busy="true"
        className={`grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${KPI_STRIP_MIN_HEIGHT_CLASS}`}
      >
        {cards.map((card) => <KpiSkeletonCard key={card.key} />)}
      </div>
    );
  }

  return (
    <div className={`grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${KPI_STRIP_MIN_HEIGHT_CLASS}`}>
      {cards.map((card) => (
        <KpiCard key={card.key} label={card.label} value={readKpiValue(overview, card.key)} />
      ))}
    </div>
  );
}
