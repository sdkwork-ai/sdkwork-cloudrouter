import type { CatalogProductsCreateResult } from './catalog-products-create-result';

export interface CatalogProductsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
