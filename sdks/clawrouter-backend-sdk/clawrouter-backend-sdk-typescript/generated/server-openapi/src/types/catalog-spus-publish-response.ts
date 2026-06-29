import type { CatalogSpusPublishResult } from './catalog-spus-publish-result';

export interface CatalogSpusPublishResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
