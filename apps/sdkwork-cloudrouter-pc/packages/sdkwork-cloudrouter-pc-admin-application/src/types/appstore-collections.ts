/**
 * App Store editorial collection models.
 *
 * Collections group listings for storefront merchandising. Operators list,
 * create, update (status/sort), and replace the ordered item set.
 */

export interface AppStoreCollection {
  collectionId: string;
  collectionCode: string;
  collectionType?: string;
  audienceScope?: string;
  status?: string;
  sortOrder?: number;
  displayName?: string;
  itemCount?: number;
}

export interface AppStoreCollectionPage {
  items: readonly AppStoreCollection[];
  hasMore: boolean;
  nextCursor?: string;
  /** Exact collection total when the backend reports it. */
  total?: number;
}

export interface AppStoreCollectionQuery {
  cursor?: string;
  pageSize?: number;
}

export interface AppStoreCollectionCreateInput {
  collectionCode: string;
  collectionType: string;
  audienceScope?: string;
}

export interface AppStoreCollectionUpdateInput {
  collectionStatus?: string;
  sortOrder?: number;
}

export interface AppStoreCollectionItemInput {
  listingId: string;
  sortOrder?: number;
}

export interface AppStoreCollectionService {
  list(query?: AppStoreCollectionQuery): Promise<AppStoreCollectionPage>;
  create(input: AppStoreCollectionCreateInput): Promise<string | undefined>;
  update(collectionId: string, input: AppStoreCollectionUpdateInput): Promise<void>;
  replaceItems(collectionId: string, items: readonly AppStoreCollectionItemInput[]): Promise<void>;
}
