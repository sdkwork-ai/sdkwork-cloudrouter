import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';
import { formatIsoTimestamp } from '@sdkwork/cloudrouter-service';

export interface ConsoleApiKeysLabels {
  readonly title: string;
  readonly namePlaceholder: string;
  readonly create: string;
  readonly revoke: string;
  readonly statusActive: string;
  readonly statusDisabled: string;
  readonly statusRevoked: string;
  readonly createdOnce: string;
  readonly loading: string;
  readonly empty: string;
  readonly reload: string;
}

/** Presentation row the WXML template binds to. */
export interface ConsoleApiKeyDisplayRow {
  readonly id: string;
  readonly name: string;
  readonly maskedKey: string;
  readonly status: string;
  readonly createdAt: string;
  readonly revoked: boolean;
}

export interface ConsoleApiKeysState {
  readonly labels: ConsoleApiKeysLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleApiKeySummary[];
  readonly displayRows: readonly ConsoleApiKeyDisplayRow[];
  readonly createdSecret: string | null;
  setLoading(value: boolean): void;
  setError(value: string | null): void;
  setRows(rows: readonly ConsoleApiKeySummary[]): void;
  setCreatedSecret(value: string | null): void;
}

/** Maps an API key status onto its localized label. */
export function statusText(status: ConsoleApiKeySummary['status'], labels: ConsoleApiKeysLabels): string {
  switch (status) {
    case 'active':
      return labels.statusActive;
    case 'disabled':
      return labels.statusDisabled;
    case 'revoked':
      return labels.statusRevoked;
    default:
      return '—';
  }
}

/** Projects API key summaries onto the display rows the template renders. */
export function toConsoleApiKeyDisplayRows(
  rows: readonly ConsoleApiKeySummary[],
  locale: string,
  labels: ConsoleApiKeysLabels,
): readonly ConsoleApiKeyDisplayRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    maskedKey: row.maskedKey,
    status: statusText(row.status, labels),
    createdAt: formatIsoTimestamp(row.createdAt, locale) ?? '—',
    revoked: row.status === 'revoked',
  }));
}

export function createConsoleApiKeysState(
  labels: ConsoleApiKeysLabels,
  locale: string,
): ConsoleApiKeysState {
  let loading = true;
  let error: string | null = null;
  let rows: readonly ConsoleApiKeySummary[] = [];
  let createdSecret: string | null = null;
  const displayRows = () => toConsoleApiKeyDisplayRows(rows, locale, labels);
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
    get displayRows() {
      return displayRows();
    },
    get createdSecret() {
      return createdSecret;
    },
    setLoading(value) {
      loading = value;
    },
    setError(value) {
      error = value;
    },
    setRows(next) {
      rows = next;
    },
    setCreatedSecret(value) {
      createdSecret = value;
    },
  };
}
