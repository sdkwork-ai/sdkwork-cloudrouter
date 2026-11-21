/**
 * Unified application catalog contract.
 *
 * An application management page can show one entity's applications from
 * several owning platforms. Each platform keeps its own transport and record
 * shape; this module normalizes them into one row shape so the page renders a
 * single table and search experience.
 */

export type ApplicationGroupId = "iam" | "deploy" | "app-store";

/**
 * Deploy endpoint kinds (`DeployAppKind` on the wire, `app_kind` in queries).
 *
 * One application is one endpoint: H5/PC/desktop web surfaces, the two mini
 * program providers, the native mobile kinds, HarmonyOS, desktop, and API
 * services are separate applications rather than variants of one. `STATIC_WEB`
 * and `SPA_WEB` are the legacy rendering-model kinds kept for existing rows.
 */
export const DEPLOY_APP_KINDS = [
  "H5_WEB",
  "PC_WEB",
  "WECHAT_MINIPROGRAM",
  "DOUYIN_MINIPROGRAM",
  "FLUTTER_APP",
  "IOS_APP",
  "ANDROID_APP",
  "HARMONYOS_APP",
  "API_SERVICE",
  "DESKTOP_APP",
  "STATIC_WEB",
  "SPA_WEB",
] as const;

export type DeployAppKind = (typeof DEPLOY_APP_KINDS)[number];

/** Which level owns a deploy application (`ownership_scope` on the wire). */
export const DEPLOY_OWNERSHIP_SCOPES = ["PLATFORM", "TENANT", "ORGANIZATION", "USER"] as const;

export type DeployOwnershipScope = (typeof DEPLOY_OWNERSHIP_SCOPES)[number];

/** The ownership filter's "no scope" choice; it never reaches the wire. */
export type DeployOwnershipFilterId = "all" | DeployOwnershipScope;

/**
 * Deploy kind tab identity.
 *
 * The ids double as the `kind` URL query value and as the i18n label key, so a
 * shared link stays stable while the labels remain localized.
 */
export type DeployAppKindTabId =
  | "all"
  | "h5"
  | "pc"
  | "miniProgram"
  | "flutter"
  | "ios"
  | "android"
  | "harmonyos"
  | "desktop"
  | "api"
  | "legacyWeb";

/** Label keys of a single deploy application kind (excludes the "all" tab). */
export type DeployKindMessageKey = Exclude<DeployAppKindTabId, "all">;

/** Label keys of one ownership level, including the "all" filter choice. */
export type DeployOwnershipMessageKey = "all" | "tenant" | "organization" | "user" | "platform";

/** The deploy group's active filter, as parsed from and written to the URL. */
export interface DeployAppListFilter {
  kindTab: DeployAppKindTabId;
  ownership: DeployOwnershipFilterId;
  /**
   * Positive organization id narrowing an `ORGANIZATION` filter.
   *
   * `0` is the tenant encoding of `owner_organization_id`, so it is never
   * stored here; absence means "every organization".
   */
  organizationId?: string;
}

/** The generated deploy SDK's list query, derived from a filter. */
export interface DeployAppListQuery {
  appKind?: DeployAppKind[];
  ownershipScope?: DeployOwnershipScope;
  ownerOrganizationId?: string;
}

/** One organization the ownership filter can offer instead of free text. */
export interface DeployOrganizationOption {
  id: string;
  name?: string;
}

/** Optional per-group query handed to a catalog loader. */
export interface ApplicationCatalogQuery {
  deploy?: DeployAppListFilter;
  /**
   * Free-text search the backend evaluates for groups that declare a keyword
   * facet (Deploy). A paginated group must not search the loaded window only:
   * a row on page 3 has to be findable from page 1.
   */
  keyword?: string;
  /** 1-based page window; omitted means the first page. */
  page?: number;
  /** Rows per page; omitted lets the loader apply the catalog default. */
  pageSize?: number;
}

/**
 * Server page metadata for one list window.
 *
 * Mirrors the backend's `pageInfo` in the loader's own vocabulary so the page
 * never reads raw wire fields: `totalItems` and `hasMore` drive the footer
 * count and the Next control instead of arithmetic over the rows on screen.
 */
export interface ApplicationCatalogPageInfo {
  page: number;
  pageSize: number;
  /** Total rows matching the query across every page, when reported. */
  totalItems?: number;
  /** Whether the backend has another page after this one. */
  hasMore: boolean;
}

/** One server page of a group that does not fit in a single response. */
export interface ApplicationCatalogPage {
  items: readonly ApplicationRecord[];
  pageInfo: ApplicationCatalogPageInfo;
}

/**
 * Loader verdict for one group.
 *
 * An array is a complete, bounded collection (the whole group is on screen). An
 * object is one page of a server-paginated list, and its `pageInfo` is the only
 * source of the footer total and the page boundary.
 */
export type ApplicationCatalogLoaderResult =
  | readonly ApplicationRecord[]
  | ApplicationCatalogPage;

export interface ApplicationRecord {
  /** Stable identity within the group. */
  id: string;
  groupId: ApplicationGroupId;
  /** Primary display name. */
  name: string;
  /** Secondary identifier (app id, slug, or app key). */
  reference?: string;
  /** Content or application kind (pc / h5 / api / app kind / platform). */
  kind?: string;
  /**
   * Deploy application this IAM installation serves (`deploy_application_id`).
   *
   * IAM provisions one installation per deploy application, so this is the
   * authoritative cross-system anchor for an IAM row; it must win over any
   * name-based fallback. For a Deploy row it is the application's own snowflake
   * primary key, kept as the decimal string the wire carried and displayed as
   * the row's application ID.
   */
  deployApplicationId?: string;
  environment?: string;
  status?: string;
  /**
   * Deploy's `identity_status` for the IAM installation this app provisions.
   *
   * Deploy apps are one-to-one with an IAM installation; `active` means the
   * installation exists, while `pending_identity`/`failed` means the app cannot
   * issue an application access token yet.
   */
  identityStatus?: string;
  /** Organization owning the application; absent means tenant-level. */
  organizationId?: string;
  /**
   * Deploy ownership level (`ownership_scope`).
   *
   * Present on deploy rows only: it distinguishes platform, tenant,
   * organization, and personal apps without having to reinterpret
   * `organizationId` (`"0"` is the tenant encoding, which is why the scope is
   * carried explicitly).
   */
  ownershipScope?: DeployOwnershipScope;
  domain?: string;
  version?: string;
  updatedAt?: string;
  /**
   * Deploy app `metadata` echo, present only for Deploy rows.
   *
   * The application integration binding document lives under its
   * `integrations` key; keeping the raw object lets the integration drawer
   * merge its write into whatever else the app already stores.
   */
  metadata?: Record<string, unknown>;
}

export interface ApplicationCatalogContext {
  tenantId: string;
  organizationId?: string;
  organizationName?: string;
  tenantName?: string;
}

export type ApplicationGroupStatus = "loading" | "ready" | "error";

export interface ApplicationGroupState {
  status: ApplicationGroupStatus;
  items: readonly ApplicationRecord[];
  /** Raw source failure; the page localizes it for display. */
  error?: unknown;
  /** Server page metadata, present only when the group's loader returns a page. */
  pageInfo?: ApplicationCatalogPageInfo;
}

/**
 * Loads one group's applications for the current entity context.
 *
 * A group that supports server-side filtering and pagination (Deploy) reads its
 * filter, keyword, and page window from the optional query and answers with
 * {@link ApplicationCatalogPage}; a bounded group answers with its whole
 * collection.
 */
export type ApplicationGroupLoader = (
  context: ApplicationCatalogContext,
  query?: ApplicationCatalogQuery,
) => Promise<ApplicationCatalogLoaderResult>;

/**
 * A short-lived access credential issued for one application by the IAM
 * delegated-access-credential API. It carries the application identity plus
 * the issuance metadata the drawer shows to the operator.
 */
export interface ApplicationAccessToken {
  accessToken: string;
  appId?: string;
  expiresAt?: string;
  organizationId?: string;
  sessionId?: string;
  installationId?: string;
  tenantId?: string;
}

/** Issues an application access token for the selected row. */
export type ApplicationAccessTokenIssuer = (
  context: ApplicationCatalogContext,
  application: ApplicationRecord,
) => Promise<ApplicationAccessToken>;
