/** Upstream resource entitlement input schema exposed by Claw Router. */
export interface UpstreamResourceEntitlementInput {
  /** Grant type field on upstream resource entitlement input. */
  grantType?: 'allow' | 'deny' | null;
  /** Priority field on upstream resource entitlement input. */
  priority?: number | null;
  /** Resource code field on upstream resource entitlement input. */
  resourceCode?: string | null;
  /** Resource group code field on upstream resource entitlement input. */
  resourceGroupCode?: string | null;
  /** Status field on upstream resource entitlement input. */
  status?: number | null;
}
