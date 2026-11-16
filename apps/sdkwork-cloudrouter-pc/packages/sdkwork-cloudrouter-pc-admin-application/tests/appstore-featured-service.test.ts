import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppStoreFeaturedSlotServiceError,
  createAppStoreFeaturedSlotService,
  isAppStoreFeaturedSlotForbidden,
  normalizeInstant,
  type AppStoreFeaturedSlotTransport,
} from "../src/services/appstore-featured";

const list = vi.fn();
const update = vi.fn();

const transport: AppStoreFeaturedSlotTransport = {
  catalog: {
    appstore: {
      catalog: {
        admin: { featured: { list } },
        featured: { update },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App Store featured slot service", () => {
  it("maps featured slots", async () => {
    list.mockResolvedValue({
      items: [
        {
          slot_code: "HOME_HERO",
          listing_id: "listing-1",
          status: "ACTIVE",
          audience_scope: "TENANT",
          platform_scope: "PC",
          starts_at: "2026-11-01T00:00:00Z",
          ends_at: "2026-12-01T00:00:00Z",
        },
      ],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, hasMore: false },
    });

    const service = createAppStoreFeaturedSlotService(transport);
    const page = await service.list();

    expect(page.items).toEqual([{
      slotCode: "HOME_HERO",
      listingId: "listing-1",
      status: "ACTIVE",
      audienceScope: "TENANT",
      platformScope: "PC",
      startsAt: "2026-11-01T00:00:00Z",
      endsAt: "2026-12-01T00:00:00Z",
    }]);
    expect(page.hasMore).toBe(false);
  });

  it("upserts a slot with normalized instants", async () => {
    update.mockResolvedValue({ item: { slotCode: "HOME_HERO" } });

    const service = createAppStoreFeaturedSlotService(transport);
    await service.update("HOME_HERO", {
      listingId: "listing-1",
      startsAt: "2026-11-01T08:00",
      endsAt: "2026-12-01T08:00",
      slotStatus: "SCHEDULED",
    });

    expect(update).toHaveBeenCalledWith("HOME_HERO", {
      listingId: "listing-1",
      startsAt: new Date("2026-11-01T08:00").toISOString(),
      endsAt: new Date("2026-12-01T08:00").toISOString(),
      slotStatus: "SCHEDULED",
    });
  });

  it("rejects an inverted window", async () => {
    const service = createAppStoreFeaturedSlotService(transport);
    await expect(service.update("HOME_HERO", {
      listingId: "listing-1",
      startsAt: "2026-12-01T00:00:00Z",
      endsAt: "2026-11-01T00:00:00Z",
    })).rejects.toBeInstanceOf(AppStoreFeaturedSlotServiceError);
    expect(update).not.toHaveBeenCalled();
  });

  it("normalizes forbidden failures and instants", async () => {
    list.mockRejectedValue({ status: 403, detail: "no permission" });
    const service = createAppStoreFeaturedSlotService(transport);
    const error = await service.list().catch((nextError: unknown) => nextError);

    expect(isAppStoreFeaturedSlotForbidden(error)).toBe(true);
    expect(normalizeInstant("not-a-date")).toBeUndefined();
    expect(normalizeInstant("2026-11-01T00:00:00Z")).toBe("2026-11-01T00:00:00.000Z");
  });
});
