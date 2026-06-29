import type { ShopsCurrentProductsPublishResult } from './shops-current-products-publish-result';

export interface ShopsCurrentProductsPublishResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
