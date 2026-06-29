import type { CatalogSkusUpdateResult } from './catalog-skus-update-result';

export interface CatalogSkusUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
