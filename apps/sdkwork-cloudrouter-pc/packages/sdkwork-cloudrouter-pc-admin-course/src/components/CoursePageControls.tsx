import type { ReactNode } from 'react';

type CourseIconActionTone = 'default' | 'danger';

interface CourseTablePanelProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function CourseTablePanel({ children, className, footer }: CourseTablePanelProps) {
  return (
    <div className={['flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5', className].filter(Boolean).join(' ')}>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function CourseTableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      {children}
    </div>
  );
}

interface CourseIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: CourseIconActionTone;
  disabled?: boolean;
  onClick: () => void;
}

const iconActionToneClassNames: Record<CourseIconActionTone, string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function CourseIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  onClick,
}: CourseIconActionButtonProps) {
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

export function CourseTextActionButton({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {label}
    </button>
  );
}

export function CoursePrimaryButton({
  label,
  icon,
  disabled = false,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

export function confirmCourseAction(message: string): boolean {
  return window.confirm(message);
}

interface CoursePageInfoLike {
  hasMore?: boolean;
  totalPages?: number;
}

export function hasNextCoursePage(
  pageInfo: CoursePageInfoLike | null,
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

export type CourseTranslate = (key: string, fallback: string, options?: Record<string, unknown>) => string;

export function coursePageLabel(
  t: CourseTranslate,
  page: number,
  pageInfo: CoursePageInfoLike | null,
): string {
  const totalPages = typeof pageInfo?.totalPages === 'number' ? pageInfo.totalPages : null;
  if (totalPages !== null) {
    return t('admin.course.pagination.pageOfTotal', 'Page {{page}} / {{totalPages}}', { page, totalPages });
  }
  return t('admin.course.pagination.page', 'Page {{page}}', { page });
}
