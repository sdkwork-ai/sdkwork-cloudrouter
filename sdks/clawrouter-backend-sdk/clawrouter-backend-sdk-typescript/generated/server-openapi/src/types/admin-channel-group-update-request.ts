/** AdminChannelGroupUpdateRequest contract. */
export interface AdminChannelGroupUpdateRequest {
  /** capacity field on AdminChannelGroupUpdateRequest. */
  capacity?: Record<string, unknown>;
  /** groupCode field on AdminChannelGroupUpdateRequest. */
  groupCode?: string;
  /** groupName field on AdminChannelGroupUpdateRequest. */
  groupName?: string;
  /** groupType field on AdminChannelGroupUpdateRequest. */
  groupType?: 'public' | 'dedicated';
  /** officialPriceMultiplier field on AdminChannelGroupUpdateRequest. */
  officialPriceMultiplier?: number;
  /** priceReferenceMode field on AdminChannelGroupUpdateRequest. */
  priceReferenceMode?: 'multiplier' | 'official_price';
  /** rateMultiplier field on AdminChannelGroupUpdateRequest. */
  rateMultiplier?: number;
  /** resourceCodes field on AdminChannelGroupUpdateRequest. */
  resourceCodes?: string[];
  /** resourceGroupCodes field on AdminChannelGroupUpdateRequest. */
  resourceGroupCodes?: string[];
  /** status field on AdminChannelGroupUpdateRequest. */
  status?: 'active' | 'disabled';
}
