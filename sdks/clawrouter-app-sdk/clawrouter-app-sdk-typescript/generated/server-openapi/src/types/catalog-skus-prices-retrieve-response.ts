import type { CatalogSkusPricesRetrieveResult } from './catalog-skus-prices-retrieve-result';

export interface CatalogSkusPricesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
