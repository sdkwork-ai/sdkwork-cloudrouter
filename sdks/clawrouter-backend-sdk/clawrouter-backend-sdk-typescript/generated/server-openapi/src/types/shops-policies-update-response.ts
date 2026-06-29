import type { ShopsPoliciesUpdateResult } from './shops-policies-update-result';

export interface ShopsPoliciesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
