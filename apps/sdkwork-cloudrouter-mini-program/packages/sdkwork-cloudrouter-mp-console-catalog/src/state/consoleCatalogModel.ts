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

/** Presentation row the WXML template binds to. */
export interface ConsoleCatalogDisplayRow {
  readonly id: string;
  readonly vendor: string;
  readonly model: string;
  readonly inputPrice: string;
  readonly outputPrice: string;
}

export interface ConsoleCatalogState {
  readonly labels: ConsoleCatalogLabels;
  readonly pageSize: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rows: readonly ConsoleCatalogRateRow[];
  readonly displayRows: readonly ConsoleCatalogDisplayRow[];
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

/** Projects catalog rate rows onto the display rows the template renders. */
export function toConsoleCatalogDisplayRows(
  rows: readonly ConsoleCatalogRateRow[],
  locale: string,
): readonly ConsoleCatalogDisplayRow[] {
  return rows.map((row) => ({
    id: row.id,
    vendor: row.vendor,
    model: row.model,
    inputPrice: formatPrice(row.inputPricePerMillionTokens, row.currency, locale),
    outputPrice: formatPrice(row.outputPricePerMillionTokens, row.currency, locale),
  }));
}

export function createConsoleCatalogState(
  labels: ConsoleCatalogLabels,
  locale: string,
): ConsoleCatalogState {
  let loading = true;
  let error: string | null = null;
  let rows: readonly ConsoleCatalogRateRow[] = [];
  const displayRows = () => toConsoleCatalogDisplayRows(rows, locale);
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
    get displayRows() {
      return displayRows();
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
