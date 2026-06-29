import type { CatalogCategorySeedsCreateResult } from './catalog-category-seeds-create-result';

export interface CatalogCategorySeedsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
