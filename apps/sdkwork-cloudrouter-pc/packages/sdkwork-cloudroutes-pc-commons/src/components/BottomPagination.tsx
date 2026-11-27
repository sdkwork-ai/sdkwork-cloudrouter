import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** One slot of a numbered pagination strip: a page button or an elision gap. */
export type PaginationPageItem =
  | { kind: 'page'; page: number }
  | { kind: 'gap'; key: string };

/**
 * Windowed page list for a numbered pagination strip.
 *
 * Always keeps the first and last page reachable, and only drops pages between
 * them when the current page is far away. A single gap never replaces exactly
 * one page: `1 … 3` collapses to `1 2 3` because the ellipsis would cost the same
 * width while removing a directly clickable page.
 *
 * `maxSlots` counts rendered slots including the two edge pages and both gaps,
 * so a strip can never grow wider than the footer it sits in.
 */
export function buildPaginationPageItems(
  page: number,
  totalPages: number,
  maxSlots = 7,
): PaginationPageItem[] {
  if (!Number.isFinite(totalPages) || totalPages < 1) {
    return [];
  }
  const total = Math.floor(totalPages);
  const current = Math.min(Math.max(1, Math.floor(page) || 1), total);
  const slots = Math.max(5, Math.floor(maxSlots));
  if (total <= slots) {
    return Array.from({ length: total }, (_, index) => ({ kind: 'page' as const, page: index + 1 }));
  }

  // first + last + two elisions leave this many interior page buttons.
  const interior = slots - 4;
  let start = Math.max(2, current - Math.floor(interior / 2));
  let end = Math.min(total - 1, start + interior - 1);
  if (end === total - 1) {
    start = Math.max(2, end - interior + 1);
  }
  // Never elide a single page.
  if (start === 3) {
    start = 2;
  }
  if (end === total - 2) {
    end = total - 1;
  }

  const items: PaginationPageItem[] = [{ kind: 'page', page: 1 }];
  if (start > 2) {
    items.push({ kind: 'gap', key: 'gap-start' });
  }
  for (let candidate = start; candidate <= end; candidate += 1) {
    items.push({ kind: 'page', page: candidate });
  }
  if (end < total - 1) {
    items.push({ kind: 'gap', key: 'gap-end' });
  }
  items.push({ kind: 'page', page: total });
  return items;
}

export interface BottomPaginationProps {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNextPage: boolean;
  showingLabel: string;
  pageLabel: string;
  pageSizeLabel: string;
  /** Total matching records for the active query, when the server reports it. */
  totalItems?: number;
  /** Label rendered before `totalItems` (for example "Total"). */
  totalLabel?: string;
  /**
   * Extra phrase rendered first in the left summary cluster (for example a localized
   * "{{total}} rows in total"). A slot keeps list-specific wording in the caller while
   * the bar stays one row; it is never rendered on its own line.
   */
  summary?: ReactNode;
  /**
   * Extra controls rendered last in the right control cluster (for example a page-jump
   * form). Callers append secondary pagination controls here so the bar keeps a single
   * row instead of stacking a second footer bar underneath it.
   */
  extraControls?: ReactNode;
  previousLabel?: string;
  nextLabel?: string;
  pageSizeOptions?: number[];
  disabled?: boolean;
  /** Keep the pagination bar on a single line; controls never wrap onto a second row. */
  nowrap?: boolean;
  className?: string;
  /**
   * Server-reported page count. Combined with `pageNumbers` it renders a numbered
   * strip, so an operator can jump straight to a page instead of paging one at a
   * time; the strip is hidden below `lg` where the bar has no room for it.
   */
  totalPages?: number;
  /** Render the numbered page strip (default `false`, which keeps callers unchanged). */
  pageNumbers?: boolean;
  /** Accessible name of the control cluster landmark. */
  ariaLabel?: string;
  /** Accessible name of one numbered page button. */
  pageNumberLabel?: (page: number) => string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  /** Direct page selection; required for the numbered strip to do anything. */
  onPageSelect?: (page: number) => void;
}

const defaultPageSizeOptions = [10, 20, 50, 100];
const defaultPageNumberLabel = (page: number) => `Page ${page}`;

export function BottomPagination({
  page,
  pageSize,
  itemCount,
  hasNextPage,
  showingLabel,
  pageLabel,
  pageSizeLabel,
  totalItems,
  totalLabel,
  summary,
  extraControls,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageSizeOptions = defaultPageSizeOptions,
  disabled = false,
  nowrap = false,
  className = '',
  totalPages,
  pageNumbers = false,
  ariaLabel = 'Pagination',
  pageNumberLabel = defaultPageNumberLabel,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
  onPageSelect,
}: BottomPaginationProps) {
  const start = itemCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = itemCount > 0 ? start + itemCount - 1 : 0;
  const canPrevious = page > 1 && !disabled;
  const canNext = hasNextPage && !disabled;
  const showPageNumbers =
    pageNumbers
    && onPageSelect !== undefined
    && typeof totalPages === 'number'
    && Number.isFinite(totalPages)
    && Math.floor(totalPages) > 1;
  const pageItems = showPageNumbers
    ? buildPaginationPageItems(page, Math.floor(totalPages ?? 1))
    : [];

  return (
    <div
      className={`${
        nowrap
          ? 'flex flex-row items-center justify-between gap-3'
          : 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
      } border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300 ${className}`.trim()}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        {summary ? (
          <>
            {summary}
            <span className="mx-2 text-slate-300 dark:text-white/20">·</span>
          </>
        ) : null}
        {totalItems !== undefined && totalLabel ? (
          <>
            {totalLabel}
            <span className="ml-2 font-mono text-slate-700 dark:text-slate-200">{totalItems}</span>
            <span className="mx-2 text-slate-300 dark:text-white/20">·</span>
          </>
        ) : null}
        {showingLabel}
        <span className="ml-2 font-mono text-slate-700 dark:text-slate-200">
          {start} - {end}
        </span>
      </div>

      <div
        role="navigation"
        aria-label={ariaLabel}
        className={`flex items-center gap-2 ${nowrap ? 'flex-nowrap' : 'flex-wrap'}`}
      >
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{pageSizeLabel}</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-slate-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 tabular-nums dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
          {pageLabel}
        </span>

        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!canPrevious}
          aria-label={previousLabel}
          title={previousLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {showPageNumbers ? (
          <div className="hidden items-center gap-1 lg:inline-flex">
            {pageItems.map((item) =>
              item.kind === 'gap' ? (
                <span
                  key={item.key}
                  aria-hidden="true"
                  className="inline-flex h-8 w-6 items-center justify-center text-xs text-slate-400 dark:text-slate-500"
                >
                  …
                </span>
              ) : (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onPageSelect?.(item.page)}
                  disabled={disabled}
                  aria-current={item.page === page ? 'page' : undefined}
                  aria-label={pageNumberLabel(item.page)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-1.5 text-xs font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    item.page === page
                      ? 'border-lobster-500 bg-lobster-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-lobster-300 hover:text-lobster-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
                  }`}
                >
                  {item.page}
                </button>
              ),
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onNextPage}
          disabled={!canNext}
          aria-label={nextLabel}
          title={nextLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {extraControls}
      </div>
    </div>
  );
}
