import type { ShopsCurrentProductsUnpublishResult } from './shops-current-products-unpublish-result';

export interface ShopsCurrentProductsUnpublishResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
