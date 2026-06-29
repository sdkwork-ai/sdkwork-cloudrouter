import type { ShopsCurrentProductsUpdateResult } from './shops-current-products-update-result';

export interface ShopsCurrentProductsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
