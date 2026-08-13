/** Create upstream account group request schema exposed by Cloud Router. */
export interface CreateUpstreamAccountGroupRequest {
  /** Cost multiplier field on create upstream account group request. */
  costMultiplier?: string | null;
  /** Description field on create upstream account group request. */
  description?: string | null;
  /** Environment field on create upstream account group request. */
  environment?: number | null;
  /** Fallback mode field on create upstream account group request. */
  fallbackMode?: 'none' | 'sequential' | 'same_supplier' | 'cross_supplier' | null;
  /** Group code field on create upstream account group request. */
  groupCode?: string;
  /** Group name field on create upstream account group request. */
  groupName: string;
  /** Group type field on create upstream account group request. */
  groupType?: 'mixed' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'other' | null;
  /** Modalities field on create upstream account group request. */
  modalities?: ('text' | 'audio' | 'image' | 'video' | 'music')[] | null;
  /** Model blacklist of this group. Vendor + model entries the whole group is forbidden to serve. An entry with an empty models array forbids every model of the vendor. The blacklist wins over the whitelist. */
  modelBlacklist?: { models: string[]; vendorCode: string; }[] | null;
  /** Model whitelist of this group. When non-empty, the group serves only matching vendor + model entries. An entry with an empty models array allows every model of the vendor. */
  modelWhitelist?: { models: string[]; vendorCode: string; }[] | null;
  /** Priority field on create upstream account group request. */
  priority?: number | null;
  /** Routing strategy field on create upstream account group request. */
  routingStrategy?: 'weighted' | 'round_robin' | 'least_latency' | 'least_cost' | 'failover' | null;
  /** Sale multiplier field on create upstream account group request. */
  saleMultiplier?: string | null;
  /** Status field on create upstream account group request. */
  status?: number | null;
  /** Tags field on create upstream account group request. */
  tags?: ('stable' | 'hot' | 'recommended' | 'promotion' | 'new' | 'premium' | 'high_value' | 'official' | 'beta' | 'limited')[] | null;
  /** Vendor code field on create upstream account group request. */
  vendorCode?: string | null;
}
