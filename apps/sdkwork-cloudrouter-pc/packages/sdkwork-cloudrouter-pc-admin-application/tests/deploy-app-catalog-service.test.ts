import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The deploy loader must call the generated SDK with the filter's wire
 * parameter names (`app_kind`, `ownership_scope`, `owner_organization_id`) and
 * keep the response's ownership fields on the normalized row.
 */

const mocks = vi.hoisted(() => ({
  app: {
    list: vi.fn(),
  },
}));

vi.mock("@sdkwork/cloudroutes-pc-commons/runtime", () => ({
  getSdkworkAppstoreAppSdkClient: () => ({ library: { appstore: { library: { items: { list: vi.fn() } } } } }),
  getSdkworkDeploymentsAppSdkClient: () => ({ app: mocks.app }),
  resolveStoredPortalTenantId: () => "tenant-1",
}));

vi.mock("../src/services/iam-service", () => ({
  getApplicationCatalogIamService: () => ({ iam: { organizations: { list: vi.fn() } } }),
}));

const { loadDeployApplicationPage, loadDeployApplications } = await import("../src/services/application-catalog");

function deployRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    appKind: "H5_WEB",
    appStatus: "ACTIVE",
    defaultEnvironment: "production",
    id: "app-1",
    name: "Storefront",
    organizationId: "42",
    ownershipScope: "ORGANIZATION",
    slug: "storefront",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.app.list.mockResolvedValue({ items: [], pageInfo: { mode: "offset", page: 1, pageSize: 200 } });
});

describe("deploy application list query", () => {
  it("sends kind, ownership, and organization filters to the generated SDK", async () => {
    await loadDeployApplications(
      { tenantId: "tenant-1" },
      { deploy: { kindTab: "miniProgram", ownership: "ORGANIZATION", organizationId: "42" } },
    );

    expect(mocks.app.list).toHaveBeenCalledTimes(1);
    expect(mocks.app.list).toHaveBeenCalledWith(expect.objectContaining({
      appKind: ["WECHAT_MINIPROGRAM", "DOUYIN_MINIPROGRAM"],
      ownerOrganizationId: "42",
      ownershipScope: "ORGANIZATION",
      page: 1,
      pageSize: 200,
    }));
  });

  it("omits every filter parameter for the all choices", async () => {
    await loadDeployApplications({ tenantId: "tenant-1" });

    const params = mocks.app.list.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).not.toHaveProperty("appKind");
    expect(params).not.toHaveProperty("ownershipScope");
    expect(params).not.toHaveProperty("ownerOrganizationId");
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(200);
  });

  it("keeps the ownership scope and organization id from the response", async () => {
    mocks.app.list.mockResolvedValue({
      items: [
        deployRow(),
        deployRow({ id: "app-2", name: "Legacy", ownershipScope: "TENANT", organizationId: "0" }),
      ],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ tenantId: "tenant-1" });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      groupId: "deploy",
      id: "app-1",
      kind: "H5_WEB",
      organizationId: "42",
      ownershipScope: "ORGANIZATION",
    });
    expect(rows[1]).toMatchObject({
      id: "app-2",
      organizationId: "0",
      ownershipScope: "TENANT",
    });
  });

  it("keeps the snowflake application id as the exact decimal string", async () => {
    mocks.app.list.mockResolvedValue({
      items: [deployRow({ deployApplicationId: "9007199254740993" })],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ tenantId: "tenant-1" });

    // int64 ids stay decimal strings on the wire (`API_SPEC.md` §13.6); reading
    // this through `Number` would round it to 9007199254740992.
    expect(rows[0]?.deployApplicationId).toBe("9007199254740993");
  });

  it("drops a payload that names the application id in any non-decimal shape", async () => {
    mocks.app.list.mockResolvedValue({
      items: [deployRow({ deployApplicationId: 410000000000000001 })],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ tenantId: "tenant-1" });

    expect(rows[0]?.deployApplicationId).toBeUndefined();
  });

  it("accepts a host that already returns the decimal snowflake as the row id", async () => {
    mocks.app.list.mockResolvedValue({
      items: [deployRow({ id: "410000000000000001" })],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ tenantId: "tenant-1" });

    // A UUID `id` is never treated as an application id; only a decimal one is.
    expect(rows[0]?.deployApplicationId).toBe("410000000000000001");
  });

  it("derives a missing ownership scope from the legacy organization encoding", async () => {
    mocks.app.list.mockResolvedValue({
      items: [
        deployRow({ id: "app-org", ownershipScope: undefined, organizationId: "7" }),
        deployRow({ id: "app-tenant", ownershipScope: undefined, organizationId: "0" }),
        deployRow({ id: "app-user", ownershipScope: "USER", organizationId: "0", ownerUserId: "9" }),
      ],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ tenantId: "tenant-1" });

    expect(rows.map((row) => row.ownershipScope)).toEqual(["ORGANIZATION", "TENANT", "USER"]);
  });

  it("still narrows deploy rows to the organization of an organization page", async () => {
    mocks.app.list.mockResolvedValue({
      items: [
        deployRow({ id: "app-org", organizationId: "42" }),
        deployRow({ id: "app-other", organizationId: "43" }),
        deployRow({ id: "app-tenant", organizationId: "0", ownershipScope: "TENANT" }),
      ],
      pageInfo: { mode: "offset", page: 1, pageSize: 200 },
    });

    const rows = await loadDeployApplications({ organizationId: "42", tenantId: "tenant-1" });

    expect(rows.map((row) => row.id)).toEqual(["app-org"]);
    // The narrowing is a server facet too, so the window and the total describe
    // the same set as the rows on screen.
    expect(mocks.app.list).toHaveBeenCalledWith(expect.objectContaining({
      ownerOrganizationId: "42",
      ownershipScope: "ORGANIZATION",
    }));
  });
});

describe("deploy application list page window", () => {
  it("sends the page window and the trimmed keyword as server facets", async () => {
    mocks.app.list.mockResolvedValue({
      items: [deployRow()],
      pageInfo: { hasMore: true, mode: "offset", page: 2, pageSize: 20, totalItems: "45", totalPages: 3 },
    });

    const page = await loadDeployApplicationPage(
      { tenantId: "tenant-1" },
      { keyword: "  storefront ", page: 2, pageSize: 20 },
    );

    expect(mocks.app.list).toHaveBeenCalledWith(expect.objectContaining({
      keyword: "storefront",
      page: 2,
      pageSize: 20,
    }));
    // `totalItems` is an int64 decimal string on the wire; the page metadata is
    // a number the footer can print.
    expect(page.pageInfo).toEqual({
      hasMore: true,
      page: 2,
      pageSize: 20,
      totalItems: 45,
    });
    expect(page.items.map((row) => row.id)).toEqual(["app-1"]);
  });

  it("omits the keyword when the search box is empty", async () => {
    await loadDeployApplicationPage({ tenantId: "tenant-1" }, { keyword: "   ", page: 1, pageSize: 20 });

    const params = mocks.app.list.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).not.toHaveProperty("keyword");
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(20);
  });

  it("derives the next-page flag from the total when the backend omits hasMore", async () => {
    mocks.app.list.mockResolvedValue({
      items: [deployRow()],
      pageInfo: { mode: "offset", page: 1, pageSize: 20, totalItems: "1" },
    });

    const page = await loadDeployApplicationPage({ tenantId: "tenant-1" }, { pageSize: 20 });

    expect(page.pageInfo.totalItems).toBe(1);
    expect(page.pageInfo.hasMore).toBe(false);
  });
});
