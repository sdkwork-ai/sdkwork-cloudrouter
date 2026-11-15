/**
 * App Store catalog category contract.
 *
 * Categories are the storefront taxonomy that groups listings. The App Store
 * backend graph is the authority for names, hierarchy, ordering, and lifecycle;
 * this module is the operator console's projection of that graph.
 */

/** Lifecycle status accepted by `appstore.catalog.categories.update`. */
export type AppStoreCategoryWritableStatus = "active" | "inactive" | "deleted";

/**
 * Lifecycle status as reported by the backend.
 *
 * `unknown` keeps a server-side status the console does not recognise visible
 * instead of coercing it into a wrong lifecycle word.
 */
export type AppStoreCategoryStatus = AppStoreCategoryWritableStatus | "unknown";

/** One localized category name and optional description. */
export interface AppStoreCategoryLocalization {
  locale: string;
  displayName: string;
  description?: string;
}

/** One catalog category as the operator console renders it. */
export interface AppStoreCategory {
  id: string;
  /** Stable platform-unique code; immutable after creation. */
  code: string;
  parentId?: string;
  /** Tree depth, 1 for a root category. */
  level: number;
  sortOrder: number;
  status: AppStoreCategoryStatus;
  iconMediaResourceId?: string;
  localizations: readonly AppStoreCategoryLocalization[];
  createdAt?: string;
  updatedAt?: string;
}

/** One cursor page of categories. */
export interface AppStoreCategoryPage {
  items: readonly AppStoreCategory[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface AppStoreCategoryListInput {
  cursor?: string;
  pageSize?: number;
}

export interface AppStoreCategoryCreateInput {
  code: string;
  parentId?: string;
  /** Derived from the parent when omitted. */
  level?: number;
  sortOrder?: number;
  iconMediaResourceId?: string;
  localizations: readonly AppStoreCategoryLocalization[];
}

/**
 * Partial update. Omitted fields stay unchanged on the backend.
 *
 * The contract has no "clear parent" operation: `parentCategoryId` is only
 * applied when present, so a category moved under a parent cannot be detached
 * back to the root. Callers must not present that as an available action.
 */
export interface AppStoreCategoryUpdateInput {
  parentId?: string;
  level?: number;
  sortOrder?: number;
  status?: AppStoreCategoryWritableStatus;
  iconMediaResourceId?: string;
  localizations?: readonly AppStoreCategoryLocalization[];
}

/**
 * App Store category operations used by the App Center.
 *
 * The interface is the seam that keeps pages independent from the generated
 * transport: tests and hosts can supply their own implementation, and the
 * default one composes `@sdkwork/appstore-backend-sdk`.
 */
export interface AppStoreCategoryService {
  list(input?: AppStoreCategoryListInput): Promise<AppStoreCategoryPage>;
  create(input: AppStoreCategoryCreateInput): Promise<AppStoreCategory>;
  update(id: string, input: AppStoreCategoryUpdateInput): Promise<AppStoreCategory | undefined>;
}
