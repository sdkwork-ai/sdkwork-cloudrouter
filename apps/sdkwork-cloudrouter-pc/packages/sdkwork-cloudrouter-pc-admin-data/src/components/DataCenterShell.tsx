import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Table2 } from 'lucide-react';
import { BusinessStateTableRow } from '@sdkwork/cloudroutes-pc-commons/components/BusinessState';
import type { DataCenterQueryState } from '../dataCenterHooks.ts';

export type DataCenterPhase = 'p0' | 'p1' | 'p2';

export function DataCenterPhaseBadge({ phase }: { phase: DataCenterPhase }) {
  const { t } = useTranslation();
  const tone = phase === 'p0'
    ? 'bg-lobster-500/10 text-lobster-600 ring-lobster-500/20 dark:text-lobster-400'
    : phase === 'p1'
      ? 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400'
      : 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ring-1 ${tone}`}>
      {t(`admin.dataCenter.phase.${phase}`, phase.toUpperCase())}
    </span>
  );
}

export function DataCenterPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DataCenterErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{t('admin.dataCenter.error.title', 'Data center request failed')}</div>
        <div className="mt-0.5 break-words text-xs leading-5 opacity-90">{message}</div>
      </div>
      {onRetry ? (
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded border border-red-300/60 px-2 py-1 text-xs font-medium transition-colors hover:bg-red-100 dark:border-red-400/30 dark:hover:bg-red-500/20"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.dataCenter.error.retry', 'Retry')}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Marks a capability that this deployment exposes as read-only until its
 * write path ships. Unlike a "backend missing" badge, the read lists underneath
 * are live data from the datacenter service.
 */
export function DataCenterReadOnlyBadge({ reason }: { reason: string }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex flex-col items-end gap-0.5"
      title={reason}
    >
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <Table2 aria-hidden="true" className="h-3 w-3" />
        {t('admin.dataCenter.badge.readOnly', 'Read-only in this release')}
      </span>
      <span className="max-w-64 text-right text-[11px] leading-4 text-slate-400 dark:text-slate-500">{reason}</span>
    </span>
  );
}

export interface DataCenterColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export function DataCenterTable<T>({
  columns,
  state,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  onRetry,
}: {
  columns: readonly DataCenterColumn<T>[];
  state: DataCenterQueryState<readonly T[]>;
  loadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const rows = state.phase === 'ready' ? state.data : [];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#161a21]">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-2.5 font-medium ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                scope="col"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {state.phase === 'loading' ? (
            <BusinessStateTableRow colSpan={columns.length} kind="loading" title={loadingLabel} />
          ) : null}
          {state.phase === 'error' ? (
            <BusinessStateTableRow
              colSpan={columns.length}
              kind="error"
              title={t('admin.dataCenter.error.title', 'Data center request failed')}
              description={state.message}
              onRetry={onRetry}
              retryLabel={t('admin.dataCenter.error.retry', 'Retry')}
            />
          ) : null}
          {state.phase === 'ready' && rows.length === 0 ? (
            <BusinessStateTableRow
              colSpan={columns.length}
              kind="empty"
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : null}
          {state.phase === 'ready'
            ? rows.map((row, index) => (
              <tr key={index} className="text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
            : null}
        </tbody>
      </table>
    </div>
  );
}
