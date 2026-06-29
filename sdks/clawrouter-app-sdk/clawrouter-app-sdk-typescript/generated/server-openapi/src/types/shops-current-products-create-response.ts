import type { ShopsCurrentProductsCreateResult } from './shops-current-products-create-result';

export interface ShopsCurrentProductsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
