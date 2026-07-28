/** Upstream account group member input schema exposed by Claw Router. */
export interface UpstreamAccountGroupMemberInput {
  /** Account id field on upstream account group member input. */
  accountId: string;
  /** Cost multiplier override field on upstream account group member input. */
  costMultiplierOverride?: string | null;
  /** Enabled field on upstream account group member input. */
  enabled?: boolean | null;
  /** Priority field on upstream account group member input. */
  priority?: number | null;
  /** Routing weight field on upstream account group member input. */
  routingWeight?: number | null;
  /** Status field on upstream account group member input. */
  status?: number | null;
}
