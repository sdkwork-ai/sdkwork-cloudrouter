import type { CatalogSpusUpdateResult } from './catalog-spus-update-result';

export interface CatalogSpusUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
