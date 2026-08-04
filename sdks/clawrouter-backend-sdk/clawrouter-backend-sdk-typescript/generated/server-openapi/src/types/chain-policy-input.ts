/** Chain policy input schema exposed by Claw Router. */
export interface ChainPolicyInput {
  /** Concurrency field on chain policy input. */
  concurrency?: { maxInflight?: string | null; maxInflightPerScope?: Record<string, string> | null; };
  /** Ip access field on chain policy input. */
  ipAccess?: { allowlist?: string[] | null; denylist?: string[] | null; mode?: 'open' | 'allowlistOnly' | null; };
  /** Policy name field on chain policy input. */
  policyName?: string | null;
  /** Stages field on chain policy input. */
  stages?: { disabled?: string[] | null; enabledOnly?: string[] | null; };
}
