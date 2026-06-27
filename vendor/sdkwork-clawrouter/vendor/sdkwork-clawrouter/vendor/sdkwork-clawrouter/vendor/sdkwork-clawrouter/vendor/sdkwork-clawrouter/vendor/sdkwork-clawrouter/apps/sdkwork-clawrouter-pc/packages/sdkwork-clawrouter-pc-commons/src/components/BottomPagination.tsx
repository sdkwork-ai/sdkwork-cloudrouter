import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface BottomPaginationProps {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNextPage: boolean;
  showingLabel: string;
  pageLabel: string;
  pageSizeLabel: string;
  previousLabel?: string;
  nextLabel?: string;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
}

const defaultPageSizeOptions = [10, 20, 50, 100];

export function BottomPagination({
  page,
  pageSize,
  itemCount,
  hasNextPage,
  showingLabel,
  pageLabel,
  pageSizeLabel,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageSizeOptions = defaultPageSizeOptions,
  disabled = false,
  className = '',
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
}: BottomPaginationProps) {
  const start = itemCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = itemCount > 0 ? start + itemCount - 1 : 0;
  const canPrevious = page > 1 && !disabled;
  const canNext = hasNextPage && !disabled;

  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300 md:flex-row md:items-center md:justify-between ${className}`.trim()}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {showingLabel}
        <span className="ml-2 font-mono text-slate-700 dark:text-slate-200">
          {start} - {end}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{pageSizeLabel}</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-slate-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
          {pageLabel}
        </span>

        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!canPrevious}
          aria-label={previousLabel}
          title={previousLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={!canNext}
          aria-label={nextLabel}
          title={nextLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
