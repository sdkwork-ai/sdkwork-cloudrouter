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
