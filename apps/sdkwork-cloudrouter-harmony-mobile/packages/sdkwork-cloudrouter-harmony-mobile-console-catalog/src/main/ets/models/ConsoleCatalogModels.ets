/**
 * View/screen models for the console-catalog capability.
 *
 * API DTOs come from generated app SDK clients; this file owns view models,
 * screen models, and route params only. Shared normalization rules live in the
 * TypeScript read-model service (`@sdkwork/cloudrouter-service`) and are not
 * duplicated here.
 */
/** Normalized catalog row. Prices stay null when the catalog has none. */
export interface ConsoleCatalogRow {
  readonly vendor: string;
  readonly model: string;
  readonly inputPricePerMillionTokens: number | null;
  readonly outputPricePerMillionTokens: number | null;
  readonly currency: 'CNY';
}

/** Normalized catalog page. */
export interface ConsoleCatalogPage {
  readonly items: ConsoleCatalogRow[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}

export interface ConsoleCatalogScreenModel {
  readonly items: ConsoleCatalogRow[];
  readonly total: number;
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly errorMessage?: string;
}
