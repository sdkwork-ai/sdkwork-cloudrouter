import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface CourseFilterOption {
  value: string;
  label: string;
}

interface CourseFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: CourseFilterOption[];
  searchPlaceholder?: string;
  /** Optional extra controls rendered after the status selector. */
  children?: React.ReactNode;
}

/**
 * Shared list toolbar: free-text search plus the `status` filter that every
 * course backend list operation declares.
 */
export function CourseFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  statusOptions,
  searchPlaceholder,
  children,
}: CourseFilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <label className="relative flex min-w-[220px] flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder ?? t('admin.course.filter.search', 'Search by keyword')}
          aria-label={searchPlaceholder ?? t('admin.course.filter.search', 'Search by keyword')}
          className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <span>{t('admin.course.filter.status', 'Status')}</span>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        >
          <option value="">{t('admin.course.filter.allStatus', 'All statuses')}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {children}
    </div>
  );
}
