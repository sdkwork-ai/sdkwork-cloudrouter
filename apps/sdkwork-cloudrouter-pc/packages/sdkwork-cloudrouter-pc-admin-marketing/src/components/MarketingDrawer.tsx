import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface MarketingDrawerProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MarketingDrawer({
  title,
  description,
  isOpen,
  onClose,
  children,
}: MarketingDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="fixed inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-white shadow-2xl dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

interface MarketingStatusBadgeProps {
  status: unknown;
  activeLabel: string;
  inactiveLabel: string;
}

export function MarketingStatusBadge({
  status,
  activeLabel,
  inactiveLabel,
}: MarketingStatusBadgeProps) {
  const active = status === 'active' || status === 'ACTIVE' || status === 'READY';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function MarketingBatchStatusBadge({ status }: { status: unknown }) {
  const { t } = useTranslation();
  const value = String(status ?? '').toUpperCase();
  const tone = value === 'READY'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    : value === 'GENERATING' || value === 'PROCESSING'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      : value === 'FAILED'
        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  const labelMap: Record<string, string> = {
    READY: t('admin.marketing.status.ready', 'Ready'),
    GENERATING: t('admin.marketing.status.generating', 'Generating'),
    PENDING: t('admin.marketing.status.pending', 'Pending'),
    PROCESSING: t('admin.marketing.status.processing', 'Processing'),
    COMPLETED: t('admin.marketing.status.completed', 'Completed'),
    FAILED: t('admin.marketing.status.failed', 'Failed'),
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {labelMap[value] ?? value}
    </span>
  );
}
