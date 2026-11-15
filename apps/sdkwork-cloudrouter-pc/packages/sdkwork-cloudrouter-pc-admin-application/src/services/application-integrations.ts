/**
 * Default transport for application integration bindings.
 *
 * Three owning services are composed here instead of in the page:
 *
 * - Deploy app SDK: read the anchor app and persist the binding document on
 *   `deploy_app.metadata.integrations` (the app-level free-form document the
 *   Deploy contract exposes; `apps.update` replaces the whole metadata object,
 *   so every write starts from the freshly retrieved value).
 * - IAM service: list the unified `iam_oauth_resource_account` rows of kind
 *   `official_account` / `mini_program`.
 * - Payment backend SDK: list provider accounts and their environment,
 *   capability and metadata facts.
 *
 * The page only sees normalized options, never a raw HTTP response.
 */

import {
  getSdkworkDeploymentsAppSdkClient,
  getSdkworkPaymentBackendSdkClient,
} from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  ApplicationChannelAccountOption,
  ApplicationEnvironmentOption,
  ApplicationIntegrationSaveInput,
  ApplicationIntegrationSaveResult,
  ApplicationIntegrationService,
  ApplicationPaymentAccountOption,
  ChannelAccountKind,
} from "../types/application-integrations";
import {
  APPLICATION_INTEGRATION_METADATA_KEY,
  APPLICATION_INTEGRATION_SCHEMA,
} from "../types/application-integrations";
import {
  linkApplication,
  readApplicationIntegrationDocument,
  unlinkApplication,
  upsertEnvironmentIntegration,
  writeApplicationIntegrationDocument,
} from "./application-integration-document";
import { getApplicationCatalogIamService } from "./iam-service";

const CATALOG_PAGE_SIZE = 200;
const CHANNEL_PAGE_SIZE = 200;

let defaultIntegrationService: ApplicationIntegrationService | null = null;

/** Process-wide service; the composed SDK clients are process singletons. */
export function getApplicationIntegrationService(): ApplicationIntegrationService {
  if (!defaultIntegrationService) {
    defaultIntegrationService = createApplicationIntegrationService();
  }
  return defaultIntegrationService;
}

/** Test helper: drop the process-wide service after a session reset. */
export function resetApplicationIntegrationService(): void {
  defaultIntegrationService = null;
}

export function createApplicationIntegrationService(): ApplicationIntegrationService {
  return {
    async loadChannelAccounts(kind) {
      const service = getApplicationCatalogIamService();
      const payload = await service.iam.oauth.resourceAccounts.list({
        page: 1,
        page_size: CHANNEL_PAGE_SIZE,
      });
      const items = extractItems(payload);
      return items
        .map((item) => mapChannelAccount(item, kind))
        .filter((item): item is ApplicationChannelAccountOption => item !== undefined)
        .sort(compareChannelAccounts);
    },

    async loadPaymentAccounts() {
      const client = getSdkworkPaymentBackendSdkClient();
      const page = await client.payments.providerAccounts.list({
        page: 1,
        pageSize: CATALOG_PAGE_SIZE,
      });
      return (page.items ?? [])
        .map((item) => mapPaymentAccount(item))
        .filter((item): item is ApplicationPaymentAccountOption => item !== undefined)
        .sort(comparePaymentAccounts);
    },

    async loadEnvironments(deployAppId, fallbackEnvironment) {
      const client = getSdkworkDeploymentsAppSdkClient();
      try {
        const page = await client.appEnvironment.list(deployAppId);
        const options = (page.items ?? [])
          .map((item) => mapEnvironment(item))
          .filter((item): item is ApplicationEnvironmentOption => item !== undefined);
        if (options.length > 0) {
          return options.sort(compareEnvironments);
        }
      } catch {
        // An app that has not declared environments yet still has its default
        // environment; the fallback keeps the drawer usable.
      }
      return fallbackEnvironment?.trim() ? [{ key: fallbackEnvironment.trim() }] : [];
    },

    async save(input) {
      return saveApplicationIntegration(input);
    },
  };
}

async function saveApplicationIntegration(
  input: ApplicationIntegrationSaveInput,
): Promise<ApplicationIntegrationSaveResult> {
  const client = getSdkworkDeploymentsAppSdkClient();
  const current = await client.app.retrieve(input.deployAppId);
  const currentMetadata = asRecord(current.metadata);
  const rawDocument = asRecord(currentMetadata[APPLICATION_INTEGRATION_METADATA_KEY]);
  if (rawDocument.schema !== undefined && rawDocument.schema !== APPLICATION_INTEGRATION_SCHEMA) {
    // A newer writer owns the key. Refuse instead of overwriting a format this
    // build cannot round-trip.
    throw new Error("application integration document version is not supported by this client");
  }
  let document = readApplicationIntegrationDocument(currentMetadata);
  if (input.linkedApplication) {
    document = linkApplication(document, input.linkedApplication);
  }
  for (const environment of input.environments) {
    document = upsertEnvironmentIntegration(document, environment.key, environment.integration);
  }
  const metadata = writeApplicationIntegrationDocument(currentMetadata, document);
  const updated = await client.app.update(input.deployAppId, { metadata });
  const previousDeployAppId = input.previousDeployAppId?.trim();
  let previousDeployApp: ApplicationIntegrationSaveResult["previousDeployApp"];
  if (input.linkedApplication && previousDeployAppId && previousDeployAppId !== input.deployAppId) {
    // The new anchor is durable before the old one is cleaned, so a failure in
    // this step surfaces as "saved but move incomplete" and a retry is
    // idempotent (the link removal is a no-op the second time).
    const previousMetadata = await removeApplicationLink(client, previousDeployAppId, input.linkedApplication);
    if (previousMetadata) {
      previousDeployApp = { deployAppId: previousDeployAppId, metadata: previousMetadata };
    }
  }
  return {
    deployAppId: input.deployAppId,
    metadata: asRecord(updated.metadata ?? metadata),
    ...(updated.updatedAt === undefined ? {} : { updatedAt: updated.updatedAt }),
    ...(previousDeployApp === undefined ? {} : { previousDeployApp }),
  };
}

async function removeApplicationLink(
  client: ReturnType<typeof getSdkworkDeploymentsAppSdkClient>,
  deployAppId: string,
  application: NonNullable<ApplicationIntegrationSaveInput["linkedApplication"]>,
): Promise<Record<string, unknown> | undefined> {
  let previous;
  try {
    previous = await client.app.retrieve(deployAppId);
  } catch (error: unknown) {
    if (readStatus(error) === 404) {
      return undefined;
    }
    throw error;
  }
  const previousMetadata = asRecord(previous.metadata);
  const previousDocument = readApplicationIntegrationDocument(previousMetadata);
  const nextDocument = unlinkApplication(previousDocument, application);
  if (nextDocument === previousDocument) {
    return undefined;
  }
  const nextMetadata = writeApplicationIntegrationDocument(previousMetadata, nextDocument);
  const updated = await client.app.update(deployAppId, { metadata: nextMetadata });
  return asRecord(updated.metadata ?? nextMetadata);
}

function readStatus(error: unknown): number | undefined {
  const record = asRecord(error);
  const status = Number(record.status ?? record.statusCode);
  return Number.isFinite(status) ? status : undefined;
}

function mapChannelAccount(
  value: unknown,
  expectedKind: ChannelAccountKind,
): ApplicationChannelAccountOption | undefined {
  const record = asRecord(value);
  const rawKind = readString(record.resourceAccountKind ?? record.resource_account_kind);
  const kind = channelKindOf(rawKind);
  if (!kind || kind !== expectedKind) {
    return undefined;
  }
  const id = readString(record.id ?? record.resourceAccountId ?? record.resource_account_id);
  if (!id) {
    return undefined;
  }
  const appId = readString(
    record.appId
      ?? record.providerClientId
      ?? record.provider_client_id
      ?? record.providerAccountId
      ?? record.provider_account_id,
  ) ?? "";
  const accountType = readString(record.providerAccountType ?? record.provider_account_type);
  const status = readString(record.status);
  const authorizationStatus = readString(record.authorizationStatus ?? record.authorization_status);
  return {
    id,
    kind,
    appId,
    displayName: readString(record.displayName ?? record.display_name) ?? appId ?? id,
    providerCode: readString(record.providerCode ?? record.provider_code) ?? "wechat",
    ...(accountType === undefined ? {} : { accountType }),
    enabled: readBoolean(record.enabled) ?? false,
    ...(status === undefined ? {} : { status }),
    ...(authorizationStatus === undefined ? {} : { authorizationStatus }),
  };
}

function mapPaymentAccount(value: unknown): ApplicationPaymentAccountOption | undefined {
  const record = asRecord(value);
  const id = readString(record.id);
  if (!id) {
    return undefined;
  }
  const accountName = readString(record.accountName ?? record.account_name);
  const settlementCurrency = readString(record.settlementCurrency ?? record.settlement_currency);
  const countryCode = readString(record.countryCode ?? record.country_code);
  return {
    id,
    accountNo: readString(record.accountNo ?? record.account_no) ?? id,
    ...(accountName === undefined ? {} : { accountName }),
    providerCode: readString(record.providerCode ?? record.provider_code) ?? "unknown",
    environment: readString(record.environment) ?? "production",
    accountMode: readString(record.accountMode ?? record.account_mode) ?? "direct",
    status: readString(record.status) ?? "inactive",
    ...(settlementCurrency === undefined ? {} : { settlementCurrency }),
    ...(countryCode === undefined ? {} : { countryCode }),
    capabilities: asRecord(record.capabilities),
    metadata: asRecord(record.metadata),
  };
}

function mapEnvironment(value: unknown): ApplicationEnvironmentOption | undefined {
  const record = asRecord(value);
  const key = readString(record.envKey ?? record.env_key);
  if (!key) {
    return undefined;
  }
  const name = readString(record.envName ?? record.env_name);
  const level = readString(record.envLevel ?? record.env_level);
  return {
    key,
    ...(name === undefined ? {} : { name }),
    ...(level === undefined ? {} : { level }),
  };
}

function channelKindOf(value: string | undefined): ChannelAccountKind | undefined {
  if (value === "official_account" || value === "official-account") {
    return "official-account";
  }
  if (value === "mini_program" || value === "mini-program") {
    return "mini-program";
  }
  return undefined;
}

function compareChannelAccounts(
  left: ApplicationChannelAccountOption,
  right: ApplicationChannelAccountOption,
): number {
  return Number(right.enabled) - Number(left.enabled)
    || left.displayName.localeCompare(right.displayName)
    || left.id.localeCompare(right.id);
}

function comparePaymentAccounts(
  left: ApplicationPaymentAccountOption,
  right: ApplicationPaymentAccountOption,
): number {
  return Number(right.status === "active") - Number(left.status === "active")
    || left.providerCode.localeCompare(right.providerCode)
    || (left.accountName ?? left.accountNo).localeCompare(right.accountName ?? right.accountNo);
}

function compareEnvironments(
  left: ApplicationEnvironmentOption,
  right: ApplicationEnvironmentOption,
): number {
  const order: Record<string, number> = {
    DEVELOPMENT: 0,
    STAGING: 1,
    PRODUCTION: 2,
  };
  return (order[(left.level ?? "").toUpperCase()] ?? 3) - (order[(right.level ?? "").toUpperCase()] ?? 3)
    || left.key.localeCompare(right.key);
}

function extractItems(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (Array.isArray(record.items)) {
    return record.items;
  }
  const data = asRecord(record.data);
  return Array.isArray(data.items) ? data.items : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false") {
    return false;
  }
  return undefined;
}
