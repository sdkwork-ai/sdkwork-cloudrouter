import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, Search } from 'lucide-react';
import { BottomPagination, BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { hasNextMarketingPage, marketingPageLabel, MarketingTablePanel } from './MarketingPageControls';

const SEARCH_DEBOUNCE_MS = 300;

export type MarketingColumn<T extends object> = {
  key: string;
  label: string;
  align?: 'right';
  render?: (value: unknown, record: T) => ReactNode;
};

export type MarketingLoadParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: 'active' | 'disabled';
};

export type MarketingPageResult<T extends object> = {
  items: T[];
  pageInfo: ApiRecord;
};

export interface MarketingListViewProps<T extends object> {
  title: string;
  description?: string;
  load: (params: MarketingLoadParams) => Promise<MarketingPageResult<T>>;
  columns: MarketingColumn<T>[];
  searchPlaceholder?: string;
  showStatusFilter?: boolean;
  emptyTitle?: string;
  toolbarActions?: ReactNode;
  rowActions?: (record: T) => ReactNode;
  initialPageSize?: number;
  refreshKey?: unknown;
  exportable?: boolean;
  exportFileName?: string;
}

export function MarketingListView<T extends object>({
  title,
  description,
  load,
  columns,
  searchPlaceholder,
  showStatusFilter = false,
  emptyTitle,
  toolbarActions,
  rowActions,
  initialPageSize = 20,
  refreshKey,
  exportable = false,
  exportFileName = 'marketing-records.csv',
}: MarketingListViewProps<T>) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled' | undefined>(undefined);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncedStatus, setDebouncedStatus] = useState<'active' | 'disabled' | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<ApiRecord | null>(null);
  const requestIdRef = useRef(0);
  // 保持最新 load 引用，避免调用方 inline 函数导致 effect 无限循环
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // 搜索防抖：连续输入时合并请求
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncedStatus(status);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, status]);

  const loadRecords = useCallback(async (
    requestedPage: number,
    requestedPageSize: number,
    requestedQuery: string,
    requestedStatus: 'active' | 'disabled' | undefined,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadRef.current({
        page: requestedPage,
        pageSize: requestedPageSize,
        q: requestedQuery || undefined,
        status: requestedStatus,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setRecords(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(loadError instanceof Error ? loadError.message : t('admin.marketing.promotions.error', 'Promotion data could not be loaded'));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadRecords(page, pageSize, debouncedQuery, debouncedStatus);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadRecords, page, pageSize, debouncedQuery, debouncedStatus, refreshKey]);

  const applySearch = (nextQuery: string, nextStatus: 'active' | 'disabled' | undefined) => {
    setQuery(nextQuery);
    setStatus(nextStatus);
    setPage(1);
  };

  if (isLoading && records.length === 0) {
    return (
      <BusinessStatePanel
        kind="loading"
        title={t('admin.marketing.promotions.loading', 'Loading promotion records...')}
        className="min-h-48"
      />
    );
  }

  if (error && records.length === 0) {
    return (
      <BusinessStatePanel
        kind="error"
        title={title}
        description={error}
        onRetry={() => void loadRecords(page, pageSize, debouncedQuery, debouncedStatus)}
        className="min-h-48"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {error ? (
        <div className="shrink-0 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => applySearch(event.target.value, status)}
              placeholder={searchPlaceholder ?? t('admin.marketing.promotions.search', 'Search records')}
              className="h-8 w-64 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            />
          </div>
          {showStatusFilter ? (
            <select
              value={status ?? ''}
              onChange={(event) => applySearch(query, event.target.value === '' ? undefined : event.target.value === 'active' ? 'active' : 'disabled')}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <option value="">{t('admin.marketing.promotions.allStatus', 'All statuses')}</option>
              <option value="active">{t('admin.marketing.promotions.status.active', 'Active')}</option>
              <option value="disabled">{t('admin.marketing.promotions.status.inactive', 'Inactive')}</option>
            </select>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void loadRecords(page, pageSize, debouncedQuery, debouncedStatus)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('common.actions.reload', 'Reload')}
          </button>
          {exportable ? (
            <button
              type="button"
              onClick={() => exportMarketingCsv(records, columns, exportFileName)}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              {t('admin.marketing.promotions.export', 'Export CSV')}
            </button>
          ) : null}
          {toolbarActions}
        </div>
      </div>
      <MarketingTablePanel
        footer={(
          <BottomPagination
            disabled={isLoading}
            hasNextPage={hasNextMarketingPage(pageInfo, page, records.length, pageSize)}
            itemCount={records.length}
            nextLabel={t('common.pagination.next', 'Next page')}
            onNextPage={() => setPage((current) => current + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            }}
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            pageLabel={marketingPageLabel(t('common.pagination.page', 'Page'), page, pageInfo)}
            pageSize={pageSize}
            pageSizeLabel={t('common.pagination.rows', 'Rows')}
            pageSizeOptions={[20, 50, 100]}
            previousLabel={t('common.pagination.previous', 'Previous page')}
            showingLabel={t('common.pagination.showing', 'Showing')}
          />
        )}
      >
        {records.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            {emptyTitle ?? t('admin.marketing.promotions.empty', 'No promotion records')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-2.5 font-medium text-slate-500 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {column.label}
                  </th>
                ))}
                {rowActions ? <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={(record as Record<string, unknown>)['id'] as string} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 text-slate-600 dark:text-slate-300 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {column.render
                        ? column.render((record as Record<string, unknown>)[column.key], record)
                        : formatMarketingCell((record as Record<string, unknown>)[column.key])}
                    </td>
                  ))}
                  {rowActions ? <td className="px-4 py-2.5">{rowActions(record)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </MarketingTablePanel>
    </div>
  );
}

export function exportMarketingCsv<T extends object>(
  records: T[],
  columns: MarketingColumn<T>[],
  fileName: string,
): void {
  const escapeCell = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const rows = records.map((record) => columns
    .map((column) => escapeCell((record as Record<string, unknown>)[column.key]))
    .join(','));
  const blob = new Blob([`﻿${[header, ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatMarketingCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const text = String(value);
  // 后端时间字段为 ISO 8601（含 T），展示为本地时间
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
  return text;
}
