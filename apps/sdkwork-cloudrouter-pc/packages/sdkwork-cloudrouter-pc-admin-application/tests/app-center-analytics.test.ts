import { describe, expect, it, vi } from "vitest";

import {
  loadAppCenterAnalytics,
  type AppCenterAnalyticsDependencies,
} from "../src/services/app-center-analytics";

function createDeps(): AppCenterAnalyticsDependencies {
  const totals: Record<string, number> = {
    DRAFT: 2,
    PENDING_REVIEW: 4,
    PUBLISHED: 10,
    REJECTED: 1,
    DISABLED: 3,
  };
  return {
    templates: {
      list: vi.fn(async (query?: { status?: string }) => ({
        items: [],
        page: 1,
        pageSize: 1,
        total: query?.status ? totals[query.status] ?? 0 : 0,
        hasMore: false,
      })),
    } as unknown as AppCenterAnalyticsDependencies["templates"],
    templateAdmin: {
      listCategories: vi.fn(async () => [
        { id: "cat-1", categoryKey: "a", displayName: "A", sortOrder: 0, status: "ACTIVE" },
      ]),
    } as unknown as AppCenterAnalyticsDependencies["templateAdmin"],
    moderation: {
      listQueue: vi.fn(async () => ({ items: [], hasMore: false, total: 3 })),
    } as unknown as AppCenterAnalyticsDependencies["moderation"],
    publishers: {
      list: vi.fn(async () => ({ items: [], hasMore: false, total: 10 })),
    } as unknown as AppCenterAnalyticsDependencies["publishers"],
    listings: {
      list: vi.fn(async () => ({ items: [], hasMore: false, total: 20 })),
    } as unknown as AppCenterAnalyticsDependencies["listings"],
    collections: {
      list: vi.fn(async () => ({ items: [], hasMore: false, total: 2 })),
    } as unknown as AppCenterAnalyticsDependencies["collections"],
  };
}

describe("App Center analytics", () => {
  it("aggregates exact status totals and content counts", async () => {
    const result = await loadAppCenterAnalytics(createDeps());

    expect(result.failures).toEqual([]);
    expect(result.snapshot.templatesByStatus).toEqual({
      DRAFT: 2,
      PENDING_REVIEW: 4,
      PUBLISHED: 10,
      REJECTED: 1,
      DISABLED: 3,
    });
    expect(result.snapshot.templatesTotal).toBe(20);
    expect(result.snapshot.moderationPending).toBe(3);
    expect(result.snapshot.publishersTotal).toBe(10);
    expect(result.snapshot.listingsTotal).toBe(20);
    expect(result.snapshot.collectionsTotal).toBe(2);
    expect(result.snapshot.templateCategoriesTotal).toBe(1);
  });

  it("degrades one failing source without blanking the snapshot", async () => {
    const deps = createDeps();
    deps.moderation.listQueue = vi.fn(async () => {
      throw new Error("moderation unavailable");
    });

    const result = await loadAppCenterAnalytics(deps);
    expect(result.snapshot.templatesTotal).toBe(20);
    expect(result.snapshot.publishersTotal).toBe(10);
    expect(result.failures.map((failure) => failure.source)).toEqual(["moderation"]);
  });
});
