import type { AdminCapacityPair } from './admin-capacity-pair';
import type { AdminCountPair } from './admin-count-pair';
import type { AdminUsagePair } from './admin-usage-pair';

/** Persisted channel group snapshot returned by the backend. */
export interface AdminChannelGroupItem {
  /** Account count field on admin channel group item. */
  accountCount: AdminCountPair;
  /** Capacity field on admin channel group item. */
  capacity: AdminCapacityPair;
  /** Group code field on admin channel group item. */
  groupCode: string;
  /** Group name field on admin channel group item. */
  groupName: string;
  /** Group type field on admin channel group item. */
  groupType: 'public' | 'dedicated';
  /** Id field on admin channel group item. */
  id: string;
  /** Official price multiplier field on admin channel group item. */
  officialPriceMultiplier: number;
  /** Price reference mode field on admin channel group item. */
  priceReferenceMode: 'multiplier' | 'official_price';
  /** Provider code field on admin channel group item. */
  providerCode: string;
  /** Rate multiplier field on admin channel group item. */
  rateMultiplier: number;
  /** Individual AI resource codes directly granted to this channel group. */
  resourceCodes: string[];
  /** AI resource group codes directly granted to this channel group. */
  resourceGroupCodes: string[];
  /** Status field on admin channel group item. */
  status: 'active' | 'disabled';
  /** Usage field on admin channel group item. */
  usage: AdminUsagePair;
}
