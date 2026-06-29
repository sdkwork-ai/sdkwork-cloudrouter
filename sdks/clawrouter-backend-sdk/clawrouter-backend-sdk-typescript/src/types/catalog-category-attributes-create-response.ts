import type { CatalogCategoryAttributesCreateResult } from './catalog-category-attributes-create-result';

export interface CatalogCategoryAttributesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
