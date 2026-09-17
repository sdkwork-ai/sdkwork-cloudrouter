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
    return <p className="px-1 py-6 text-center text-xs text-gray-400">…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-red-400/60 px-2 py-1 text-[11px]"
        >
          {retryLabel}
        </button>
      </div>
    );
  }
  if (empty) {
    return <p className="px-1 py-6 text-center text-xs text-gray-400">{emptyLabel}</p>;
  }
  return <>{children}</>;
}
