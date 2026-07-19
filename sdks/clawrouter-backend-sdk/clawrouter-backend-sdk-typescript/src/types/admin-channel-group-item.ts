/** AdminChannelGroupItem contract. */
export interface AdminChannelGroupItem {
  /** accountCount field on AdminChannelGroupItem. */
  accountCount: Record<string, unknown>;
  /** capacity field on AdminChannelGroupItem. */
  capacity: Record<string, unknown>;
  /** groupCode field on AdminChannelGroupItem. */
  groupCode: string;
  /** groupName field on AdminChannelGroupItem. */
  groupName: string;
  /** groupType field on AdminChannelGroupItem. */
  groupType: 'public' | 'dedicated';
  /** id field on AdminChannelGroupItem. */
  id: string;
  /** officialPriceMultiplier field on AdminChannelGroupItem. */
  officialPriceMultiplier: number | unknown;
  /** priceReferenceMode field on AdminChannelGroupItem. */
  priceReferenceMode: 'multiplier' | 'official_price';
  /** providerCode field on AdminChannelGroupItem. */
  providerCode: string;
  /** rateMultiplier field on AdminChannelGroupItem. */
  rateMultiplier: number;
  /** resourceCodes field on AdminChannelGroupItem. */
  resourceCodes: string[];
  /** resourceGroupCodes field on AdminChannelGroupItem. */
  resourceGroupCodes: string[];
  /** status field on AdminChannelGroupItem. */
  status: 'active' | 'disabled';
  /** usage field on AdminChannelGroupItem. */
  usage: Record<string, unknown>;
}
