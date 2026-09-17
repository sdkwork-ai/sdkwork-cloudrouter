import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';

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

export interface ConsoleApiKeysState {
  readonly labels: ConsoleApiKeysLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleApiKeySummary[];
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
      return labels.title;
  }
}

export function createConsoleApiKeysState(labels: ConsoleApiKeysLabels): ConsoleApiKeysState {
  let loading = true;
  let error: string | null = null;
  let rows: readonly ConsoleApiKeySummary[] = [];
  let createdSecret: string | null = null;
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
