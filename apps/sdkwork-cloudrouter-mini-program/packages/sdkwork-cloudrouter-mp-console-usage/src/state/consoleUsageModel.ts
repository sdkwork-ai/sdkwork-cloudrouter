import type { ConsoleUsageRecord } from '@sdkwork/cloudrouter-contracts';

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

export interface ConsoleUsageState {
  readonly labels: ConsoleUsageLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleUsageRecord[];
  readonly page: number;
  setLoading(value: boolean): void;
  setError(value: string | null): void;
  setRows(page: { readonly items: readonly ConsoleUsageRecord[]; readonly page: number }): void;
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

export function createConsoleUsageState(labels: ConsoleUsageLabels): ConsoleUsageState {
  let loading = true;
  let error: string | null = null;
  let rows: readonly ConsoleUsageRecord[] = [];
  let page = 0;
  return {
    labels,
    pageSize: 20,
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get rows() {
      return rows;
    },
    get page() {
      return page;
    },
    setLoading(value) {
      loading = value;
    },
    setError(value) {
      error = value;
    },
    setRows(next) {
      rows = next.items;
      page = next.page;
    },
  };
}
