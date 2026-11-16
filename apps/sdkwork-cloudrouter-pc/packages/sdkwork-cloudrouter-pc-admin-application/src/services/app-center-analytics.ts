import type { DeployAppTemplateService } from "../types/deploy-app-templates";
import type { DeployTemplateAdminService } from "./deploy-template-admin";
import type { AppStoreModerationService } from "../types/appstore-moderation";
import type { AppStorePublisherService } from "../types/appstore-publishers";
import type { AppStoreListingService } from "../types/appstore-listings";
import type { AppStoreCollectionService } from "../types/appstore-collections";
import type { DeployAppTemplateStatus } from "../types/deploy-app-templates";

/**
 * Read-only App Center operations snapshot.
 *
 * Every metric is an exact backend total (list `total` or status-filtered
 * totals), never an estimate from a truncated page. Sources are loaded
 * independently so one failing backend degrades one card instead of the page.
 */
export interface AppCenterAnalyticsSnapshot {
  templatesByStatus: Record<DeployAppTemplateStatus, number>;
  templatesTotal: number;
  moderationPending: number;
  publishersTotal: number;
  listingsTotal: number;
  collectionsTotal: number;
  templateCategoriesTotal: number;
}

export interface AppCenterAnalyticsDependencies {
  templates: Pick<DeployAppTemplateService, "list">;
  templateAdmin: Pick<DeployTemplateAdminService, "listCategories">;
  moderation: Pick<AppStoreModerationService, "listQueue">;
  publishers: Pick<AppStorePublisherService, "list">;
  listings: Pick<AppStoreListingService, "list">;
  collections: Pick<AppStoreCollectionService, "list">;
}

export interface AppCenterAnalyticsFailure {
  source: "templates" | "moderation" | "publishers" | "listings" | "collections" | "templateCategories";
  error: unknown;
}

export interface AppCenterAnalyticsResult {
  snapshot: AppCenterAnalyticsSnapshot;
  failures: readonly AppCenterAnalyticsFailure[];
}

const TEMPLATE_STATUSES: readonly DeployAppTemplateStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
];

const EMPTY_SNAPSHOT: AppCenterAnalyticsSnapshot = {
  templatesByStatus: {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    DISABLED: 0,
  },
  templatesTotal: 0,
  moderationPending: 0,
  publishersTotal: 0,
  listingsTotal: 0,
  collectionsTotal: 0,
  templateCategoriesTotal: 0,
};

export async function loadAppCenterAnalytics(
  deps: AppCenterAnalyticsDependencies,
): Promise<AppCenterAnalyticsResult> {
  const failures: AppCenterAnalyticsFailure[] = [];
  const snapshot: AppCenterAnalyticsSnapshot = {
    ...EMPTY_SNAPSHOT,
    templatesByStatus: { ...EMPTY_SNAPSHOT.templatesByStatus },
  };

  const [templateResults, moderation, publishers, listings, collections, templateCategories] = await Promise.all([
    Promise.allSettled(TEMPLATE_STATUSES.map((status) =>
      deps.templates.list({ page: 1, pageSize: 1, status }))),
    settle("moderation", () => deps.moderation.listQueue({ reviewStatus: "PENDING", pageSize: 50 })),
    settle("publishers", () => deps.publishers.list({ pageSize: 50 })),
    settle("listings", () => deps.listings.list({ pageSize: 50 })),
    settle("collections", () => deps.collections.list({ pageSize: 50 })),
    settle("templateCategories", () => deps.templateAdmin.listCategories()),
  ]);

  let templateFailureRecorded = false;
  TEMPLATE_STATUSES.forEach((status, index) => {
    const result = templateResults[index];
    if (result?.status === "fulfilled") {
      snapshot.templatesByStatus[status] = result.value.total;
      snapshot.templatesTotal += result.value.total;
    } else if (result?.status === "rejected" && !templateFailureRecorded) {
      templateFailureRecorded = true;
      failures.push({ source: "templates", error: result.reason });
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

  if (templateCategories.ok) {
    snapshot.templateCategoriesTotal = templateCategories.value.length;
  } else {
    failures.push({ source: "templateCategories", error: templateCategories.error });
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
