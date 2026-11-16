import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppStoreCollectionServiceError,
  COLLECTION_CODE_PATTERN,
  createAppStoreCollectionService,
  isAppStoreCollectionForbidden,
  type AppStoreCollectionTransport,
} from "../src/services/appstore-collections";

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const updateItems = vi.fn();

const transport: AppStoreCollectionTransport = {
  catalog: {
    appstore: {
      catalog: {
        admin: { collections: { list } },
        collections: {
          create,
          update,
          items: { update: updateItems },
        },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App Store collection service", () => {
  it("maps the collection cursor page", async () => {
    list.mockResolvedValue({
      items: [
        {
          collection_id: "col-1",
          collection_code: "editors-picks",
          collection_type: "EDITORIAL",
          audience_scope: "PUBLIC",
          status: "ACTIVE",
          sort_order: 2,
          item_count: 8,
        },
      ],
      pageInfo: { mode: "cursor", hasMore: true, nextCursor: "next-1" },
    });

    const service = createAppStoreCollectionService(transport);
    const page = await service.list({ pageSize: 50 });

    expect(page.items).toEqual([{
      collectionId: "col-1",
      collectionCode: "editors-picks",
      collectionType: "EDITORIAL",
      audienceScope: "PUBLIC",
      status: "ACTIVE",
      sortOrder: 2,
      itemCount: 8,
    }]);
    expect(page.nextCursor).toBe("next-1");
  });

  it("creates a collection and returns its id", async () => {
    create.mockResolvedValue({ item: { collectionId: "col-1" } });

    const service = createAppStoreCollectionService(transport);
    const id = await service.create({
      collectionCode: "editors-picks",
      collectionType: "EDITORIAL",
      audienceScope: "PUBLIC",
    });

    expect(create).toHaveBeenCalledWith({
      collectionCode: "editors-picks",
      collectionType: "EDITORIAL",
      audienceScope: "PUBLIC",
    });
    expect(id).toBe("col-1");
  });

  it("validates the code and replaces items in order", async () => {
    create.mockResolvedValue({ item: { collectionId: "col-1" } });
    updateItems.mockResolvedValue({ item: { collectionId: "col-1" } });
    const service = createAppStoreCollectionService(transport);

    expect(COLLECTION_CODE_PATTERN.test("editors-picks_2026")).toBe(true);
    expect(COLLECTION_CODE_PATTERN.test("x")).toBe(false);
    await expect(service.create({ collectionCode: "!", collectionType: "EDITORIAL" }))
      .rejects.toBeInstanceOf(AppStoreCollectionServiceError);

    await service.replaceItems("col-1", [
      { listingId: "listing-1" },
      { listingId: "listing-2" },
    ]);
    expect(updateItems).toHaveBeenCalledWith("col-1", {
      items: [
        { listingId: "listing-1", sortOrder: 0 },
        { listingId: "listing-2", sortOrder: 1 },
      ],
    });
  });

  it("updates status/sort and normalizes forbidden failures", async () => {
    update.mockRejectedValueOnce({ status: 403, detail: "no permission" });
    const service = createAppStoreCollectionService(transport);

    const forbidden = await service.update("col-1", { collectionStatus: "ACTIVE" })
      .catch((error: unknown) => error);
    expect(isAppStoreCollectionForbidden(forbidden)).toBe(true);

    update.mockResolvedValue({ item: { collectionId: "col-1" } });
    await service.update("col-1", { collectionStatus: "ARCHIVED", sortOrder: 5 });
    expect(update).toHaveBeenLastCalledWith("col-1", {
      collectionStatus: "ARCHIVED",
      sortOrder: 5,
    });
  });
});
