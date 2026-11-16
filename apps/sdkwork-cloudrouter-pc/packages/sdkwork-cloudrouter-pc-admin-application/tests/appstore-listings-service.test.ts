import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppStoreListingServiceError,
  createAppStoreListingService,
  isAppStoreListingForbidden,
  type AppStoreListingTransport,
} from "../src/services/appstore-listings";

const list = vi.fn();
const updateVisibility = vi.fn();
const retrieve = vi.fn();

const transport: AppStoreListingTransport = {
  listings: {
    appstore: {
      listings: {
        admin: {
          list,
          retrieve,
          visibility: { update: updateVisibility },
        },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App Store listing service", () => {
  it("maps the listing cursor page", async () => {
    list.mockResolvedValue({
      items: [
        {
          listing_id: "listing-1",
          listing_code: "acme-notes",
          display_name: "Acme Notes",
          publisher_id: "pub-1",
          publisher_name: "Acme Studio",
          listing_status: "published",
          storefront_visibility: "visible",
          category_code: "productivity",
          platform: "PC",
          latest_release_version: "1.2.0",
          updated_at: "2026-11-10T00:00:00Z",
        },
      ],
      pageInfo: { mode: "cursor", hasMore: true, nextCursor: "next-1" },
    });

    const service = createAppStoreListingService(transport);
    const page = await service.list({ pageSize: 50 });

    expect(page.items).toEqual([{
      listingId: "listing-1",
      listingCode: "acme-notes",
      displayName: "Acme Notes",
      publisherId: "pub-1",
      publisherName: "Acme Studio",
      listingStatus: "PUBLISHED",
      storefrontVisibility: "VISIBLE",
      categoryCode: "productivity",
      platform: "PC",
      latestReleaseVersion: "1.2.0",
      updatedAt: "2026-11-10T00:00:00Z",
    }]);
    expect(page.nextCursor).toBe("next-1");
  });

  it("updates storefront visibility with an audit reason", async () => {
    updateVisibility.mockResolvedValue({ item: { listingId: "listing-1" } });

    const service = createAppStoreListingService(transport);
    await service.updateVisibility("listing-1", {
      storefrontVisibility: "DELISTED",
      reason: "policy violation",
    });

    expect(updateVisibility).toHaveBeenCalledWith("listing-1", {
      storefrontVisibility: "DELISTED",
      reason: "policy violation",
    });
  });

  it("rejects unsupported visibility states before calling the API", async () => {
    const service = createAppStoreListingService(transport);
    await expect(service.updateVisibility("listing-1", {
      // @ts-expect-error the runtime guard also rejects unknown wire states
      storefrontVisibility: "SOMEWHERE",
    })).rejects.toBeInstanceOf(AppStoreListingServiceError);
    expect(updateVisibility).not.toHaveBeenCalled();
  });

  it("normalizes forbidden failures", async () => {
    list.mockRejectedValue({ status: 403, detail: "no permission" });
    const service = createAppStoreListingService(transport);
    const error = await service.list().catch((nextError: unknown) => nextError);

    expect(isAppStoreListingForbidden(error)).toBe(true);
  });

  it("loads listing detail with raw fields", async () => {
    retrieve.mockResolvedValue({
      item: {
        listingId: "listing-1",
        displayName: "Acme Notes",
        listingStatus: "PUBLISHED",
        storefrontVisibility: "VISIBLE",
        reviewNotes: "approved by ops",
      },
    });
    const service = createAppStoreListingService(transport);
    const detail = await service.getListing?.("listing-1");

    expect(retrieve).toHaveBeenCalledWith("listing-1");
    expect(detail).toEqual(expect.objectContaining({
      listingId: "listing-1",
      displayName: "Acme Notes",
      listingStatus: "PUBLISHED",
    }));
    expect(detail?.attributes).toEqual(expect.objectContaining({ reviewNotes: "approved by ops" }));
  });
});
