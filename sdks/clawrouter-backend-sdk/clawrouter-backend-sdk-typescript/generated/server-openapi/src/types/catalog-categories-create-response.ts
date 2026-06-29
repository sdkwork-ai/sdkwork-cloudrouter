import type { CatalogCategoriesCreateResult } from './catalog-categories-create-result';

export interface CatalogCategoriesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
