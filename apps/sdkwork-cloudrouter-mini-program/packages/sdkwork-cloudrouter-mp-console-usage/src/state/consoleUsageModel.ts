import type { ConsoleUsageRecord } from '@sdkwork/cloudrouter-contracts';
import { formatIsoTimestamp, formatMinorUnitsAsCurrency, formatTokenCount } from '@sdkwork/cloudrouter-service';

export interface ConsoleUsageLabels {
  readonly title: string;
  readonly columnModel: string;
  readonly columnTokens: string;
  readonly columnCost: string;
  readonly columnStatus: string;
  readonly columnTime: string;
  readonly statusSucceeded: string;
  readonly statusFailed: string;
  readonly statusProcessing: string;
  readonly statusUnknown: string;
  readonly loading: string;
  readonly empty: string;
  readonly reload: string;
}

/** Presentation row the WXML template binds to. */
export interface ConsoleUsageDisplayRow {
  readonly id: string;
  readonly model: string;
  readonly tokens: string;
  readonly cost: string;
  readonly status: string;
  readonly time: string;
}

export interface ConsoleUsageState {
  readonly labels: ConsoleUsageLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleUsageRecord[];
  readonly displayRows: readonly ConsoleUsageDisplayRow[];
  readonly page: number;
  readonly hasMore: boolean;
  setLoading(value: boolean): void;
  setLoadingMore(value: boolean): void;
  setError(value: string | null): void;
  /** Replaces the rows with the first page. */
  setRows(page: { readonly items: readonly ConsoleUsageRecord[]; readonly page: number; readonly hasMore: boolean }): void;
  /** Appends a later page onto the existing rows. */
  appendRows(page: { readonly items: readonly ConsoleUsageRecord[]; readonly page: number; readonly hasMore: boolean }): void;
}

/** Maps a usage status onto its localized label. */
export function statusLabel(status: ConsoleUsageRecord['status'], labels: ConsoleUsageLabels): string {
  switch (status) {
    case 'succeeded':
      return labels.statusSucceeded;
    case 'failed':
      return labels.statusFailed;
    case 'processing':
      return labels.statusProcessing;
    default:
      return labels.statusUnknown;
  }
}

/** Projects usage records onto the display rows the template renders. */
export function toConsoleUsageDisplayRows(
  rows: readonly ConsoleUsageRecord[],
  locale: string,
  labels: ConsoleUsageLabels,
): readonly ConsoleUsageDisplayRow[] {
  return rows.map((row) => ({
    id: row.id,
    model: row.model,
    tokens: formatTokenCount(row.totalTokens, locale),
    cost: formatMinorUnitsAsCurrency(row.costMinorUnits, 'CNY', locale),
    status: statusLabel(row.status, labels),
    time: formatIsoTimestamp(row.occurredAt, locale) ?? '-',
  }));
}

export function createConsoleUsageState(
  labels: ConsoleUsageLabels,
  locale: string,
): ConsoleUsageState {
  let loading = true;
  let loadingMore = false;
  let error: string | null = null;
  let rows: readonly ConsoleUsageRecord[] = [];
  let page = 0;
  let hasMore = false;
  const displayRows = () => toConsoleUsageDisplayRows(rows, locale, labels);
  return {
    labels,
    pageSize: 20,
    get loading() {
      return loading;
    },
    get loadingMore() {
      return loadingMore;
    },
    get error() {
      return error;
    },
    get rows() {
      return rows;
    },
    get displayRows() {
      return displayRows();
    },
    get page() {
      return page;
    },
    get hasMore() {
      return hasMore;
    },
    setLoading(value) {
      loading = value;
    },
    setLoadingMore(value) {
      loadingMore = value;
    },
    setError(value) {
      error = value;
    },
    setRows(next) {
      rows = next.items;
      page = next.page;
      hasMore = next.hasMore;
    },
    appendRows(next) {
      rows = [...rows, ...next.items];
      page = next.page;
      hasMore = next.hasMore;
    },
  };
}
