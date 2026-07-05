import type { CatalogSpusRetrieveResult } from './catalog-spus-retrieve-result';

export interface CatalogSpusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
