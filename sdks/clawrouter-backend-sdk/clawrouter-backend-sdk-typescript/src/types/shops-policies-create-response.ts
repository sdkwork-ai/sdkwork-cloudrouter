import type { ShopsPoliciesCreateResult } from './shops-policies-create-result';

export interface ShopsPoliciesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
