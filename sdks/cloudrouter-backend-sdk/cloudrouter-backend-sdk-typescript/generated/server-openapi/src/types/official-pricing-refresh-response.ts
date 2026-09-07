/** Official pricing refresh response schema exposed by Cloud Router. */
export interface OfficialPricingRefreshResponse {
  /** Catalog version field on official pricing refresh response. */
  catalogVersion: string;
  /** Changed field on official pricing refresh response. */
  changed: boolean;
  /** Deprecated price setting count field on official pricing refresh response. */
  deprecatedPriceSettingCount: number;
  /** Mode field on official pricing refresh response. */
  mode: string;
  /** Model count field on official pricing refresh response. */
  modelCount: number;
  /** Price book count field on official pricing refresh response. */
  priceBookCount: number;
  /** Price count field on official pricing refresh response. */
  priceCount: number;
  /** Rate count field on official pricing refresh response. */
  rateCount: number;
  /** Removed price setting count field on official pricing refresh response. */
  removedPriceSettingCount: number;
  /** Restored price setting count field on official pricing refresh response. */
  restoredPriceSettingCount: number;
  /** Snapshot id field on official pricing refresh response. */
  snapshotId: string;
  /** Source field on official pricing refresh response. */
  source: string;
  /** Sync run id field on official pricing refresh response. */
  syncRunId: string;
  /** Synced field on official pricing refresh response. */
  synced: boolean;
  /** Vendor count field on official pricing refresh response. */
  vendorCount: number;
}
