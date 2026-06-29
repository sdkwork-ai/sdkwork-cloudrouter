import type { CatalogProductsManagementRetrieveResult } from './catalog-products-management-retrieve-result';

export interface CatalogProductsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
