import {
  DEPLOY_APP_KINDS,
  DEPLOY_OWNERSHIP_SCOPES,
  type DeployAppKind,
  type DeployAppKindTabId,
  type DeployAppListFilter,
  type DeployAppListQuery,
  type DeployKindMessageKey,
  type DeployOwnershipFilterId,
  type DeployOwnershipMessageKey,
  type DeployOwnershipScope,
} from "../types/application-catalog";

/**
 * Deploy application list filter: kind tabs, ownership scope, and URL state.
 *
 * The deploy app list is filtered by the server (`GET /app/v3/api/apps`), so a
 * filter change must become a query change rather than a local array filter.
 * This module owns the one mapping table from UI tabs to the wire's multi-value
 * `app_kind`, the ownership mapping to `ownership_scope` /
 * `owner_organization_id`, and the URL codec that keeps a filtered list
 * refreshable and shareable. It is pure so the page can stay a rendering
 * surface and the mapping is unit-testable without React.
 */

/** One deploy kind tab and the app kinds it selects. */
export interface DeployAppKindTabDefinition {
  id: DeployAppKindTabId;
  /** Empty for the "all" tab, which sends no `app_kind` at all. */
  appKinds: readonly DeployAppKind[];
}

/**
 * Kind tabs in product order.
 *
 * Every `AppKind` value belongs to exactly one tab: the mini program tab covers
 * both providers, and the two legacy rendering-model kinds get their own tab so
 * an old app can still be reached instead of silently disappearing.
 */
export const DEPLOY_APP_KIND_TABS: readonly DeployAppKindTabDefinition[] = [
  { appKinds: [], id: "all" },
  { appKinds: ["H5_WEB"], id: "h5" },
  { appKinds: ["PC_WEB"], id: "pc" },
  { appKinds: ["WECHAT_MINIPROGRAM", "DOUYIN_MINIPROGRAM"], id: "miniProgram" },
  { appKinds: ["FLUTTER_APP"], id: "flutter" },
  { appKinds: ["IOS_APP"], id: "ios" },
  { appKinds: ["ANDROID_APP"], id: "android" },
  { appKinds: ["HARMONYOS_APP"], id: "harmonyos" },
  { appKinds: ["DESKTOP_APP"], id: "desktop" },
  { appKinds: ["API_SERVICE"], id: "api" },
  { appKinds: ["STATIC_WEB", "SPA_WEB"], id: "legacyWeb" },
];

/** One ownership filter choice; `all` omits `ownership_scope`. */
export interface DeployOwnershipFilterDefinition {
  id: DeployOwnershipFilterId;
  messageKey: DeployOwnershipMessageKey;
}

/**
 * Ownership filters in product order.
 *
 * `PLATFORM` is intentionally not offered: platform-operated apps are reviewed
 * through the unfiltered list, while the three tenant-visible levels are what
 * an operator switches between.
 */
export const DEPLOY_OWNERSHIP_FILTERS: readonly DeployOwnershipFilterDefinition[] = [
  { id: "all", messageKey: "all" },
  { id: "TENANT", messageKey: "tenant" },
  { id: "ORGANIZATION", messageKey: "organization" },
  { id: "USER", messageKey: "user" },
];

/** The filter used when the URL carries no (valid) deploy filter. */
export const DEFAULT_DEPLOY_APP_LIST_FILTER: DeployAppListFilter = {
  kindTab: "all",
  ownership: "all",
};

/** Query parameter names. Short, stable, and shareable. */
export const DEPLOY_FILTER_PARAMS = {
  kind: "kind",
  organization: "org",
  ownership: "scope",
} as const;

/** Maps an app kind to the kind label key shared by tabs and row badges. */
export const DEPLOY_APP_KIND_MESSAGE_KEYS: Record<DeployAppKind, DeployKindMessageKey> = {
  ANDROID_APP: "android",
  API_SERVICE: "api",
  DESKTOP_APP: "desktop",
  DOUYIN_MINIPROGRAM: "miniProgram",
  FLUTTER_APP: "flutter",
  HARMONYOS_APP: "harmonyos",
  H5_WEB: "h5",
  IOS_APP: "ios",
  PC_WEB: "pc",
  SPA_WEB: "legacyWeb",
  STATIC_WEB: "legacyWeb",
  WECHAT_MINIPROGRAM: "miniProgram",
};

/**
 * Resolve the kind tab that owns an app kind.
 *
 * Used by tests and by callers that need to reflect a row back onto the tab
 * strip; an unknown kind falls back to "all" so a newer backend enum never
 * breaks the page.
 */
export function deployAppKindTab(kind: string | undefined): DeployAppKindTabId {
  if (!kind) {
    return "all";
  }
  const tab = DEPLOY_APP_KIND_TABS.find((candidate) => candidate.appKinds.includes(kind as DeployAppKind));
  return tab?.id ?? "all";
}

/** The localized label key of one app kind, when the kind is known. */
export function deployAppKindMessageKey(
  kind: string | undefined,
): DeployKindMessageKey | undefined {
  return DEPLOY_APP_KINDS.includes(kind as DeployAppKind)
    ? DEPLOY_APP_KIND_MESSAGE_KEYS[kind as DeployAppKind]
    : undefined;
}

/** The localized label key of one ownership scope. */
export function deployOwnershipMessageKey(
  scope: string | undefined,
): DeployOwnershipMessageKey | undefined {
  switch (scope) {
    case "PLATFORM":
      return "platform";
    case "TENANT":
      return "tenant";
    case "ORGANIZATION":
      return "organization";
    case "USER":
      return "user";
    default:
      return undefined;
  }
}

/** `true` when the value is a positive decimal organization id. */
export function isValidDeployOrganizationId(value: string | undefined): boolean {
  return typeof value === "string" && /^[1-9][0-9]*$/u.test(value.trim());
}

/**
 * Normalize a free-text organization id.
 *
 * Trims and rejects everything that is not a positive decimal: `0` is the
 * tenant encoding, and the deploy API expects int64 on the wire (a string).
 */
export function normalizeDeployOrganizationId(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized && isValidDeployOrganizationId(normalized) ? normalized : undefined;
}

/**
 * Translate the UI filter into the generated deploy SDK's list query.
 *
 * The "all" choices are omitted rather than sent as sentinels, and the owner
 * organization only accompanies an `ORGANIZATION` scope.
 */
export function toDeployAppListQuery(filter: DeployAppListFilter): DeployAppListQuery {
  const tab = DEPLOY_APP_KIND_TABS.find((candidate) => candidate.id === filter.kindTab);
  const appKind = tab && tab.appKinds.length > 0 ? [...tab.appKinds] : undefined;
  const ownershipScope: DeployOwnershipScope | undefined = filter.ownership === "all"
    ? undefined
    : filter.ownership;
  const ownerOrganizationId = ownershipScope === "ORGANIZATION"
    ? normalizeDeployOrganizationId(filter.organizationId)
    : undefined;
  return {
    ...(appKind ? { appKind } : {}),
    ...(ownershipScope ? { ownershipScope } : {}),
    ...(ownerOrganizationId ? { ownerOrganizationId } : {}),
  };
}

/**
 * Parse the deploy filter out of URL search parameters.
 *
 * Unknown values degrade to the "all" default instead of throwing: a shared
 * link carrying a retired tab or a malformed organization id must still render
 * a list, never a crash.
 */
export function parseDeployAppListFilter(
  search: URLSearchParams | string,
): DeployAppListFilter {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const kind = params.get(DEPLOY_FILTER_PARAMS.kind);
  const kindTab = DEPLOY_APP_KIND_TABS.some((tab) => tab.id === kind)
    ? (kind as DeployAppKindTabId)
    : DEFAULT_DEPLOY_APP_LIST_FILTER.kindTab;
  const scope = params.get(DEPLOY_FILTER_PARAMS.ownership);
  const ownership = DEPLOY_OWNERSHIP_FILTERS.some((filter) => filter.id === scope)
    ? (scope as DeployOwnershipFilterId)
    : DEFAULT_DEPLOY_APP_LIST_FILTER.ownership;
  const organizationId = ownership === "ORGANIZATION"
    ? normalizeDeployOrganizationId(params.get(DEPLOY_FILTER_PARAMS.organization) ?? undefined)
    : undefined;
  return {
    kindTab,
    ownership,
    ...(organizationId ? { organizationId } : {}),
  };
}

/**
 * Write the deploy filter into a copy of the current search parameters.
 *
 * Unrelated parameters (view state owned by other features) are preserved, and
 * default choices delete their parameter so a cleared list keeps a clean URL.
 */
export function writeDeployAppListFilter(
  current: URLSearchParams,
  filter: DeployAppListFilter,
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (filter.kindTab === "all") {
    next.delete(DEPLOY_FILTER_PARAMS.kind);
  } else {
    next.set(DEPLOY_FILTER_PARAMS.kind, filter.kindTab);
  }
  if (filter.ownership === "all") {
    next.delete(DEPLOY_FILTER_PARAMS.ownership);
  } else {
    next.set(DEPLOY_FILTER_PARAMS.ownership, filter.ownership);
  }
  const organizationId = filter.ownership === "ORGANIZATION"
    ? normalizeDeployOrganizationId(filter.organizationId)
    : undefined;
  if (organizationId) {
    next.set(DEPLOY_FILTER_PARAMS.organization, organizationId);
  } else {
    next.delete(DEPLOY_FILTER_PARAMS.organization);
  }
  return next;
}

/**
 * `true` when at least one server-side filter narrows the list.
 *
 * The owner organization only narrows an already-active `ORGANIZATION` scope,
 * so it never makes an otherwise-default filter active on its own.
 */
export function hasActiveDeployAppListFilter(filter: DeployAppListFilter | undefined): boolean {
  if (!filter) {
    return false;
  }
  return filter.kindTab !== "all" || filter.ownership !== "all";
}

/**
 * `true` when the deploy API rejected the query itself (HTTP 400 / 422).
 *
 * A rejected parameter set is not an outage: the page must say the filter is
 * invalid instead of offering a retry that would fail the same way.
 */
export function isDeployAppListQueryInvalid(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode);
  return status === 400 || status === 422;
}

/** Coerce a deploy ownership scope coming off the wire. */
export function normalizeDeployOwnershipScope(
  value: unknown,
): DeployOwnershipScope | undefined {
  return typeof value === "string" && DEPLOY_OWNERSHIP_SCOPES.includes(value as DeployOwnershipScope)
    ? (value as DeployOwnershipScope)
    : undefined;
}
