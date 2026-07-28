/** Upstream account group member schema exposed by Claw Router. */
export interface UpstreamAccountGroupMember {
  /** Account code field on upstream account group member. */
  accountCode: string;
  /** Account id field on upstream account group member. */
  accountId: string;
  /** Account name field on upstream account group member. */
  accountName: string;
  /** Cost multiplier override field on upstream account group member. */
  costMultiplierOverride: string | null;
  /** Enabled field on upstream account group member. */
  enabled: boolean;
  /** Id field on upstream account group member. */
  id: string;
  /** Priority field on upstream account group member. */
  priority: number;
  /** Routing weight field on upstream account group member. */
  routingWeight: number;
  /** Status field on upstream account group member. */
  status: number;
}
