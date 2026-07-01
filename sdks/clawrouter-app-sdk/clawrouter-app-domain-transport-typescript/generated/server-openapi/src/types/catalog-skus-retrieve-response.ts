import type { CatalogSkusRetrieveResult } from './catalog-skus-retrieve-result';

export interface CatalogSkusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
