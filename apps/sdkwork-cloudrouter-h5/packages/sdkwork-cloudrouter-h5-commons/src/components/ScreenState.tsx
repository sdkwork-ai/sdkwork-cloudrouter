import type { ReactNode } from 'react';

export interface ScreenStateProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly empty: boolean;
  readonly emptyLabel: string;
  readonly retryLabel: string;
  readonly onRetry: () => void;
  readonly children: ReactNode;
}

export function ScreenState({
  loading,
  error,
  empty,
  emptyLabel,
  retryLabel,
  onRetry,
  children,
}: ScreenStateProps) {
  if (loading) {
    return <p className="bg-surface px-[0.9rem] py-8 text-center text-xs text-ink-subtle">…</p>;
  }
  if (error) {
    return (
      <div className="border-b border-line bg-danger-soft px-[0.9rem] py-4 text-xs text-danger">
        <p>{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-danger/40 px-2.5 py-1 text-[11px] font-medium"
        >
          {retryLabel}
        </button>
      </div>
    );
  }
  if (empty) {
    return (
      <p className="bg-surface px-[0.9rem] py-8 text-center text-xs text-ink-subtle">{emptyLabel}</p>
    );
  }
  return <>{children}</>;
}
