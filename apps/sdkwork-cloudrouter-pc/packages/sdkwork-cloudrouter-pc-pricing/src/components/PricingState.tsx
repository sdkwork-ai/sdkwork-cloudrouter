import { AlertCircle, RefreshCw, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PricingLoadingState() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2" role="status" aria-label={t('pricing.loading')}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-md bg-slate-100 dark:bg-white/5" />
      ))}
    </div>
  );
}

export function PricingErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-slate-200 px-6 text-center dark:border-white/10">
      <AlertCircle className="mb-4 h-8 w-8 text-rose-500" aria-hidden="true" />
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('pricing.error.title')}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pricing.error.description')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:bg-white dark:text-slate-950"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t('pricing.retry')}
      </button>
    </div>
  );
}

export function PricingEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-slate-200 px-6 text-center dark:border-white/10">
      <SearchX className="mb-4 h-8 w-8 text-slate-400" aria-hidden="true" />
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('pricing.empty.title')}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pricing.empty.description')}</p>
    </div>
  );
}

/** 分组/标签筛选把当前页价格筛空时的独立空态，附一键清除分组筛选。 */
export function PricingGroupEmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-slate-200 px-6 text-center dark:border-white/10">
      <SearchX className="mb-4 h-8 w-8 text-slate-400" aria-hidden="true" />
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('pricing.groups.emptyTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pricing.groups.emptyDescription')}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:text-slate-200 dark:hover:text-white"
      >
        {t('pricing.groups.reset')}
      </button>
    </div>
  );
}
