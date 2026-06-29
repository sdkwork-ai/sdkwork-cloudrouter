import type { CatalogSpusCreateResult } from './catalog-spus-create-result';

export interface CatalogSpusCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
