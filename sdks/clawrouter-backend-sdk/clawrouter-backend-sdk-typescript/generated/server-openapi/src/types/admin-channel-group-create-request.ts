/** AdminChannelGroupCreateRequest contract. */
export interface AdminChannelGroupCreateRequest {
  /** capacity field on AdminChannelGroupCreateRequest. */
  capacity: Record<string, unknown>;
  /** groupCode field on AdminChannelGroupCreateRequest. */
  groupCode: string;
  /** groupName field on AdminChannelGroupCreateRequest. */
  groupName: string;
  /** groupType field on AdminChannelGroupCreateRequest. */
  groupType: 'public' | 'dedicated';
  /** officialPriceMultiplier field on AdminChannelGroupCreateRequest. */
  officialPriceMultiplier?: number;
  /** priceReferenceMode field on AdminChannelGroupCreateRequest. */
  priceReferenceMode: 'multiplier' | 'official_price';
  /** rateMultiplier field on AdminChannelGroupCreateRequest. */
  rateMultiplier?: number;
  /** resourceCodes field on AdminChannelGroupCreateRequest. */
  resourceCodes?: string[];
  /** resourceGroupCodes field on AdminChannelGroupCreateRequest. */
  resourceGroupCodes?: string[];
  /** status field on AdminChannelGroupCreateRequest. */
  status: 'active' | 'disabled';
}
