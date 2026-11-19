/**
 * Application integration bindings.
 *
 * The application center presents three application systems (IAM, Deploy, App
 * Store), but a usable application integration always hangs off one Deploy
 * application: that is the aggregate that owns environments, publishing and
 * the application identity. This module defines the binding document stored on
 * that Deploy application and the account catalogs the operator picks from.
 *
 * The document is environment-scoped on purpose. Channel credentials (WeChat
 * AppID / AppSecret) and merchant accounts are issued per environment, so a
 * production app must never inherit a development official account or a
 * sandbox merchant account.
 */

import type { ApplicationGroupId } from "./application-catalog";

/** Stable document marker; a future format change gets a new version value. */
export const APPLICATION_INTEGRATION_SCHEMA = "sdkwork.application.integrations/v1";

/**
 * Deploy application `metadata` key that carries the cross-system anchor.
 *
 * Account bindings are **not** read from or written to this document any more:
 * `deploy_application_resource_link` owns them (see
 * `docs/architecture/tech/TECH-application-resource-bindings.md` in the Deploy
 * repository). The document remains the system of record only for
 * `linkedApplications` (the IAM / App Store anchor) and the pre-migration
 * binding rows, which this console reads once as a migration seed and never
 * rewrites.
 */
export const APPLICATION_INTEGRATION_METADATA_KEY = "integrations";

/**
 * The lifecycle environment keys `deploy_application_resource_link.env_key`
 * accepts. Deploy may register extra app environments with arbitrary keys, but
 * a binding is only addressable on one of these five values.
 */
export const BINDABLE_APPLICATION_ENVIRONMENTS = [
  "development",
  "test",
  "staging",
  "demo",
  "production",
] as const;

export type BindableApplicationEnvironment = (typeof BINDABLE_APPLICATION_ENVIRONMENTS)[number];

/** Payment provider account environment as defined by the payment contract. */
export type PaymentAccountEnvironment = "development" | "sandbox" | "production";

/** The two WeChat-style channel account kinds the application center binds. */
export type ChannelAccountKind = "official-account" | "mini-program";

/**
 * Ownership scope an integration account belongs to.
 *
 * The platform exposes three catalog levels: the operator's own accounts, an
 * organization-verified catalog, and the tenant-wide catalog. A picker may show
 * all three; an account is always rendered under exactly one scope.
 */
export type IntegrationAccountScope = "personal" | "organization" | "tenant";

/** One cursor page of integration account options. */
export interface IntegrationAccountPage<T> {
  items: readonly T[];
  hasMore: boolean;
  nextCursor?: string;
}

/** Server-side query the scope picker sends to a catalog. */
export interface IntegrationAccountQuery {
  search: string;
  cursor?: string;
  pageSize: number;
}

/** The three row actions the application list exposes. */
export type ApplicationIntegrationKind = "payment" | ChannelAccountKind;

/**
 * A cross-system link from a Deploy application to one row of another group.
 *
 * It is stored on the Deploy application so an IAM or App Store row can find
 * its Deploy anchor deterministically instead of matching by display name.
 */
export interface LinkedApplicationRef {
  groupId: ApplicationGroupId;
  id: string;
  reference?: string;
  name?: string;
}

/**
 * One bound official account or mini program.
 *
 * A display snapshot is stored next to the id: the binding drawer can then name
 * the account even when the IAM catalog is temporarily unavailable, and a later
 * rename in IAM does not silently change what the operator approved.
 */
export interface ApplicationChannelAccountBinding {
  id: string;
  /** Provider-side AppID (the WeChat AppID for official/mini accounts). */
  appId: string;
  displayName: string;
  providerCode: string;
  accountType?: string;
  resourceAccountKind: ChannelAccountKind;
  enabled: boolean;
  status?: string;
  authorizationStatus?: string;
}

/** One bound payment provider account. */
export interface ApplicationPaymentAccountBinding {
  id: string;
  accountNo: string;
  accountName?: string;
  providerCode: string;
  environment: string;
  accountMode: string;
  settlementCurrency?: string;
  countryCode?: string;
  /** Exactly one account per provider may be the default. */
  isDefault: boolean;
}

/** The integration configuration of one Deploy application environment. */
export interface ApplicationEnvironmentIntegration {
  /** At most one official account per environment. */
  officialAccount?: ApplicationChannelAccountBinding;
  /** At most one mini program per environment. */
  miniProgram?: ApplicationChannelAccountBinding;
  /** Any number of provider accounts; one default per provider. */
  paymentAccounts: ApplicationPaymentAccountBinding[];
}

/** Complete binding document stored under `deploy_app.metadata.integrations`. */
export interface ApplicationIntegrationDocument {
  schema: typeof APPLICATION_INTEGRATION_SCHEMA;
  linkedApplications: LinkedApplicationRef[];
  environments: Record<string, ApplicationEnvironmentIntegration>;
  /**
   * Legacy environment keys the console has already migrated to the
   * authoritative resource-link table.
   *
   * Without this ledger a cleared environment would be re-seeded from the
   * untouched legacy document on the next open, resurrecting a binding the
   * operator intentionally removed.
   */
  migratedEnvironments?: readonly string[];
}

/** One environment of a Deploy application, as the environment picker shows it. */
export interface ApplicationEnvironmentOption {
  key: string;
  name?: string;
  level?: string;
}

/** Normalized IAM OAuth resource account option. */
export interface ApplicationChannelAccountOption {
  id: string;
  kind: ChannelAccountKind;
  /** Provider-side AppID. */
  appId: string;
  displayName: string;
  providerCode: string;
  accountType?: string;
  enabled: boolean;
  status?: string;
  authorizationStatus?: string;
  /** Ownership scope; absent legacy rows resolve to `tenant`. */
  scope?: IntegrationAccountScope;
  organizationId?: string;
  ownerUserId?: string;
}

/** Normalized payment provider account option. */
export interface ApplicationPaymentAccountOption {
  id: string;
  accountNo: string;
  accountName?: string;
  providerCode: string;
  environment: string;
  accountMode: string;
  status: string;
  settlementCurrency?: string;
  countryCode?: string;
  capabilities: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
  /** Ownership scope; absent legacy rows resolve to `tenant`. */
  scope?: IntegrationAccountScope;
  organizationId?: string;
  ownerUserId?: string;
}

/** Compact row summary derived from a binding document. */
export interface ApplicationIntegrationSummary {
  deployAppId: string;
  /** `true` when the row reached its Deploy anchor through an explicit link. */
  linked: boolean;
  environmentCount: number;
  officialAccountCount: number;
  miniProgramCount: number;
  paymentAccountCount: number;
  /**
   * Auto-login and cashier readiness of the first configured environment.
   *
   * Present only when the caller knows the application kind; absent for an
   * unknown kind or a summary built without one.
   */
  readiness?: {
    autoLogin: "incomplete" | "not-applicable" | "ready";
    checkout: "incomplete" | "not-applicable" | "ready";
  };
}

/**
 * One normalized `deploy_application_resource_link` row.
 *
 * `resourceRef` is the provider-side identity (WeChat AppID for a channel
 * account, merchant account number for a payment account). The catalog account
 * id the operator picked is kept in `metadata.accountId`, because the binding
 * row id is not the catalog id.
 */
export interface ApplicationResourceLinkRecord {
  id: string;
  environment: string;
  resourceKind: ApplicationIntegrationKindWire;
  resourceRef: string;
  providerCode?: string;
  isDefault: boolean;
  bindingStatus: string;
  metadata: Readonly<Record<string, unknown>>;
  updatedAt?: string;
}

/** Wire spelling of a resource link kind (`deploy_application_resource_link`). */
export type ApplicationIntegrationKindWire = "official_account" | "mini_program" | "payment_account";

/**
 * Bindings loaded for one Deploy application.
 *
 * `legacySeed` is `true` only when the authoritative table returned no rows and
 * the drawer seeded the editable view from the pre-migration document. Saving
 * migrates those rows through the resource-link API; the document itself is
 * left untouched as migration evidence.
 */
export interface ApplicationIntegrationBindings {
  environments: Record<string, ApplicationEnvironmentIntegration>;
  links: readonly ApplicationResourceLinkRecord[];
  legacySeed: boolean;
}

/** One environment's pending edits, sent in a single metadata update. */
export interface ApplicationIntegrationEnvironmentUpdate {
  key: string;
  integration: ApplicationEnvironmentIntegration;
}

/** Input of one binding save; all environment edits land in one metadata write. */
export interface ApplicationIntegrationSaveInput {
  deployAppId: string;
  /** Present when a non-Deploy row pins (or re-pins) its Deploy anchor. */
  linkedApplication?: LinkedApplicationRef;
  /**
   * The anchor the row resolved before this edit. When it differs from
   * `deployAppId`, the transport removes the stale cross-system link from the
   * previous Deploy application so one row never resolves to two anchors.
   */
  previousDeployAppId?: string;
  environments: readonly ApplicationIntegrationEnvironmentUpdate[];
}

/** Result of a binding save. */
export interface ApplicationIntegrationSaveResult {
  deployAppId: string;
  metadata: Record<string, unknown>;
  updatedAt?: string;
  /** Metadata of the previous anchor after a successful link migration. */
  previousDeployApp?: {
    deployAppId: string;
    metadata: Record<string, unknown>;
  };
}

/**
 * The transport port the page consumes.
 *
 * The page never creates an HTTP client for these operations: the default
 * implementation composes the generated Deploy app SDK, the IAM service and the
 * generated payment backend SDK. Tests and hosts may inject their own.
 */
export interface ApplicationIntegrationService {
  loadChannelAccounts(kind: ChannelAccountKind): Promise<readonly ApplicationChannelAccountOption[]>;
  loadPaymentAccounts(): Promise<readonly ApplicationPaymentAccountOption[]>;
  /**
   * Cursor-paged scope-aware catalog used by the generic picker.
   *
   * Optional so existing test doubles remain valid; the drawer falls back to
   * filtering the full catalog when a host does not implement it.
   */
  loadChannelAccountPage?(
    kind: ChannelAccountKind,
    scope: IntegrationAccountScope,
    query: IntegrationAccountQuery,
  ): Promise<IntegrationAccountPage<ApplicationChannelAccountOption>>;
  /** Cursor-paged scope-aware payment catalog; see the channel counterpart. */
  loadPaymentAccountPage?(
    scope: IntegrationAccountScope,
    query: IntegrationAccountQuery,
  ): Promise<IntegrationAccountPage<ApplicationPaymentAccountOption>>;
  loadEnvironments(deployAppId: string, fallbackEnvironment?: string): Promise<readonly ApplicationEnvironmentOption[]>;
  /**
   * Loads one application's account bindings from the authoritative
   * `deploy_application_resource_link` table.
   *
   * Optional so older test doubles keep working; when a host omits it the
   * drawer reads the legacy document read-only, which is the migration path.
   */
  loadBindings?(
    deployAppId: string,
    legacyMetadata?: Record<string, unknown>,
  ): Promise<ApplicationIntegrationBindings>;
  save(input: ApplicationIntegrationSaveInput): Promise<ApplicationIntegrationSaveResult>;
}

/** Machine-readable validation issue; the page localizes it. */
export type ApplicationIntegrationIssueCode =
  | "account-not-used-by-app-kind"
  | "auto-login-not-configured"
  | "channel-app-id-missing"
  | "channel-disabled"
  | "channel-not-found"
  | "channel-unauthorized"
  | "checkout-not-ready"
  | "environment-not-bindable"
  | "payment-capability-missing"
  | "payment-default-duplicate"
  | "payment-default-missing"
  | "payment-duplicate"
  | "payment-environment-mismatch"
  | "payment-inactive"
  | "payment-not-found"
  | "payment-not-used-by-app-kind"
  | "payment-partner-sub-merchant-missing"
  | "payment-provider-incompatible"
  | "required-integration-missing"
  | "wechat-app-id-mismatch"
  | "wechat-channel-missing"
  | "wechat-payment-missing";

/** One validation finding. Warnings do not block saving; errors do. */
export interface ApplicationIntegrationIssue {
  code: ApplicationIntegrationIssueCode;
  severity: "error" | "warning";
  params?: Readonly<Record<string, string>>;
}

/** Everything validation needs to reason about one environment. */
export interface ApplicationIntegrationValidationInput {
  /** Deploy application kind (`appKind`), e.g. `WECHAT_MINIPROGRAM`. */
  appKind?: string;
  environment: string;
  environmentLevel?: string;
  integration: ApplicationEnvironmentIntegration;
  paymentAccounts: readonly ApplicationPaymentAccountOption[];
  channelAccounts: readonly ApplicationChannelAccountOption[];
}
