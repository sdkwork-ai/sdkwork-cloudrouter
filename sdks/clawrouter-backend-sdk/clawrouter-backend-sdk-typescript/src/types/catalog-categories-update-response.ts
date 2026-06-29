import type { CatalogCategoriesUpdateResult } from './catalog-categories-update-result';

export interface CatalogCategoriesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
