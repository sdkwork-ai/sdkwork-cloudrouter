import type { CatalogCategoriesRetrieveResult } from './catalog-categories-retrieve-result';

export interface CatalogCategoriesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
