import type { CatalogCategoryAttributesUpdateResult } from './catalog-category-attributes-update-result';

export interface CatalogCategoryAttributesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
