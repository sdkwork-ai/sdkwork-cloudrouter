/** Upstream resource entitlement schema exposed by Claw Router. */
export interface UpstreamResourceEntitlement {
  /** Grant type field on upstream resource entitlement. */
  grantType: 'allow' | 'deny';
  /** Id field on upstream resource entitlement. */
  id: string;
  /** Priority field on upstream resource entitlement. */
  priority: number;
  /** Resource code field on upstream resource entitlement. */
  resourceCode: string;
  /** Resource group code field on upstream resource entitlement. */
  resourceGroupCode: string;
  /** Status field on upstream resource entitlement. */
  status: number;
}
