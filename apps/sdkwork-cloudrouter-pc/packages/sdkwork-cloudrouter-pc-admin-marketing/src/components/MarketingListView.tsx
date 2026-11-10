import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, Search } from 'lucide-react';
import {
  AdminTableShell,
  BottomPagination,
  BusinessStateTableRow,
  CopyButton,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  formatMarketingTimestamp,
  MARKETING_EMPTY_VALUE,
  marketingTimestampTitle,
  readMarketingProblemTraceId,
} from '../marketingService';
import { exportMarketingCsv } from '../marketingCsv';
import {
  hasNextMarketingPage,
  marketingPageLabel,
  MarketingPageJump,
  readMarketingPageInfoNumber,
} from './MarketingPageControls';

const SEARCH_DEBOUNCE_MS = 300;

/** 后端时间形态探测（真正的解析/回退交给 `formatMarketingTimestamp`）。 */
const MARKETING_TIMESTAMP_LIKE_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/u;

/**
 * 列表导出只有一种契约：标注 `masked` 的列写界面展示的脱敏值，其余列写展示值。
 * 本组件不再提供“写接口原值”的导出模式：完整券码只能通过受审计的 reveal /
 * export 调用获取（`codes.reveals.create`、`codeBatches.codeExports.create`），
 * 并由调用页面自行构建导出数据。
 */
export type MarketingColumn<T extends object> = {
  key: string;
  label: string;
  /** 右对齐（历史字段）；数字列建议改用 `numeric`，可同时获得等宽数字。 */
  align?: 'right';
  /** 数字列：右对齐 + `tabular-nums`（设计规范 §2.3）。 */
  numeric?: boolean;
  /** 长文本列：单行截断并把完整值放进 `title`（设计规范 §2.3）。 */
  truncate?: boolean;
  render?: (value: unknown, record: T) => ReactNode;
  /**
   * 该列在界面按脱敏形式展示（券码）。列表导出一律写脱敏值；
   * 券码列表直接使用后端返回的 `codeMasked`，因此不需要再声明该标记。
   */
  masked?: boolean;
};

export type MarketingLoadParams = {
  page: number;
  pageSize: number;
  q?: string;
  /** 域状态值（用户券 claimed/redeemed/…、抵扣申请 applied/…），原样作为 status 查询参数下发。 */
  status?: string;
};

export type MarketingPageResult<T extends object> = {
  items: T[];
  pageInfo: ApiRecord;
};

/** 状态筛选项：value 是后端实际状态值，labelKey/fallback 走 i18n。 */
export type MarketingStatusOption = {
  value: string;
  labelKey: string;
  fallback: string;
};

/** 优惠券、库存、券码等以 active/disabled 为生命周期状态的页面使用的默认词表。 */
const DEFAULT_STATUS_OPTIONS: MarketingStatusOption[] = [
  { value: 'active', labelKey: 'admin.marketing.promotions.status.active', fallback: 'Active' },
  { value: 'disabled', labelKey: 'admin.marketing.promotions.status.inactive', fallback: 'Inactive' },
];

/** 列表错误：人类可读原因 + 可复制的后端 `traceId`。 */
type MarketingLoadError = {
  message: string;
  traceId: string | null;
};

export interface MarketingListViewProps<T extends object> {
  title: string;
  description?: string;
  load: (params: MarketingLoadParams) => Promise<MarketingPageResult<T>>;
  columns: MarketingColumn<T>[];
  searchPlaceholder?: string;
  /** 是否渲染搜索框；后端列表操作没有 `q` 参数时传 `false`，避免留下失效控件。 */
  searchable?: boolean;
  showStatusFilter?: boolean;
  /** 声明式状态词表；省略时使用 active/disabled 默认词表。 */
  statusOptions?: MarketingStatusOption[];
  emptyTitle?: string;
  /** 空态的一句说明（设计规范 §2.3：标题 + 说明），解释「没有记录」意味着什么。 */
  emptyDescription?: string;
  toolbarActions?: ReactNode;
  rowActions?: (record: T) => ReactNode;
  /** 工具栏与表格之间的上下文面板（如逐行揭示的券商码面板、行内反馈条）。 */
  banner?: ReactNode;
  /**
   * 额外筛选控件，渲染在搜索/状态控件右侧（如核销记录的订单/券码/钱包券 ID）。
   *
   * 该节点的**身份**即筛选条件版本：身份变化时列表回到第 1 页并重新拉取。
   * 调用方必须按筛选值 memo 这个节点（`useMemo`），否则每次父组件渲染都会重置页码。
   */
  extraFilters?: ReactNode;
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
  searchable = true,
  showStatusFilter = false,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  emptyTitle,
  emptyDescription,
  toolbarActions,
  rowActions,
  banner,
  extraFilters,
  initialPageSize = 20,
  refreshKey,
  exportable = false,
  exportFileName = 'marketing-records.csv',
}: MarketingListViewProps<T>) {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MarketingLoadError | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncedStatus, setDebouncedStatus] = useState<string | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<ApiRecord | null>(null);
  const requestIdRef = useRef(0);
  // 额外筛选节点身份变化 = 筛选条件变化：回到第 1 页并重新拉取。
  const extraFiltersRef = useRef<ReactNode>(extraFilters);
  const [extraFiltersVersion, setExtraFiltersVersion] = useState(0);
  // 保持最新 load 引用，避免调用方 inline 函数导致 effect 无限循环
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (extraFiltersRef.current === extraFilters) {
      return;
    }
    extraFiltersRef.current = extraFilters;
    setPage(1);
    setExtraFiltersVersion((current) => current + 1);
  }, [extraFilters]);

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
    requestedStatus: string | undefined,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadRef.current({
        page: requestedPage,
        pageSize: requestedPageSize,
        // 不支持检索的列表（searchable=false）不发送 q，连键都不出现。
        ...(searchable && requestedQuery ? { q: requestedQuery } : {}),
        status: requestedStatus,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setRecords(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError({
          message: resolveProblemMessage(
            loadError,
            t,
            t('admin.marketing.promotions.error', 'Promotion data could not be loaded'),
          ),
          traceId: readMarketingProblemTraceId(loadError),
        });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t, searchable]);

  useEffect(() => {
    void loadRecords(page, pageSize, debouncedQuery, debouncedStatus);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadRecords, page, pageSize, debouncedQuery, debouncedStatus, refreshKey, extraFiltersVersion]);

  const applySearch = (nextQuery: string, nextStatus: string | undefined) => {
    setQuery(nextQuery);
    setStatus(nextStatus);
    setPage(1);
  };

  const handleExportClick = () => {
    exportMarketingCsv(records, columns, exportFileName);
  };

  const totalPages = readMarketingPageInfoNumber(pageInfo, 'totalPages');
  const totalItems = readMarketingPageInfoNumber(pageInfo, 'totalItems');
  const exportLabel = t('admin.marketing.promotions.export', 'Export CSV');

  const columnCount = columns.length + (rowActions ? 1 : 0);
  const isFirstLoad = isLoading && records.length === 0;
  const isRefreshing = isLoading && records.length > 0;
  const hasFilterControls = searchable || showStatusFilter || extraFilters !== undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* 唯一页头（设计规范 §2.2）：页面不得再渲染第二个标题。 */}
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      <div className={`flex shrink-0 flex-wrap items-center gap-3 ${hasFilterControls ? 'justify-between' : 'justify-end'}`}>
        {hasFilterControls ? (
          <div className="flex flex-wrap items-center gap-2">
            {searchable ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => applySearch(event.target.value, status)}
                  placeholder={searchPlaceholder ?? t('admin.marketing.promotions.search', 'Search records')}
                  aria-label={searchPlaceholder ?? t('admin.marketing.promotions.search', 'Search records')}
                  className="h-8 w-64 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                />
              </div>
            ) : null}
            {showStatusFilter ? (
              <select
                value={status ?? ''}
                onChange={(event) => applySearch(query, event.target.value === '' ? undefined : event.target.value)}
                aria-label={t('admin.marketing.promotions.allStatus', 'All statuses')}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <option value="">{t('admin.marketing.promotions.allStatus', 'All statuses')}</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey, option.fallback)}
                  </option>
                ))}
              </select>
            ) : null}
            {extraFilters}
          </div>
        ) : null}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void loadRecords(page, pageSize, debouncedQuery, debouncedStatus)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('common.actions.reload', 'Reload')}
          </button>
          {exportable ? (
            <button
              type="button"
              onClick={handleExportClick}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              {exportLabel}
            </button>
          ) : null}
          {toolbarActions}
        </div>
      </div>
      {banner}
      <AdminTableShell
        aria-busy={isLoading ? true : undefined}
        header={isRefreshing ? (
          <div
            role="progressbar"
            aria-label={t('admin.marketing.promotions.refreshing', 'Refreshing records')}
            className="h-[2px] w-full overflow-hidden bg-slate-100 dark:bg-white/10"
          >
            <div className="h-full w-1/3 animate-pulse bg-lobster-500" />
          </div>
        ) : null}
        footer={(
          <>
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
              pageLabel={marketingPageLabel(t, page, pageInfo)}
              pageSize={pageSize}
              pageSizeLabel={t('common.pagination.rows', 'Rows')}
              pageSizeOptions={[20, 50, 100]}
              previousLabel={t('common.pagination.previous', 'Previous page')}
              showingLabel={t('common.pagination.showing', 'Showing')}
            />
            <MarketingPageJump
              totalPages={totalPages}
              disabled={isLoading}
              jumpLabel={t('admin.marketing.pagination.jumpLabel', 'Go to page')}
              goLabel={t('admin.marketing.pagination.go', 'Go')}
              invalidPageLabel={totalPages !== null
                ? t('admin.marketing.pagination.invalidPage', 'Enter a page between 1 and {{totalPages}}', { totalPages })
                : ''}
              totalItemsLabel={totalItems !== null
                ? t('admin.marketing.pagination.totalItems', '{{totalItems}} rows in total', { totalItems })
                : null}
              onJump={(nextPage) => setPage(nextPage)}
            />
          </>
        )}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-[#171717]">
            <tr className="border-b border-slate-200 dark:border-white/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 ${isNumericColumn(column) ? 'text-right' : 'text-left'}`}
                >
                  {column.label}
                </th>
              ))}
              {rowActions ? (
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('common.actions.actions', 'Actions')}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {isFirstLoad ? (
              <BusinessStateTableRow
                kind="loading"
                colSpan={columnCount}
                title={t('admin.marketing.promotions.loading', 'Loading promotion records...')}
              />
            ) : null}
            {error ? (
              <BusinessStateTableRow
                kind="error"
                colSpan={columnCount}
                title={t('admin.marketing.promotions.error', 'Promotion data could not be loaded')}
                description={error.message}
                onRetry={() => void loadRecords(page, pageSize, debouncedQuery, debouncedStatus)}
                retryLabel={t('common.actions.reload', 'Reload')}
              />
            ) : null}
            {error?.traceId ? (
              <tr>
                <td colSpan={columnCount} className="px-6 pb-6 text-center">
                  <div className="mx-auto flex max-w-md items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t('admin.marketing.promotions.error.traceId', 'Trace ID')}</span>
                    <code className="max-w-[18rem] truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {error.traceId}
                    </code>
                    <CopyButton
                      text={error.traceId}
                      label={t('admin.marketing.promotions.error.copyTraceId', 'Copy trace ID')}
                      copiedLabel={t('admin.marketing.codes.copied', 'Copied')}
                      errorLabel={t('admin.marketing.codes.copyFailed', 'Copy failed')}
                      title={t('admin.marketing.promotions.error.copyTraceId', 'Copy trace ID')}
                    />
                  </div>
                </td>
              </tr>
            ) : null}
            {!isFirstLoad && !error && records.length === 0 ? (
              <BusinessStateTableRow
                kind="empty"
                colSpan={columnCount}
                title={emptyTitle ?? t('admin.marketing.promotions.empty', 'No promotion records')}
                description={emptyDescription}
              />
            ) : null}
            {records.map((record) => (
              <tr
                key={(record as Record<string, unknown>)['id'] as string}
                className="h-11 border-b border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                {columns.map((column) => (
                  <MarketingCell
                    key={column.key}
                    column={column}
                    record={record}
                    locale={i18n.language}
                  />
                ))}
                {rowActions ? (
                  <td className="px-4 py-2.5 text-right align-middle">{rowActions(record)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

function isNumericColumn<T extends object>(column: MarketingColumn<T>): boolean {
  return column.numeric === true || column.align === 'right';
}

function MarketingCell<T extends object>({
  column,
  record,
  locale,
}: {
  column: MarketingColumn<T>;
  record: T;
  locale: string;
}) {
  const raw = (record as Record<string, unknown>)[column.key];
  const content = column.render ? column.render(raw, record) : formatMarketingCell(raw, locale);
  const alignment = isNumericColumn(column) ? 'text-right tabular-nums' : 'text-left';
  const rawText = typeof raw === 'string' ? raw.trim() : '';
  const title = column.truncate
    ? readCellTitle(raw)
    : rawText && MARKETING_TIMESTAMP_LIKE_PATTERN.test(rawText)
      ? marketingTimestampTitle(rawText)
      : undefined;
  return (
    <td
      className={`px-4 py-2.5 align-middle text-slate-600 dark:text-slate-300 ${alignment}`}
      title={title}
    >
      {column.truncate ? (
        <span className="block max-w-[20rem] truncate" title={title}>
          {content}
        </span>
      ) : content}
    </td>
  );
}

function readCellTitle(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  return text ? text : undefined;
}

/**
 * 默认单元格渲染：空值统一 `—`；时间列统一走 `formatMarketingTimestamp`
 * （RFC 3339 / 后端 `CAST` 空格形态 / 带 offset），不可解析时原样展示。
 */
function formatMarketingCell(value: unknown, locale: string): ReactNode {
  if (value === null || value === undefined) {
    return MARKETING_EMPTY_VALUE;
  }
  const text = String(value).trim();
  if (!text) {
    return MARKETING_EMPTY_VALUE;
  }
  if (MARKETING_TIMESTAMP_LIKE_PATTERN.test(text)) {
    return formatMarketingTimestamp(text, locale);
  }
  return text;
}
