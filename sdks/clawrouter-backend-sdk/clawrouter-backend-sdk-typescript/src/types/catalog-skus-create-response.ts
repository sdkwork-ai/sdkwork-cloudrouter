import type { CatalogSkusCreateResult } from './catalog-skus-create-result';

export interface CatalogSkusCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
