import type { ReactNode } from 'react';

type MembershipIconActionTone = 'default' | 'danger';

interface MembershipTablePanelProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function MembershipTablePanel({ children, className, footer }: MembershipTablePanelProps) {
  return (
    <div className={['flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5', className].filter(Boolean).join(' ')}>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function MembershipTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      {children}
    </div>
  );
}

interface MembershipIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: MembershipIconActionTone;
  disabled?: boolean;
  onClick: () => void;
}

const iconActionToneClassNames: Record<MembershipIconActionTone, string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function MembershipIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  onClick,
}: MembershipIconActionButtonProps) {
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

export function confirmMembershipAction(message: string): boolean {
  return window.confirm(message);
}

interface MembershipPageInfoLike {
  hasMore?: boolean;
  totalPages?: number;
}

export function hasNextMembershipPage(
  pageInfo: MembershipPageInfoLike | null,
  page: number,
  itemCount: number,
  pageSize: number,
): boolean {
  if (typeof pageInfo?.hasMore === 'boolean') {
    return pageInfo.hasMore;
  }
  if (typeof pageInfo?.totalPages === 'number') {
    return page < pageInfo.totalPages;
  }
  return itemCount >= pageSize;
}

export function membershipPageLabel(
  label: string,
  page: number,
  pageInfo: MembershipPageInfoLike | null,
): string {
  return typeof pageInfo?.totalPages === 'number'
    ? `${label} ${page} / ${pageInfo.totalPages}`
    : `${label} ${page}`;
}
