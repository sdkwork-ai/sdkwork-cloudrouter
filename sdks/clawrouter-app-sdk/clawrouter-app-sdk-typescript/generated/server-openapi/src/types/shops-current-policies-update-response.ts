import type { ShopsCurrentPoliciesUpdateResult } from './shops-current-policies-update-result';

export interface ShopsCurrentPoliciesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
