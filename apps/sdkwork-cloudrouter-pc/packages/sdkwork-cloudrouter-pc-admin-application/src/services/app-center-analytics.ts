import type { ApplicationScaffoldService } from "../types/application-scaffolds";
import type { ApplicationScaffoldAdminService } from "./application-scaffold-admin";
import type { AppStoreModerationService } from "../types/appstore-moderation";
import type { AppStorePublisherService } from "../types/appstore-publishers";
import type { AppStoreListingService } from "../types/appstore-listings";
import type { AppStoreCollectionService } from "../types/appstore-collections";
import type { ApplicationScaffoldStatus } from "../types/application-scaffolds";

/**
 * Read-only App Center operations snapshot.
 *
 * Every metric is an exact backend total (list `total` or status-filtered
 * totals), never an estimate from a truncated page. Sources are loaded
 * independently so one failing backend degrades one card instead of the page.
 */
export interface AppCenterAnalyticsSnapshot {
  scaffoldsByStatus: Record<ApplicationScaffoldStatus, number>;
  scaffoldsTotal: number;
  moderationPending: number;
  publishersTotal: number;
  listingsTotal: number;
  collectionsTotal: number;
  scaffoldCategoriesTotal: number;
}

export interface AppCenterAnalyticsDependencies {
  scaffolds: Pick<ApplicationScaffoldService, "list">;
  scaffoldAdmin: Pick<ApplicationScaffoldAdminService, "listCategories">;
  moderation: Pick<AppStoreModerationService, "listQueue">;
  publishers: Pick<AppStorePublisherService, "list">;
  listings: Pick<AppStoreListingService, "list">;
  collections: Pick<AppStoreCollectionService, "list">;
}

export interface AppCenterAnalyticsFailure {
  source: "scaffolds" | "moderation" | "publishers" | "listings" | "collections" | "scaffoldCategories";
  error: unknown;
}

export interface AppCenterAnalyticsResult {
  snapshot: AppCenterAnalyticsSnapshot;
  failures: readonly AppCenterAnalyticsFailure[];
}

const SCAFFOLD_STATUSES: readonly ApplicationScaffoldStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
];

const EMPTY_SNAPSHOT: AppCenterAnalyticsSnapshot = {
  scaffoldsByStatus: {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    DISABLED: 0,
  },
  scaffoldsTotal: 0,
  moderationPending: 0,
  publishersTotal: 0,
  listingsTotal: 0,
  collectionsTotal: 0,
  scaffoldCategoriesTotal: 0,
};

export async function loadAppCenterAnalytics(
  deps: AppCenterAnalyticsDependencies,
): Promise<AppCenterAnalyticsResult> {
  const failures: AppCenterAnalyticsFailure[] = [];
  const snapshot: AppCenterAnalyticsSnapshot = {
    ...EMPTY_SNAPSHOT,
    scaffoldsByStatus: { ...EMPTY_SNAPSHOT.scaffoldsByStatus },
  };

  const [scaffoldResults, moderation, publishers, listings, collections, scaffoldCategories] = await Promise.all([
    Promise.allSettled(SCAFFOLD_STATUSES.map((status) =>
      deps.scaffolds.list({ page: 1, pageSize: 1, status }))),
    settle("moderation", () => deps.moderation.listQueue({ reviewStatus: "PENDING", pageSize: 50 })),
    settle("publishers", () => deps.publishers.list({ pageSize: 50 })),
    settle("listings", () => deps.listings.list({ pageSize: 50 })),
    settle("collections", () => deps.collections.list({ pageSize: 50 })),
    settle("scaffoldCategories", () => deps.scaffoldAdmin.listCategories()),
  ]);

  let scaffoldFailureRecorded = false;
  SCAFFOLD_STATUSES.forEach((status, index) => {
    const result = scaffoldResults[index];
    if (result?.status === "fulfilled") {
      snapshot.scaffoldsByStatus[status] = result.value.total;
      snapshot.scaffoldsTotal += result.value.total;
    } else if (result?.status === "rejected" && !scaffoldFailureRecorded) {
      scaffoldFailureRecorded = true;
      failures.push({ source: "scaffolds", error: result.reason });
    }
  });

  if (moderation.ok) {
    snapshot.moderationPending = moderation.value.total ?? moderation.value.items.length;
  } else {
    failures.push({ source: "moderation", error: moderation.error });
  }

  if (publishers.ok) {
    snapshot.publishersTotal = publishers.value.total ?? publishers.value.items.length;
  } else {
    failures.push({ source: "publishers", error: publishers.error });
  }

  if (listings.ok) {
    snapshot.listingsTotal = listings.value.total ?? listings.value.items.length;
  } else {
    failures.push({ source: "listings", error: listings.error });
  }

  if (collections.ok) {
    snapshot.collectionsTotal = collections.value.total ?? collections.value.items.length;
  } else {
    failures.push({ source: "collections", error: collections.error });
  }

  if (scaffoldCategories.ok) {
    snapshot.scaffoldCategoriesTotal = scaffoldCategories.value.length;
  } else {
    failures.push({ source: "scaffoldCategories", error: scaffoldCategories.error });
  }

  return { snapshot, failures };
}

type SettleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

async function settle<T>(
  _source: AppCenterAnalyticsFailure["source"],
  load: () => Promise<T>,
): Promise<SettleResult<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    return { ok: false, error };
  }
}
