import type { ReactNode } from 'react';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';

export function MarketingTablePanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function MarketingTableActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}

interface MarketingIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

const iconActionToneClassNames: Record<'default' | 'danger', string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function MarketingIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  onClick,
}: MarketingIconActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${iconActionToneClassNames[tone]}`}
    >
      {icon}
    </button>
  );
}

export function hasNextMarketingPage(
  pageInfo: ApiRecord | null,
  page: number,
  itemCount: number,
  pageSize: number,
): boolean {
  const hasMore = pageInfo?.['hasMore'];
  if (typeof hasMore === 'boolean') {
    return hasMore;
  }
  const totalPages = pageInfo?.['totalPages'];
  if (typeof totalPages === 'number') {
    return page < totalPages;
  }
  return itemCount >= pageSize;
}

export function marketingPageLabel(label: string, page: number, pageInfo: ApiRecord | null): string {
  const totalPages = pageInfo?.['totalPages'];
  return typeof totalPages === 'number' ? `${label} ${page} / ${totalPages}` : `${label} ${page}`;
}

export function marketingStatusLabel(status: unknown, active: string, inactive: string): string {
  return status === 'active' || status === 'ACTIVE' ? active : inactive;
}
