/** Upstream account group schema exposed by Claw Router. */
export interface UpstreamAccountGroup {
  /** Cost multiplier field on upstream account group. */
  costMultiplier: string;
  /** Description field on upstream account group. */
  description: string | null;
  /** Environment field on upstream account group. */
  environment: number | null;
  /** Fallback mode field on upstream account group. */
  fallbackMode: 'none' | 'sequential' | 'same_supplier' | 'cross_supplier';
  /** Group code field on upstream account group. */
  groupCode: string;
  /** Group name field on upstream account group. */
  groupName: string;
  /** Group type field on upstream account group. */
  groupType: string;
  /** Id field on upstream account group. */
  id: string;
  /** Priority field on upstream account group. */
  priority: number;
  /** Routing strategy field on upstream account group. */
  routingStrategy: 'weighted' | 'round_robin' | 'least_latency' | 'least_cost' | 'failover';
  /** Sale multiplier field on upstream account group. */
  saleMultiplier: string;
  /** Status field on upstream account group. */
  status: number;
  /** Updated at field on upstream account group. */
  updatedAt: string;
  /** Uuid field on upstream account group. */
  uuid: string;
  /** Version field on upstream account group. */
  version: string;
}
