import type { CatalogAttributesCreateResult } from './catalog-attributes-create-result';

export interface CatalogAttributesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
