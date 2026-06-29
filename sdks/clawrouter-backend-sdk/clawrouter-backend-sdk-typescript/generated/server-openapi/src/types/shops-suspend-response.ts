import type { ShopsSuspendResult } from './shops-suspend-result';

export interface ShopsSuspendResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
