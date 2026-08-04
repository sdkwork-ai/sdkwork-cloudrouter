/** Update upstream account group request schema exposed by Claw Router. */
export interface UpdateUpstreamAccountGroupRequest {
  /** Cost multiplier field on update upstream account group request. */
  costMultiplier?: string | null;
  /** Description field on update upstream account group request. */
  description?: string | null;
  /** Environment field on update upstream account group request. */
  environment?: number | null;
  /** Fallback mode field on update upstream account group request. */
  fallbackMode?: 'none' | 'sequential' | 'same_supplier' | 'cross_supplier' | null;
  /** Group name field on update upstream account group request. */
  groupName?: string;
  /** Group type field on update upstream account group request. */
  groupType?: string | null;
  /** Modalities field on update upstream account group request. */
  modalities?: ('text' | 'audio' | 'image' | 'video' | 'music')[] | null;
  /** Priority field on update upstream account group request. */
  priority?: number | null;
  /** Routing strategy field on update upstream account group request. */
  routingStrategy?: 'weighted' | 'round_robin' | 'least_latency' | 'least_cost' | 'failover' | null;
  /** Sale multiplier field on update upstream account group request. */
  saleMultiplier?: string | null;
  /** Status field on update upstream account group request. */
  status?: number | null;
  /** Vendor code field on update upstream account group request. */
  vendorCode?: string | null;
}
