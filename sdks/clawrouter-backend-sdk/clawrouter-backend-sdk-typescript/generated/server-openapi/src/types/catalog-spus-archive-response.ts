import type { CatalogSpusArchiveResult } from './catalog-spus-archive-result';

export interface CatalogSpusArchiveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
