import { AlertCircle, Loader2, PackageOpen, SearchX } from 'lucide-react';

/**
 * Shared loading / error / empty surfaces of the Smart Hardware Market.
 *
 * They mirror the storefront shell styling and keep the accessibility contract:
 * loading is a polite status, a failure is an alert, and an empty catalog offers
 * the operator next step instead of a dead end.
 */

export function HardwareMarketLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="py-4">
      <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-[22rem] animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

export function HardwareMarketError({
  title,
  hint,
  retryLabel,
  onRetry,
}: {
  title: string;
  hint: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-14 text-center dark:border-rose-500/30 dark:bg-rose-500/10"
    >
      <AlertCircle className="h-10 w-10 text-rose-500" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export function HardwareMarketEmpty({
  title,
  hint,
  action,
  tone = 'empty',
}: {
  title: string;
  hint: string;
  action?: { label: string; onClick: () => void };
  tone?: 'empty' | 'no-results';
}) {
  const Icon = tone === 'no-results' ? SearchX : PackageOpen;
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-[#0d0d0d]">
      <Icon className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-lobster-400 hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200 dark:hover:text-white"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
