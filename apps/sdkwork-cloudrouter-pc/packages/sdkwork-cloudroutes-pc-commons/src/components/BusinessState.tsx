import type { ReactNode } from 'react';

export type BusinessStateKind = 'loading' | 'error' | 'empty';

export interface BusinessStateAction {
  label: string;
  onClick: () => void;
}

export interface BusinessStatePanelProps {
  kind?: BusinessStateKind;
  title: string;
  description?: string;
  action?: BusinessStateAction;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export interface BusinessStateTableRowProps extends BusinessStatePanelProps {
  colSpan: number;
}

const stateStyle: Record<BusinessStateKind, { role: 'status' | 'alert'; tone: string; dot: string }> = {
  loading: {
    role: 'status',
    tone: 'text-slate-500 dark:text-slate-400',
    dot: 'border-emerald-500 border-t-transparent animate-spin',
  },
  error: {
    role: 'alert',
    tone: 'text-red-600 dark:text-red-400',
    dot: 'border-red-500 bg-red-500',
  },
  empty: {
    role: 'status',
    tone: 'text-slate-500 dark:text-slate-400',
    dot: 'border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-600',
  },
};

function resolveBusinessStateKind(kind: unknown): BusinessStateKind {
  return kind === 'loading' || kind === 'error' || kind === 'empty' ? kind : 'empty';
}

export function BusinessStatePanel({
  kind,
  title,
  description,
  action,
  onRetry,
  retryLabel = 'Retry',
  icon,
  className = '',
}: BusinessStatePanelProps) {
  const resolvedKind = resolveBusinessStateKind(kind);
  const style = stateStyle[resolvedKind];
  const resolvedAction = action ?? (onRetry ? { label: retryLabel, onClick: onRetry } : undefined);

  return (
    <div
      role={style.role}
      aria-live={resolvedKind === 'loading' ? 'polite' : 'assertive'}
      className={`flex min-h-32 flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300">
        {icon ?? <span className={`h-4 w-4 rounded-full border-2 ${style.dot}`} aria-hidden="true" />}
      </div>
      <div>
        <div className={`text-sm font-medium ${style.tone}`}>{title}</div>
        {description ? (
          <div className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
        ) : null}
      </div>
      {resolvedAction ? (
        <button
          type="button"
          onClick={resolvedAction.onClick}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
        >
          {resolvedAction.label}
        </button>
      ) : null}
    </div>
  );
}

export function BusinessStateTableRow({ colSpan, ...props }: BusinessStateTableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-0">
        <BusinessStatePanel {...props} />
      </td>
    </tr>
  );
}
