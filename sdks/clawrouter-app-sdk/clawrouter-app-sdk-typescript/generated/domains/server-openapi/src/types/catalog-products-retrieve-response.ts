import type { CatalogProductsRetrieveResult } from './catalog-products-retrieve-result';

export interface CatalogProductsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
