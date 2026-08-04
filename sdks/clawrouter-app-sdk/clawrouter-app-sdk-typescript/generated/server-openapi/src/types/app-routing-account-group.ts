/** App routing account group schema exposed by Claw Router. */
export interface AppRoutingAccountGroup {
  /** Authorized field on app routing account group. */
  authorized: boolean;
  /** Available account count field on app routing account group. */
  availableAccountCount: string;
  /** Cost multiplier field on app routing account group. */
  costMultiplier: string;
  /** Description field on app routing account group. */
  description: string;
  /** Fallback mode field on app routing account group. */
  fallbackMode: string;
  /** Group code field on app routing account group. */
  groupCode: string;
  /** Group name field on app routing account group. */
  groupName: string;
  /** Id field on app routing account group. */
  id: string;
  /** Member account count field on app routing account group. */
  memberAccountCount: string;
  /** Modalities field on app routing account group. */
  modalities?: ('text' | 'audio' | 'image' | 'video' | 'music')[];
  /** Resource codes field on app routing account group. */
  resourceCodes: string[];
  /** Resource group codes field on app routing account group. */
  resourceGroupCodes: string[];
  /** Routing strategy field on app routing account group. */
  routingStrategy: string;
  /** Sale multiplier field on app routing account group. */
  saleMultiplier: string;
  /** Status field on app routing account group. */
  status: 'enabled' | 'disabled';
  /** Vendor code field on app routing account group. */
  vendorCode?: string | null;
}
