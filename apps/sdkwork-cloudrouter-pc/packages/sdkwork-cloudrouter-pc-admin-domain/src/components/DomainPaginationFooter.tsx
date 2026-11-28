/**
 * The footer every Domain Center table renders under its last row.
 *
 * It composes the shared `BottomPagination` primitives — summary, rows-per-page,
 * previous/next, numbered pages — and adds the one control this surface needs on
 * top: a "go to page" form. Keeping the footer in one place means all five tables
 * page identically: the same order of controls, the same wording, and the same
 * disabled state while a page is in flight.
 *
 * Design notes that matter more than they look:
 *
 * - the summary describes the *server page window* ("Showing 21 - 40"), never the
 *   rows a page-scoped filter happened to leave on screen; pages that filter
 *   locally state that separately in their header;
 * - the numbered strip appears only when the server reported a page count, so a
 *   first-page list with one page of results shows no dead controls;
 * - "Go" clamps instead of erroring: a typed page beyond the end lands on the last
 *   page, which is what an operator meant and costs no extra error row.
 */

import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';

import { DOMAIN_PAGE_SIZE_OPTIONS, domainPaginationIsAddressable } from '../domainPagination';

export interface DomainPaginationFooterProps {
  /** 1-based page the server returned. */
  page: number;
  pageSize: number;
  /** Rows on this server page, before any page-scoped filter. */
  pageRowCount: number;
  totalItems: number | null;
  totalPages: number | null;
  hasMore: boolean;
  /** Disables every control while a request is in flight. */
  disabled?: boolean;
  /**
   * Localized total phrase for the summary ("137 root domains"). When omitted the
   * footer falls back to a generic row count.
   */
  totalSummary?: ReactNode;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSelect: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DomainPaginationFooter({
  page,
  pageSize,
  pageRowCount,
  totalItems,
  totalPages,
  hasMore,
  disabled = false,
  totalSummary,
  onPreviousPage,
  onNextPage,
  onPageSelect,
  onPageSizeChange,
}: DomainPaginationFooterProps) {
  const { t } = useTranslation();
  // "Page 1 / 7" only earns the second number when there is somewhere to go.
  const pageLabel = totalPages !== null && totalPages > 1
    ? t('admin.domainCenter.pagination.pageOf', 'Page {{page}} / {{totalPages}}', {
        page,
        totalPages,
      })
    : t('common.pagination.page', 'Page {{page}}', { page });
  const summary = totalSummary
    ?? (totalItems !== null
      ? t('admin.domainCenter.pagination.totalRows', '{{count}} rows in total', { count: totalItems })
      : null);

  return (
    <div data-domain-pagination data-domain-page={page} data-domain-page-size={pageSize}>
      <BottomPagination
        page={page}
        pageSize={pageSize}
        itemCount={pageRowCount}
        hasNextPage={hasMore}
        showingLabel={t('common.pagination.showing', 'Showing')}
        pageLabel={pageLabel}
        pageSizeLabel={t('common.pagination.rows', 'Rows')}
        previousLabel={t('common.pagination.previous', 'Previous page')}
        nextLabel={t('common.pagination.next', 'Next page')}
        pageSizeOptions={[...DOMAIN_PAGE_SIZE_OPTIONS]}
        totalPages={totalPages ?? undefined}
        pageNumbers={domainPaginationIsAddressable({ totalPages })}
        ariaLabel={t('admin.domainCenter.pagination.aria', 'Pagination')}
        pageNumberLabel={(target) => t(
          'admin.domainCenter.pagination.pageNumber',
          'Page {{page}}',
          { page: target },
        )}
        summary={summary}
        disabled={disabled}
        extraControls={totalPages !== null && totalPages > 1 ? (
          <DomainPageJump
            page={page}
            totalPages={totalPages}
            disabled={disabled}
            onJump={onPageSelect}
          />
        ) : null}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        onPageSelect={onPageSelect}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

/**
 * "Go to page" form.
 *
 * A real `<form>` so Enter submits, a numeric input narrower than the page chip,
 * and a clamp on submit. The input resets whenever the page changes, including a
 * jump initiated elsewhere, so it never shows a stale target.
 */
function DomainPageJump({
  page,
  totalPages,
  disabled,
  onJump,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onJump: (page: number) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const generatedId = useId();
  const inputId = `domain-pagination-jump-${generatedId}`;

  useEffect(() => {
    setValue('');
  }, [page]);

  const submit = () => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      setValue('');
      return;
    }
    const target = Math.min(Math.max(1, parsed), totalPages);
    setValue('');
    if (target !== page) {
      onJump(target);
    }
  };

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('admin.domainCenter.pagination.jump', 'Go to page')}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={String(page)}
        aria-describedby={`${inputId}-range`}
        onChange={(event) => setValue(event.target.value.replace(/[^0-9]/gu, ''))}
        className="h-8 w-12 rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-semibold text-slate-700 tabular-nums outline-none transition focus:border-lobster-400 focus:ring-2 focus:ring-lobster-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-slate-200"
      />
      <span id={`${inputId}-range`} className="sr-only">
        {t('admin.domainCenter.pagination.jumpRange', 'Enter a page between 1 and {{totalPages}}', {
          totalPages,
        })}
      </span>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-lobster-300 hover:text-lobster-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
      >
        <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
        {t('admin.domainCenter.pagination.go', 'Go')}
      </button>
    </form>
  );
}
