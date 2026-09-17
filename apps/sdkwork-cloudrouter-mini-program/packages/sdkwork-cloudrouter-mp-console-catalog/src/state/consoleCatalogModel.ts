import type { ConsoleCatalogRateRow } from '@sdkwork/cloudrouter-contracts';

export interface ConsoleCatalogLabels {
  readonly title: string;
  readonly columnVendor: string;
  readonly columnModel: string;
  readonly columnInput: string;
  readonly columnOutput: string;
  readonly loading: string;
  readonly empty: string;
  readonly reload: string;
}

export interface ConsoleCatalogState {
  readonly labels: ConsoleCatalogLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleCatalogRateRow[];
  setLoading(value: boolean): void;
  setError(value: string | null): void;
  setRows(page: { readonly items: readonly ConsoleCatalogRateRow[] }): void;
}

/** Formats a per-million-token price for the catalog list. */
export function formatPrice(value: number | null, currency: string, locale: string): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 4,
  }).format(value);
}

export function createConsoleCatalogState(labels: ConsoleCatalogLabels): ConsoleCatalogState {
  let loading = true;
  let error: string | null = null;
  let rows: readonly ConsoleCatalogRateRow[] = [];
  return {
    labels,
    pageSize: 50,
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get rows() {
      return rows;
    },
    setLoading(value) {
      loading = value;
    },
    setError(value) {
      error = value;
    },
    setRows(page) {
      rows = page.items;
    },
  };
}
