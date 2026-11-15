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

/** Deploy application `metadata` key that carries the binding document. */
export const APPLICATION_INTEGRATION_METADATA_KEY = "integrations";

/** Payment provider account environment as defined by the payment contract. */
export type PaymentAccountEnvironment = "development" | "sandbox" | "production";

/** The two WeChat-style channel account kinds the application center binds. */
export type ChannelAccountKind = "official-account" | "mini-program";

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
  loadEnvironments(deployAppId: string, fallbackEnvironment?: string): Promise<readonly ApplicationEnvironmentOption[]>;
  save(input: ApplicationIntegrationSaveInput): Promise<ApplicationIntegrationSaveResult>;
}

/** Machine-readable validation issue; the page localizes it. */
export type ApplicationIntegrationIssueCode =
  | "channel-app-id-missing"
  | "channel-disabled"
  | "channel-not-found"
  | "channel-unauthorized"
  | "payment-capability-missing"
  | "payment-default-duplicate"
  | "payment-default-missing"
  | "payment-duplicate"
  | "payment-environment-mismatch"
  | "payment-inactive"
  | "payment-not-found"
  | "payment-partner-sub-merchant-missing"
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
  environment: string;
  environmentLevel?: string;
  integration: ApplicationEnvironmentIntegration;
  paymentAccounts: readonly ApplicationPaymentAccountOption[];
  channelAccounts: readonly ApplicationChannelAccountOption[];
}
