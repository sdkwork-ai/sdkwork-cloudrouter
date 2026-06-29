import type { CatalogProductsUpdateResult } from './catalog-products-update-result';

export interface CatalogProductsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
