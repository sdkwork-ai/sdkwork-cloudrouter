/** Admin channel group create request schema exposed by Claw Router. */
export interface AdminChannelGroupCreateRequest {
  /** Capacity field on admin channel group create request. */
  capacity?: Record<string, unknown>;
  /** Stable AI channel group code. */
  groupCode: string;
  /** AI channel group display name. */
  groupName: string;
  /** AI channel group allocation mode. */
  groupType: 'public' | 'dedicated';
  /** Official price multiplier rounded to six decimals. */
  officialPriceMultiplier?: number;
  /** Pricing reference mode for this AI channel group. */
  priceReferenceMode: 'multiplier' | 'official_price';
  /** Customer rate multiplier rounded to six decimals. */
  rateMultiplier?: number;
  /** Individual AI resource codes directly granted to this channel group. */
  resourceCodes?: string[];
  /** AI resource group codes directly granted to this channel group. */
  resourceGroupCodes?: string[];
  /** Status field on admin channel group create request. */
  status: 'active' | 'disabled';
}
