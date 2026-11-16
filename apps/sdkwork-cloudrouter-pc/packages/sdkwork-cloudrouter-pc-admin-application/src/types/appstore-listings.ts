/**
 * App Store listing administration models.
 *
 * Listings are the storefront records of published applications. Operators
 * browse them and change storefront visibility (visible / hidden / delisted /
 * region-restricted) with an audit reason.
 */

export type AppStoreListingVisibility =
  | "VISIBLE"
  | "HIDDEN"
  | "DELISTED"
  | "REGION_RESTRICTED";

export interface AppStoreListing {
  listingId: string;
  listingCode?: string;
  displayName: string;
  publisherId?: string;
  publisherName?: string;
  listingStatus: string;
  storefrontVisibility?: string;
  categoryCode?: string;
  platform?: string;
  latestReleaseVersion?: string;
  updatedAt?: string;
}

export interface AppStoreListingPage {
  items: readonly AppStoreListing[];
  hasMore: boolean;
  nextCursor?: string;
  /** Exact listing total when the backend reports it. */
  total?: number;
}

/** Listing detail with the raw operator payload for the inspector. */
export interface AppStoreListingDetail extends AppStoreListing {
  attributes: Readonly<Record<string, unknown>>;
}

export interface AppStoreListingQuery {
  statusFilter?: string;
  reviewStatusFilter?: string;
  cursor?: string;
  pageSize?: number;
}

export interface AppStoreListingVisibilityInput {
  storefrontVisibility: AppStoreListingVisibility;
  reason?: string;
}

export interface AppStoreListingService {
  list(query?: AppStoreListingQuery): Promise<AppStoreListingPage>;
  updateVisibility(listingId: string, input: AppStoreListingVisibilityInput): Promise<void>;
  /** Load listing detail; optional so older hosts remain valid. */
  getListing?(listingId: string): Promise<AppStoreListingDetail | undefined>;
}
