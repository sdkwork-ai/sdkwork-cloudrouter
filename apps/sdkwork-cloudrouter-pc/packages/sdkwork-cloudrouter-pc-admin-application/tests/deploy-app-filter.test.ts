import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEPLOY_APP_LIST_FILTER,
  DEPLOY_APP_KIND_TABS,
  DEPLOY_FILTER_PARAMS,
  DEPLOY_OWNERSHIP_FILTERS,
  deployAppKindMessageKey,
  deployAppKindTab,
  deployOwnershipMessageKey,
  hasActiveDeployAppListFilter,
  isDeployAppListQueryInvalid,
  isValidDeployOrganizationId,
  normalizeDeployOrganizationId,
  parseDeployAppListFilter,
  resolveDeployAppPagination,
  toDeployAppListQuery,
  writeDeployAppListFilter,
} from "../src/services/deploy-application-filter";
import {
  DEPLOY_APP_KINDS,
  type DeployAppKind,
} from "../src/types/application-catalog";

/**
 * Deploy list filter contract: every UI choice must map to exactly one wire
 * query, and the URL must round-trip the same choice.
 */
describe("deploy application kind tabs", () => {
  it("covers every deploy app kind in exactly one tab", () => {
    const covered = DEPLOY_APP_KIND_TABS.flatMap((tab) => tab.appKinds);
    expect([...covered].sort()).toEqual([...DEPLOY_APP_KINDS].sort());
    expect(new Set(covered).size).toBe(covered.length);
  });

  it("keeps the mini program tab on both providers and the legacy kinds together", () => {
    expect(DEPLOY_APP_KIND_TABS.find((tab) => tab.id === "miniProgram")?.appKinds)
      .toEqual(["WECHAT_MINIPROGRAM", "DOUYIN_MINIPROGRAM"]);
    expect(DEPLOY_APP_KIND_TABS.find((tab) => tab.id === "legacyWeb")?.appKinds)
      .toEqual(["STATIC_WEB", "SPA_WEB"]);
  });

  it("maps every tab to its app_kind values and omits app_kind for all", () => {
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "all" })).toEqual({});
    for (const tab of DEPLOY_APP_KIND_TABS) {
      const query = toDeployAppListQuery({ kindTab: tab.id, ownership: "all" });
      if (tab.id === "all") {
        expect(query).toEqual({});
      } else {
        expect(query).toEqual({ appKind: [...tab.appKinds] });
      }
    }
    expect(toDeployAppListQuery({ kindTab: "h5", ownership: "all" }))
      .toEqual({ appKind: ["H5_WEB"] });
    expect(toDeployAppListQuery({ kindTab: "desktop", ownership: "all" }))
      .toEqual({ appKind: ["DESKTOP_APP"] });
  });

  it("resolves the owning tab and label key of a row kind", () => {
    const kinds: DeployAppKind[] = [...DEPLOY_APP_KINDS];
    for (const kind of kinds) {
      const tab = deployAppKindTab(kind);
      expect(tab).not.toBe("all");
      expect(DEPLOY_APP_KIND_TABS.find((candidate) => candidate.id === tab)?.appKinds)
        .toContain(kind);
      expect(deployAppKindMessageKey(kind)).toBe(tab);
    }
    expect(deployAppKindTab("UNKNOWN_KIND")).toBe("all");
    expect(deployAppKindMessageKey(undefined)).toBeUndefined();
  });
});

describe("deploy ownership filter", () => {
  it("offers exactly the three tenant-visible levels plus all", () => {
    expect(DEPLOY_OWNERSHIP_FILTERS.map((filter) => filter.id))
      .toEqual(["all", "TENANT", "ORGANIZATION", "USER"]);
    expect(DEPLOY_OWNERSHIP_FILTERS.map((filter) => filter.messageKey))
      .toEqual(["all", "tenant", "organization", "user"]);
  });

  it("maps ownership to ownership_scope and omits the all choice", () => {
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "all" })).toEqual({});
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "TENANT" }))
      .toEqual({ ownershipScope: "TENANT" });
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "USER" }))
      .toEqual({ ownershipScope: "USER" });
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "ORGANIZATION" }))
      .toEqual({ ownershipScope: "ORGANIZATION" });
  });

  it("sends owner_organization_id only for a valid organization scope", () => {
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "ORGANIZATION", organizationId: "42" }))
      .toEqual({ ownershipScope: "ORGANIZATION", ownerOrganizationId: "42" });
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "ORGANIZATION", organizationId: " 42 " }))
      .toEqual({ ownershipScope: "ORGANIZATION", ownerOrganizationId: "42" });
    // `0` is the tenant encoding, not an organization.
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "ORGANIZATION", organizationId: "0" }))
      .toEqual({ ownershipScope: "ORGANIZATION" });
    // A malformed id never widens another scope with a stray parameter.
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "TENANT", organizationId: "42" }))
      .toEqual({ ownershipScope: "TENANT" });
    expect(toDeployAppListQuery({ kindTab: "all", ownership: "ORGANIZATION", organizationId: "abc" }))
      .toEqual({ ownershipScope: "ORGANIZATION" });
  });

  it("validates organization ids as positive decimals", () => {
    expect(isValidDeployOrganizationId("1")).toBe(true);
    expect(isValidDeployOrganizationId("42")).toBe(true);
    expect(isValidDeployOrganizationId("0")).toBe(false);
    expect(isValidDeployOrganizationId("-1")).toBe(false);
    expect(isValidDeployOrganizationId("1.5")).toBe(false);
    expect(isValidDeployOrganizationId("abc")).toBe(false);
    expect(isValidDeployOrganizationId("")).toBe(false);
    expect(normalizeDeployOrganizationId(" 42 ")).toBe("42");
    expect(normalizeDeployOrganizationId("0")).toBeUndefined();
  });
});

describe("deploy filter URL codec", () => {
  it("round-trips kind, ownership, and organization through the query", () => {
    const written = writeDeployAppListFilter(
      new URLSearchParams("tab=keep"),
      { kindTab: "ios", ownership: "ORGANIZATION", organizationId: "7" },
    );

    expect(written.get("tab")).toBe("keep");
    expect(written.get(DEPLOY_FILTER_PARAMS.kind)).toBe("ios");
    expect(written.get(DEPLOY_FILTER_PARAMS.ownership)).toBe("ORGANIZATION");
    expect(written.get(DEPLOY_FILTER_PARAMS.organization)).toBe("7");
    expect(parseDeployAppListFilter(written)).toEqual({
      kindTab: "ios",
      ownership: "ORGANIZATION",
      organizationId: "7",
    });
  });

  it("removes default parameters so a cleared list has a clean URL", () => {
    const written = writeDeployAppListFilter(
      new URLSearchParams("kind=ios&scope=USER&org=7&tab=keep"),
      DEFAULT_DEPLOY_APP_LIST_FILTER,
    );
    expect(written.get("kind")).toBeNull();
    expect(written.get("scope")).toBeNull();
    expect(written.get("org")).toBeNull();
    expect(written.get("tab")).toBe("keep");
    expect(parseDeployAppListFilter(written)).toEqual(DEFAULT_DEPLOY_APP_LIST_FILTER);
  });

  it("drops the organization parameter unless the scope is ORGANIZATION", () => {
    const written = writeDeployAppListFilter(new URLSearchParams(), {
      kindTab: "all",
      ownership: "TENANT",
      organizationId: "7",
    });
    expect(written.get(DEPLOY_FILTER_PARAMS.organization)).toBeNull();
    expect(parseDeployAppListFilter(written)).toEqual({ kindTab: "all", ownership: "TENANT" });
  });

  it("degrades unknown or malformed values to the all default instead of throwing", () => {
    expect(parseDeployAppListFilter("kind=retired&scope=NOPE&org=abc")).toEqual({
      kindTab: "all",
      ownership: "all",
    });
    expect(parseDeployAppListFilter("scope=ORGANIZATION&org=0")).toEqual({
      kindTab: "all",
      ownership: "ORGANIZATION",
    });
    expect(parseDeployAppListFilter("scope=USER&org=7")).toEqual({
      kindTab: "all",
      ownership: "USER",
    });
  });

  it("reports whether a filter narrows the server query", () => {
    expect(hasActiveDeployAppListFilter(DEFAULT_DEPLOY_APP_LIST_FILTER)).toBe(false);
    expect(hasActiveDeployAppListFilter({ kindTab: "pc", ownership: "all" })).toBe(true);
    expect(hasActiveDeployAppListFilter({ kindTab: "all", ownership: "USER" })).toBe(true);
    expect(hasActiveDeployAppListFilter({
      kindTab: "all",
      ownership: "ORGANIZATION",
      organizationId: "7",
    })).toBe(true);
    expect(hasActiveDeployAppListFilter({
      kindTab: "all",
      ownership: "ORGANIZATION",
      organizationId: "0",
    })).toBe(true);
    expect(hasActiveDeployAppListFilter({
      kindTab: "all",
      ownership: "all",
      organizationId: "42",
    })).toBe(false);
  });
});

describe("deploy filter error classification", () => {
  it("recognizes a rejected query by status and leaves outages generic", () => {
    expect(isDeployAppListQueryInvalid(Object.assign(new Error("bad request"), { status: 400 }))).toBe(true);
    expect(isDeployAppListQueryInvalid(Object.assign(new Error("invalid"), { status: 422 }))).toBe(true);
    expect(isDeployAppListQueryInvalid(Object.assign(new Error("boom"), { status: 500 }))).toBe(false);
    expect(isDeployAppListQueryInvalid(Object.assign(new Error("forbidden"), { status: 403 }))).toBe(false);
    expect(isDeployAppListQueryInvalid(undefined)).toBe(false);
  });

  it("maps every wire ownership scope to its label key", () => {
    expect(deployOwnershipMessageKey("PLATFORM")).toBe("platform");
    expect(deployOwnershipMessageKey("TENANT")).toBe("tenant");
    expect(deployOwnershipMessageKey("ORGANIZATION")).toBe("organization");
    expect(deployOwnershipMessageKey("USER")).toBe("user");
    expect(deployOwnershipMessageKey("nope")).toBeUndefined();
  });
});

describe("deploy list footer pagination", () => {
  it("reads the total, the page count, and the next-page flag from server metadata", () => {
    expect(resolveDeployAppPagination({
      itemCount: 20,
      page: 1,
      pageInfo: { hasMore: true, page: 1, pageSize: 20, totalItems: 45 },
      pageSize: 20,
    })).toEqual({
      hasNextPage: true,
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
    });
  });

  it("keeps the last page open when the server reports no further page", () => {
    expect(resolveDeployAppPagination({
      itemCount: 5,
      page: 3,
      pageInfo: { hasMore: false, page: 3, pageSize: 20, totalItems: 45 },
      pageSize: 20,
    })).toMatchObject({ hasNextPage: false, page: 3, totalItems: 45, totalPages: 3 });
  });

  it("clamps a page that the total no longer has back onto the last page", () => {
    // The last row of the last page was deleted: the operator must not be left
    // staring at an empty window three pages deep.
    expect(resolveDeployAppPagination({
      itemCount: 0,
      page: 4,
      pageInfo: { hasMore: false, page: 4, pageSize: 20, totalItems: 45 },
      pageSize: 20,
    })).toMatchObject({ hasNextPage: false, page: 3, totalPages: 3 });
  });

  it("falls back to the page size when the backend reports no total", () => {
    expect(resolveDeployAppPagination({ itemCount: 2, page: 1, pageSize: 20 })).toEqual({
      hasNextPage: false,
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
    });
    expect(resolveDeployAppPagination({ itemCount: 20, page: 2, pageSize: 20 })).toMatchObject({
      hasNextPage: false,
      page: 2,
      totalItems: 40,
      totalPages: 2,
    });
  });

  it("keeps an empty list on a single page", () => {
    expect(resolveDeployAppPagination({
      itemCount: 0,
      page: 1,
      pageInfo: { hasMore: false, page: 1, pageSize: 20, totalItems: 0 },
      pageSize: 20,
    })).toEqual({ hasNextPage: false, page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  });
});
