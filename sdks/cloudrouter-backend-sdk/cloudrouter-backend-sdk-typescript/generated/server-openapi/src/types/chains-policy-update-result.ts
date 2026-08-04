import type { ChainPolicyResult } from './chain-policy-result';

/** Chains policy update result schema exposed by Cloud Router. */
export interface ChainsPolicyUpdateResult {
  code: 0;
  data: unknown & ChainPolicyResult;
  /** Server-owned request correlation id. */
  traceId: string;
}
