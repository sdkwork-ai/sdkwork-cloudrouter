import type { JsonValue } from './json-value';

/** Chain policy result schema exposed by Claw Router. */
export interface ChainPolicyResult {
  /** Item field on chain policy result. */
  item: { id: string; payload: Record<string, JsonValue>; policyName: string; scopeId: string; scopeType: number; updatedAt: string; };
}
