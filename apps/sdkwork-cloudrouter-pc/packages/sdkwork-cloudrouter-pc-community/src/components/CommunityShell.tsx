import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Users } from 'lucide-react';

export function CommunityPage({ children }: { readonly children: ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>;
}

export function CommunityPageHeader({
  actions,
  backTo,
  backLabel,
  subtitle,
  title,
}: {
  readonly actions?: ReactNode;
  readonly backTo?: string;
  readonly backLabel?: string;
  readonly subtitle?: string;
  readonly title: string;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-lobster-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <h1 className="truncate text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CommunityTabs<T extends string>({
  active,
  items,
  onChange,
}: {
  readonly active: T;
  readonly items: readonly { readonly id: T; readonly label: string }[];
  readonly onChange: (id: T) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            active === item.id
              ? 'bg-lobster-500/10 text-lobster-600 dark:text-lobster-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function CommunitySpinner({ label }: { readonly label?: string }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function CommunityEmptyState({
  action,
  hint,
  title,
}: {
  readonly action?: ReactNode;
  readonly hint?: string;
  readonly title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {hint ? <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CommunityErrorState({ message, onRetry }: { readonly message?: string; readonly onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      <p>{message ?? t('communityUi.loadFailed')}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50"
        >
          {t('communityUi.retry', 'Retry')}
        </button>
      ) : null}
    </div>
  );
}

export function CircleAvatar({
  name,
  src,
  className = 'h-12 w-12',
}: {
  readonly name: string;
  readonly src?: string;
  readonly className?: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={`${className} shrink-0 rounded-full object-cover`} loading="lazy" />;
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lobster-500 to-amber-500 text-lg font-bold text-white`}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || 'C'}
    </span>
  );
}
