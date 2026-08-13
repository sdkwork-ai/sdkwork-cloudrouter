import type { ReactNode } from 'react';

type CommunityIconActionTone = 'default' | 'danger';

interface CommunityTablePanelProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function CommunityTablePanel({ children, className, footer }: CommunityTablePanelProps) {
  return (
    <div className={['flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5', className].filter(Boolean).join(' ')}>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function CommunityTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      {children}
    </div>
  );
}

interface CommunityIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: CommunityIconActionTone;
  disabled?: boolean;
  onClick: () => void;
}

const iconActionToneClassNames: Record<CommunityIconActionTone, string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function CommunityIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  onClick,
}: CommunityIconActionButtonProps) {
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

export function confirmCommunityAction(message: string): boolean {
  return window.confirm(message);
}

interface CommunityPageInfoLike {
  hasMore?: boolean;
  totalPages?: number;
}

export function hasNextCommunityPage(
  pageInfo: CommunityPageInfoLike | null,
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

type CommunityTranslate = (key: string, fallback: string, options?: Record<string, unknown>) => string;

export function communityPageLabel(
  t: CommunityTranslate,
  page: number,
  pageInfo: CommunityPageInfoLike | null,
): string {
  const totalPages = typeof pageInfo?.totalPages === 'number' ? pageInfo.totalPages : null;
  if (totalPages !== null) {
    return t('admin.community.pagination.pageOfTotal', 'Page {{page}} / {{totalPages}}', { page, totalPages });
  }
  return t('admin.community.pagination.page', 'Page {{page}}', { page });
}
