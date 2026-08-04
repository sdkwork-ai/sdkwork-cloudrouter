import type { ChainPolicyResult } from './chain-policy-result';

/** Chains policy api key retrieve result schema exposed by Claw Router. */
export interface ChainsPolicyApiKeyRetrieveResult {
  code: 0;
  data: unknown & ChainPolicyResult;
  /** Server-owned request correlation id. */
  traceId: string;
}
