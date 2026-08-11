/** Upstream account group schema exposed by Cloud Router. */
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
  /** Group name i 18 n field on upstream account group. */
  groupNameI18n?: string | null;
  /** Group type field on upstream account group. */
  groupType: 'mixed' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'other';
  /** Id field on upstream account group. */
  id: string;
  /** Whether this group is the single default group of the tenant and organization scope. */
  isDefault: boolean;
  /** Modalities field on upstream account group. */
  modalities?: ('text' | 'audio' | 'image' | 'video' | 'music')[];
  /** Priority field on upstream account group. */
  priority: number;
  /** Routing strategy field on upstream account group. */
  routingStrategy: 'weighted' | 'round_robin' | 'least_latency' | 'least_cost' | 'failover';
  /** Sale multiplier field on upstream account group. */
  saleMultiplier: string;
  /** Status field on upstream account group. */
  status: number;
  /** Tags field on upstream account group. */
  tags?: ('stable' | 'hot' | 'recommended' | 'promotion' | 'new' | 'premium' | 'high_value' | 'official' | 'beta' | 'limited')[];
  /** Updated at field on upstream account group. */
  updatedAt: string;
  /** Uuid field on upstream account group. */
  uuid: string;
  /** Vendor code field on upstream account group. */
  vendorCode?: string | null;
  /** Version field on upstream account group. */
  version: string;
}
