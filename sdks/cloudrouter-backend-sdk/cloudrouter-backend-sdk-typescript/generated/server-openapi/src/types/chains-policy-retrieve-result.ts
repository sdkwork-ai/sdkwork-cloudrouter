import type { ChainPolicyResult } from './chain-policy-result';

/** Chains policy retrieve result schema exposed by Cloud Router. */
export interface ChainsPolicyRetrieveResult {
  code: 0;
  data: unknown & ChainPolicyResult;
  /** Server-owned request correlation id. */
  traceId: string;
}
