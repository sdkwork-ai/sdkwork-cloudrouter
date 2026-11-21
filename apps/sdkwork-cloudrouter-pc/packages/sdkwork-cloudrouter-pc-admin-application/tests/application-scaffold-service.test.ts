import { describe, expect, it } from "vitest";

import {
  createApplicationScaffoldService,
  ApplicationScaffoldServiceError,
  isApplicationScaffoldConflict,
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
  mapScaffoldPage,
  mapScaffoldVersion,
  type ApplicationScaffoldTransport,
} from "../src/services/application-scaffolds";

type ScaffoldOverrides = Partial<NonNullable<ApplicationScaffoldTransport["app"]["scaffolds"]>>;

function scaffoldRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "scaffold-1",
    templateKey: "demo-scaffold",
    templateType: "APP",
    displayName: "Demo scaffold",
    summary: "One line",
    description: "Long form",
    appUuid: "app-1",
    categoryUuid: "cat-1",
    authorUserId: "user-1",
    visibility: "PUBLIC",
    pricingModel: "FREE",
    priceMinor: "0",
    currency: "CNY",
    status: "PUBLISHED",
    isFeatured: false,
    installCount: "12",
    viewCount: "34",
    version: "1.2.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function createTransport(overrides: ScaffoldOverrides = {}): {
  transport: ApplicationScaffoldTransport;
  calls: Array<{ operation: string; args: readonly unknown[] }>;
} {
  const calls: Array<{ operation: string; args: readonly unknown[] }> = [];
  const transport: ApplicationScaffoldTransport = {
    app: {
      list: async () => {
        calls.push({ operation: "app.list", args: [] });
        return { items: [{ id: "app-1", name: "Demo app" }], pageInfo: {} };
      },
      scaffolds: {
        list: async (params) => {
          calls.push({ operation: "scaffolds.list", args: [params] });
          return {
            items: [scaffoldRecord()],
            pageInfo: { totalItems: 1, hasMore: false, page: 1, pageSize: 20 },
          };
        },
        retrieve: async () => scaffoldRecord(),
        create: async (body, params) => {
          calls.push({ operation: "scaffolds.create", args: [body, params] });
          return scaffoldRecord();
        },
        update: async (id, body, params) => {
          calls.push({ operation: "scaffolds.update", args: [id, body, params] });
          return scaffoldRecord({ id });
        },
        delete: async (id) => {
          calls.push({ operation: "scaffolds.delete", args: [id] });
        },
        submit: async (id) => {
          calls.push({ operation: "scaffolds.submit", args: [id] });
          return scaffoldRecord({ id, status: "PENDING_REVIEW" });
        },
        categories: {
          list: async () => ({
            items: [{ id: "cat-1", categoryKey: "demo", displayName: "Demo", status: "ACTIVE" }],
          }),
        },
        versions: {
          list: async (id) => {
            calls.push({ operation: "scaffolds.versions.list", args: [id] });
            return { items: [{ id: "ver-1", scaffoldUuid: id, templateVersion: "1.2.0", status: "PUBLISHED" }] };
          },
          create: async (id, body, params) => {
            calls.push({ operation: "scaffolds.versions.create", args: [id, body, params] });
            return { id: "ver-2", scaffoldUuid: id, templateVersion: "1.3.0", status: "DRAFT" };
          },
        },
        ...overrides,
      },
      marketplace: {
        scaffolds: {
          install: async (id, body, params) => {
            calls.push({ operation: "marketplace.scaffolds.install", args: [id, body, params] });
            return {
              app: {
                id: "app-installed",
                name: "Installed app",
                deployApplicationId: "410000000000000001",
              },
              scaffoldUuid: id,
            };
          },
        },
      },
    },
  };
  return { transport, calls };
}

describe("application scaffold service", () => {
  it("maps the list page and maps database-aligned wire fields", async () => {
    const { transport } = createTransport();
    const service = createApplicationScaffoldService(transport);
    const page = await service.list({ page: 2, pageSize: 20, keyword: "demo" });

    expect(page.items[0]?.displayName).toBe("Demo scaffold");
    expect(page.items[0]?.scaffoldKey).toBe("demo-scaffold");
    expect(page.items[0]?.scaffoldType).toBe("APP");
    expect(page.items[0]?.status).toBe("PUBLISHED");
    expect(page.total).toBe(1);
    expect(page.hasMore).toBe(false);
  });

  it("maps apps and categories", async () => {
    const { transport } = createTransport();
    const service = createApplicationScaffoldService(transport);

    await expect(service.listApps()).resolves.toEqual([{ id: "app-1", name: "Demo app" }]);
    const categories = await service.listCategories();
    expect(categories).toEqual([
      { id: "cat-1", categoryKey: "demo", displayName: "Demo", status: "ACTIVE" },
    ]);
  });

  it("creates and updates scaffolds with idempotency keys", async () => {
    const { transport, calls } = createTransport();
    const service = createApplicationScaffoldService(transport);

    const created = await service.create({
      appUuid: "app-1",
      categoryUuid: "cat-1",
      scaffoldKey: "demo-scaffold",
      displayName: "Demo",
      summary: "One line",
      pricingModel: "PAID",
      priceMinor: "9900",
      currency: "cny",
    });
    const createCall = calls.find((call) => call.operation === "scaffolds.create");
    expect(created.id).toBe("scaffold-1");
    expect(createCall?.args[0]).toMatchObject({
      appUuid: "app-1",
      templateKey: "demo-scaffold",
      pricingModel: "PAID",
      priceMinor: "9900",
      currency: "CNY",
    });
    expect((createCall?.args[1] as { idempotencyKey: string }).idempotencyKey).toBeTruthy();

    const updated = await service.update("scaffold-1", {
      displayName: "Renamed",
      priceMinor: "",
      currency: "",
    });
    const updateCall = calls.find((call) => call.operation === "scaffolds.update");
    expect(updated.id).toBe("scaffold-1");
    expect(updateCall?.args[1]).toMatchObject({ displayName: "Renamed" });
    expect((updateCall?.args[1] as Record<string, unknown>).priceMinor).toBeUndefined();
  });

  it("removes, submits, and manages versions", async () => {
    const { transport, calls } = createTransport();
    const service = createApplicationScaffoldService(transport);

    await service.remove("scaffold-1");
    const submitted = await service.submit("scaffold-1");
    expect(submitted.status).toBe("PENDING_REVIEW");
    const versions = await service.listVersions("scaffold-1");
    expect(versions[0]?.version).toBe("1.2.0");
    const created = await service.createVersion("scaffold-1", { version: "1.3.0", changelog: "Fixes" });
    expect(created.version).toBe("1.3.0");
    expect(calls.map((call) => call.operation)).toEqual(
      expect.arrayContaining([
        "scaffolds.delete",
        "scaffolds.submit",
        "scaffolds.versions.list",
        "scaffolds.versions.create",
      ]),
    );
  });

  it("normalizes permission, availability, and conflict failures", async () => {
    const { transport } = createTransport({
      list: async () => Promise.reject(Object.assign(new Error("forbidden"), { status: 403 })),
    });
    const service = createApplicationScaffoldService(transport);

    const failure = await service.list().catch((error: unknown) => error);
    expect(isApplicationScaffoldForbidden(failure)).toBe(true);
    const error = new ApplicationScaffoldServiceError("conflict", "duplicate", 409);
    expect(isApplicationScaffoldConflict(error)).toBe(true);
    expect(isApplicationScaffoldUnavailable(new ApplicationScaffoldServiceError("unavailable", "x", 404))).toBe(true);
  });

  it("installs a scaffold through the marketplace command and returns the app", async () => {
    const { transport, calls } = createTransport();
    const service = createApplicationScaffoldService(transport);
    const result = await service.install("scaffold-1", { name: " My copy ", slug: " my-copy " });

    expect(result).toEqual({
      appId: "app-installed",
      appName: "Installed app",
      deployApplicationId: "410000000000000001",
      scaffoldUuid: "scaffold-1",
    });
    expect(calls.find((call) => call.operation === "marketplace.scaffolds.install")?.args[1])
      .toMatchObject({ name: "My copy", slug: "my-copy" });
  });

  it("maps an empty page safely", () => {
    const page = mapScaffoldPage({ items: [], pageInfo: {} });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("renders the semantic scaffold version, not the record lock revision", () => {
    expect(mapScaffoldVersion({ id: "ver-1", templateVersion: "2.1.0", version: "7" })?.version).toBe("2.1.0");
    expect(mapScaffoldVersion({ id: "ver-2", version: "1.0.0" })?.version).toBe("1.0.0");
    expect(mapScaffoldVersion({})).toBeUndefined();
  });
});
