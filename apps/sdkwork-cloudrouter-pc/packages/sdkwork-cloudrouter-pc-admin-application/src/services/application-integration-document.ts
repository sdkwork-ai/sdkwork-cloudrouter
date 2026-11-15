/**
 * Pure binding-document logic.
 *
 * Keeping document parsing, environment scoping, Deploy-anchor resolution and
 * the compatibility rules in one side-effect-free module lets the page and the
 * transport share exactly one interpretation of `deploy_app.metadata
 * .integrations`, and lets the rules be tested without mounting the page.
 */

import type {
  ApplicationChannelAccountBinding,
  ApplicationChannelAccountOption,
  ApplicationEnvironmentIntegration,
  ApplicationIntegrationDocument,
  ApplicationIntegrationIssue,
  ApplicationIntegrationSummary,
  ApplicationIntegrationValidationInput,
  ApplicationPaymentAccountBinding,
  ApplicationPaymentAccountOption,
  LinkedApplicationRef,
  PaymentAccountEnvironment,
} from "../types/application-integrations";
import {
  APPLICATION_INTEGRATION_METADATA_KEY,
  APPLICATION_INTEGRATION_SCHEMA,
} from "../types/application-integrations";
import type { ApplicationGroupId, ApplicationRecord } from "../types/application-catalog";

/** The document an unconfigured application has. */
export function emptyApplicationIntegrationDocument(): ApplicationIntegrationDocument {
  return {
    schema: APPLICATION_INTEGRATION_SCHEMA,
    linkedApplications: [],
    environments: {},
  };
}

/** The environment configuration an unconfigured environment has. */
export function emptyEnvironmentIntegration(): ApplicationEnvironmentIntegration {
  return { paymentAccounts: [] };
}

/** `true` when no channel or payment account is configured. */
export function isEnvironmentIntegrationEmpty(integration: ApplicationEnvironmentIntegration): boolean {
  return !integration.officialAccount
    && !integration.miniProgram
    && integration.paymentAccounts.length === 0;
}

/** Reads the binding document from a Deploy application `metadata` value. */
export function readApplicationIntegrationDocument(metadata: unknown): ApplicationIntegrationDocument {
  const record = asRecord(metadata);
  const raw = asRecord(record[APPLICATION_INTEGRATION_METADATA_KEY]);
  if (raw.schema !== undefined && raw.schema !== APPLICATION_INTEGRATION_SCHEMA) {
    // The key belongs to this capability; an unknown marker means a future
    // format this build cannot interpret. Report the empty configuration
    // instead of pretending the foreign document is readable.
    return emptyApplicationIntegrationDocument();
  }
  const linkedApplications = readLinkedApplications(raw.linkedApplications ?? raw.linked_applications);
  const environments: Record<string, ApplicationEnvironmentIntegration> = {};
  const rawEnvironments = asRecord(raw.environments);
  for (const [key, value] of Object.entries(rawEnvironments)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      continue;
    }
    environments[normalizedKey] = normalizeEnvironmentIntegration(value);
  }
  return {
    schema: APPLICATION_INTEGRATION_SCHEMA,
    linkedApplications,
    environments,
  };
}

/**
 * Writes the binding document back into a complete `metadata` object.
 *
 * `apps.update` replaces `deploy_app.metadata` wholesale, so the caller keeps
 * every unrelated metadata key by spreading the object it just read.
 */
export function writeApplicationIntegrationDocument(
  metadata: unknown,
  document: ApplicationIntegrationDocument,
): Record<string, unknown> {
  return {
    ...asRecord(metadata),
    [APPLICATION_INTEGRATION_METADATA_KEY]: serializeDocument(document),
  };
}

/** Returns the configured integration for one environment. */
export function readEnvironmentIntegration(
  document: ApplicationIntegrationDocument,
  environment: string,
): ApplicationEnvironmentIntegration {
  return normalizeEnvironmentIntegration(document.environments[environment]);
}

/**
 * Replaces one environment's integration.
 *
 * An empty environment is removed from the document rather than stored as an
 * empty shell, so "cleared" and "never configured" stay the same state.
 */
export function upsertEnvironmentIntegration(
  document: ApplicationIntegrationDocument,
  environment: string,
  integration: ApplicationEnvironmentIntegration,
): ApplicationIntegrationDocument {
  const environments = { ...document.environments };
  if (isEnvironmentIntegrationEmpty(integration)) {
    delete environments[environment];
  } else {
    environments[environment] = normalizeEnvironmentIntegration(integration);
  }
  return { ...document, environments };
}

/** Adds a cross-system link once (idempotent by group + id). */
export function linkApplication(
  document: ApplicationIntegrationDocument,
  application: LinkedApplicationRef,
): ApplicationIntegrationDocument {
  const exists = document.linkedApplications.some(
    (item) => item.groupId === application.groupId && item.id === application.id,
  );
  if (exists) {
    return {
      ...document,
      linkedApplications: document.linkedApplications.map((item) =>
        item.groupId === application.groupId && item.id === application.id
          ? { ...item, ...application }
          : item),
    };
  }
  return { ...document, linkedApplications: [...document.linkedApplications, application] };
}

/** Removes a cross-system link from a document; returns the same value when absent. */
export function unlinkApplication(
  document: ApplicationIntegrationDocument,
  application: Pick<LinkedApplicationRef, "groupId" | "id">,
): ApplicationIntegrationDocument {
  const linkedApplications = document.linkedApplications.filter(
    (item) => !(item.groupId === application.groupId && item.id === application.id),
  );
  return linkedApplications.length === document.linkedApplications.length
    ? document
    : { ...document, linkedApplications };
}

/** Counts what the row summary shows; `undefined` when nothing is configured. */
export function summarizeApplicationIntegration(
  metadata: unknown,
  deployAppId: string,
  linked: boolean,
): ApplicationIntegrationSummary | undefined {
  const document = readApplicationIntegrationDocument(metadata);
  let officialAccountCount = 0;
  let miniProgramCount = 0;
  let paymentAccountCount = 0;
  let environmentCount = 0;
  for (const integration of Object.values(document.environments)) {
    if (isEnvironmentIntegrationEmpty(integration)) {
      continue;
    }
    environmentCount += 1;
    if (integration.officialAccount) {
      officialAccountCount += 1;
    }
    if (integration.miniProgram) {
      miniProgramCount += 1;
    }
    paymentAccountCount += integration.paymentAccounts.length;
  }
  if (environmentCount === 0) {
    return undefined;
  }
  return {
    deployAppId,
    linked,
    environmentCount,
    officialAccountCount,
    miniProgramCount,
    paymentAccountCount,
  };
}

/**
 * Finds the Deploy application an application-center row is configured on.
 *
 * Explicit links win over identifier matches. The identifier fallback keeps a
 * freshly registered IAM row or App Store row usable before anyone pinned its
 * anchor, because those rows carry the same app id/slug as the Deploy app.
 */
export function resolveDeployApplicationForRecord(
  record: ApplicationRecord,
  deployApplications: readonly ApplicationRecord[],
): ApplicationRecord | undefined {
  if (record.groupId === "deploy") {
    return deployApplications.find((application) => application.id === record.id) ?? record;
  }
  const candidates = deployApplications.map((application) => ({
    application,
    document: readApplicationIntegrationDocument(application.metadata),
  }));
  for (const { application, document } of candidates) {
    const linked = document.linkedApplications.some(
      (item) => item.groupId === record.groupId && item.id === record.id,
    );
    if (linked) {
      return application;
    }
  }
  const recordKeys = new Set(
    [record.reference, record.name]
      .map((value) => normalizeIdentifier(value))
      .filter((value): value is string => Boolean(value)),
  );
  if (recordKeys.size === 0) {
    return undefined;
  }
  for (const { application, document } of candidates) {
    const linkedToAnotherRow = document.linkedApplications.some(
      (item) => item.groupId === record.groupId && item.id !== record.id,
    );
    if (linkedToAnotherRow) {
      continue;
    }
    const applicationKeys = [application.reference, application.name]
      .map((value) => normalizeIdentifier(value))
      .filter((value): value is string => Boolean(value));
    if (applicationKeys.some((key) => recordKeys.has(key))) {
      return application;
    }
  }
  return undefined;
}

/** The payment environment a Deploy environment maps to. */
export function resolvePaymentEnvironment(
  environmentKey: string | undefined,
  environmentLevel?: string,
): PaymentAccountEnvironment {
  const level = (environmentLevel ?? "").trim().toUpperCase();
  if (level === "PRODUCTION") {
    return "production";
  }
  if (level === "STAGING") {
    return "sandbox";
  }
  if (level === "DEVELOPMENT") {
    return "development";
  }
  const key = (environmentKey ?? "").trim().toLowerCase();
  if (key === "production" || key === "development" || key === "sandbox") {
    return key;
  }
  if (/prod|live|online/.test(key)) {
    return "production";
  }
  if (/dev|local/.test(key)) {
    return "development";
  }
  return "sandbox";
}

/**
 * Payment accounts allowed for a Deploy environment.
 *
 * A production app accepts only production merchant credentials. Development
 * and test environments may point at either development or sandbox accounts,
 * because providers label their test tier inconsistently.
 */
export function isPaymentAccountCompatible(
  accountEnvironment: string,
  environmentKey: string | undefined,
  environmentLevel?: string,
): boolean {
  const expected = resolvePaymentEnvironment(environmentKey, environmentLevel);
  const actual = accountEnvironment.trim().toLowerCase();
  if (expected === "production") {
    return actual === "production";
  }
  if (expected === "development") {
    return actual === "development" || actual === "sandbox";
  }
  return actual === "sandbox" || actual === "development";
}

/** Validates one environment's binding against the loaded account catalogs. */
export function validateApplicationIntegration(
  input: ApplicationIntegrationValidationInput,
): ApplicationIntegrationIssue[] {
  const issues: ApplicationIntegrationIssue[] = [];
  const paymentById = new Map(input.paymentAccounts.map((account) => [account.id, account]));
  const channelById = new Map(input.channelAccounts.map((account) => [account.id, account]));
  const paymentIds = new Set<string>();
  const defaultsByProvider = new Map<string, number>();

  for (const binding of input.integration.paymentAccounts) {
    if (paymentIds.has(binding.id)) {
      issues.push(issue("payment-duplicate", "error", { account: displayPayment(binding) }));
      continue;
    }
    paymentIds.add(binding.id);
    if (binding.isDefault) {
      defaultsByProvider.set(binding.providerCode, (defaultsByProvider.get(binding.providerCode) ?? 0) + 1);
    }
    const account = paymentById.get(binding.id);
    if (!account) {
      issues.push(issue("payment-not-found", "warning", { account: displayPayment(binding) }));
      continue;
    }
    if (account.status !== "active") {
      issues.push(issue("payment-inactive", "error", {
        account: displayPayment(account),
        status: account.status,
      }));
    }
    if (account.capabilities.pay === false) {
      issues.push(issue("payment-capability-missing", "error", { account: displayPayment(account) }));
    }
    if (!isPaymentAccountCompatible(account.environment, input.environment, input.environmentLevel)) {
      issues.push(issue("payment-environment-mismatch", "error", {
        account: displayPayment(account),
        expected: resolvePaymentEnvironment(input.environment, input.environmentLevel),
        actual: account.environment,
      }));
    }
    if (account.accountMode === "partner" && !hasSubMerchant(account.metadata)) {
      issues.push(issue("payment-partner-sub-merchant-missing", "warning", {
        account: displayPayment(account),
      }));
    }
  }

  for (const [providerCode, count] of defaultsByProvider) {
    if (count > 1) {
      issues.push(issue("payment-default-duplicate", "error", { provider: providerCode }));
    }
  }
  for (const [providerCode, bindings] of groupPaymentsByProvider(input.integration.paymentAccounts)) {
    if (bindings.length > 1 && !bindings.some((binding) => binding.isDefault)) {
      issues.push(issue("payment-default-missing", "warning", { provider: providerCode }));
    }
  }

  const channels = [input.integration.officialAccount, input.integration.miniProgram]
    .filter((channel): channel is ApplicationChannelAccountBinding => channel !== undefined);
  for (const channel of channels) {
    const account = channelById.get(channel.id);
    if (!account || account.kind !== channel.resourceAccountKind) {
      issues.push(issue("channel-not-found", "warning", { channel: channel.displayName || channel.appId }));
      continue;
    }
    if (!channel.appId.trim()) {
      issues.push(issue("channel-app-id-missing", "error", { channel: channel.displayName }));
    }
    if (!account.enabled || (account.status !== undefined && account.status !== "active")) {
      issues.push(issue("channel-disabled", "error", { channel: channel.displayName }));
    }
    if (account.authorizationStatus !== undefined && account.authorizationStatus !== "authorized") {
      issues.push(issue("channel-unauthorized", "warning", { channel: channel.displayName }));
    }
  }

  const wechatChannels = channels.filter((channel) => isWechatProvider(channel.providerCode));
  const wechatPayAccounts = input.integration.paymentAccounts
    .map((binding) => paymentById.get(binding.id))
    .filter((account): account is ApplicationPaymentAccountOption =>
      account !== undefined && account.providerCode === "wechat_pay");
  const hasWechatPaymentCatalog = input.paymentAccounts.some(
    (account) => account.providerCode === "wechat_pay" && account.status === "active",
  );
  if (wechatChannels.length > 0 && hasWechatPaymentCatalog && wechatPayAccounts.length === 0) {
    issues.push(issue("wechat-payment-missing", "warning", {
      channel: wechatChannels.map((channel) => channel.displayName).join(" / "),
    }));
  }
  if (wechatChannels.length === 0 && wechatPayAccounts.length > 0) {
    issues.push(issue("wechat-channel-missing", "warning", { provider: "wechat_pay" }));
  }
  if (wechatChannels.length > 0) {
    const channelAppIds = new Set(wechatChannels.map((channel) => channel.appId));
    for (const account of wechatPayAccounts) {
      const providerAppId = readString(account.metadata.appId);
      if (providerAppId && !channelAppIds.has(providerAppId)) {
        issues.push(issue("wechat-app-id-mismatch", "warning", {
          account: displayPayment(account),
          appId: providerAppId,
          channelAppId: wechatChannels.map((channel) => channel.appId).join(" / "),
          channel: wechatChannels.map((channel) => channel.displayName).join(" / "),
        }));
      }
    }
  }

  return issues;
}

/** Builds a binding snapshot from a catalog option. */
export function toChannelBinding(
  option: ApplicationChannelAccountOption,
  kind: ApplicationChannelAccountBinding["resourceAccountKind"],
): ApplicationChannelAccountBinding {
  return {
    id: option.id,
    appId: option.appId,
    displayName: option.displayName,
    providerCode: option.providerCode,
    ...(option.accountType === undefined ? {} : { accountType: option.accountType }),
    resourceAccountKind: kind,
    enabled: option.enabled,
    ...(option.status === undefined ? {} : { status: option.status }),
    ...(option.authorizationStatus === undefined ? {} : { authorizationStatus: option.authorizationStatus }),
  };
}

/** Builds a binding snapshot from a catalog option. */
export function toPaymentBinding(
  option: ApplicationPaymentAccountOption,
  isDefault: boolean,
): ApplicationPaymentAccountBinding {
  return {
    id: option.id,
    accountNo: option.accountNo,
    ...(option.accountName === undefined ? {} : { accountName: option.accountName }),
    providerCode: option.providerCode,
    environment: option.environment,
    accountMode: option.accountMode,
    ...(option.settlementCurrency === undefined ? {} : { settlementCurrency: option.settlementCurrency }),
    ...(option.countryCode === undefined ? {} : { countryCode: option.countryCode }),
    isDefault,
  };
}

/** Human label for a payment account inside validation parameters. */
export function displayPayment(account: {
  accountName?: string;
  accountNo: string;
  providerCode: string;
}): string {
  return account.accountName?.trim() || account.accountNo || account.providerCode;
}

/** Groups payment bindings by provider code. */
export function groupPaymentsByProvider(
  accounts: readonly ApplicationPaymentAccountBinding[],
): Map<string, ApplicationPaymentAccountBinding[]> {
  const grouped = new Map<string, ApplicationPaymentAccountBinding[]>();
  for (const account of accounts) {
    const list = grouped.get(account.providerCode) ?? [];
    list.push(account);
    grouped.set(account.providerCode, list);
  }
  return grouped;
}

function issue(
  code: ApplicationIntegrationIssue["code"],
  severity: ApplicationIntegrationIssue["severity"],
  params?: Readonly<Record<string, string>>,
): ApplicationIntegrationIssue {
  return params === undefined ? { code, severity } : { code, severity, params };
}

function hasSubMerchant(metadata: Readonly<Record<string, unknown>>): boolean {
  return ["subAppId", "sub_appid", "subMchId", "sub_mch_id", "connectedAccountId", "stripeAccountId"]
    .some((key) => Boolean(readString(metadata[key])));
}

function isWechatProvider(providerCode: string): boolean {
  return providerCode.trim().toLowerCase().startsWith("wechat");
}

function normalizeEnvironmentIntegration(value: unknown): ApplicationEnvironmentIntegration {
  const record = asRecord(value);
  const officialAccount = normalizeChannelBinding(
    record.officialAccount ?? record.official_account,
    "official-account",
  );
  const miniProgram = normalizeChannelBinding(
    record.miniProgram ?? record.mini_program,
    "mini-program",
  );
  const rawPayments = Array.isArray(record.paymentAccounts)
    ? record.paymentAccounts
    : Array.isArray(record.payment_accounts)
      ? record.payment_accounts
      : [];
  return {
    ...(officialAccount === undefined ? {} : { officialAccount }),
    ...(miniProgram === undefined ? {} : { miniProgram }),
    paymentAccounts: rawPayments
      .map((payment) => normalizePaymentBinding(payment))
      .filter((payment): payment is ApplicationPaymentAccountBinding => payment !== undefined),
  };
}

function normalizeChannelBinding(
  value: unknown,
  kind: ApplicationChannelBindingKind,
): ApplicationChannelAccountBinding | undefined {
  const record = asRecord(value);
  const id = readString(record.id);
  if (!id) {
    return undefined;
  }
  const appId = readString(record.appId ?? record.app_id) ?? "";
  return {
    id,
    appId,
    displayName: readString(record.displayName ?? record.display_name) ?? appId ?? id,
    providerCode: readString(record.providerCode ?? record.provider_code) ?? "wechat",
    ...(readString(record.accountType ?? record.account_type) === undefined
      ? {}
      : { accountType: readString(record.accountType ?? record.account_type) }),
    resourceAccountKind: kind,
    enabled: readBoolean(record.enabled) ?? true,
    ...(readString(record.status) === undefined ? {} : { status: readString(record.status) }),
    ...(readString(record.authorizationStatus ?? record.authorization_status) === undefined
      ? {}
      : { authorizationStatus: readString(record.authorizationStatus ?? record.authorization_status) }),
  };
}

function normalizePaymentBinding(value: unknown): ApplicationPaymentAccountBinding | undefined {
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
    ...(settlementCurrency === undefined ? {} : { settlementCurrency }),
    ...(countryCode === undefined ? {} : { countryCode }),
    isDefault: readBoolean(record.isDefault ?? record.is_default) ?? false,
  };
}

function readLinkedApplications(value: unknown): LinkedApplicationRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const byKey = new Map<string, LinkedApplicationRef>();
  for (const entry of value) {
    const record = asRecord(entry);
    const groupId = readGroupId(record.groupId ?? record.group_id);
    const id = readString(record.id);
    if (!groupId || !id) {
      continue;
    }
    byKey.set(`${groupId}:${id}`, {
      groupId,
      id,
      ...(readString(record.reference) === undefined ? {} : { reference: readString(record.reference) }),
      ...(readString(record.name) === undefined ? {} : { name: readString(record.name) }),
    });
  }
  return [...byKey.values()];
}

function serializeDocument(document: ApplicationIntegrationDocument): Record<string, unknown> {
  const environments: Record<string, unknown> = {};
  for (const [key, integration] of Object.entries(document.environments)) {
    if (isEnvironmentIntegrationEmpty(integration)) {
      continue;
    }
    environments[key] = {
      ...(integration.officialAccount === undefined
        ? {}
        : { officialAccount: serializeChannelBinding(integration.officialAccount) }),
      ...(integration.miniProgram === undefined
        ? {}
        : { miniProgram: serializeChannelBinding(integration.miniProgram) }),
      paymentAccounts: integration.paymentAccounts.map((account) => ({
        id: account.id,
        accountNo: account.accountNo,
        ...(account.accountName === undefined ? {} : { accountName: account.accountName }),
        providerCode: account.providerCode,
        environment: account.environment,
        accountMode: account.accountMode,
        ...(account.settlementCurrency === undefined
          ? {}
          : { settlementCurrency: account.settlementCurrency }),
        ...(account.countryCode === undefined ? {} : { countryCode: account.countryCode }),
        isDefault: account.isDefault,
      })),
    };
  }
  return {
    schema: APPLICATION_INTEGRATION_SCHEMA,
    linkedApplications: document.linkedApplications.map((application) => ({
      groupId: application.groupId,
      id: application.id,
      ...(application.reference === undefined ? {} : { reference: application.reference }),
      ...(application.name === undefined ? {} : { name: application.name }),
    })),
    environments,
  };
}

function serializeChannelBinding(binding: ApplicationChannelAccountBinding): Record<string, unknown> {
  return {
    id: binding.id,
    appId: binding.appId,
    displayName: binding.displayName,
    providerCode: binding.providerCode,
    ...(binding.accountType === undefined ? {} : { accountType: binding.accountType }),
    resourceAccountKind: binding.resourceAccountKind,
    enabled: binding.enabled,
    ...(binding.status === undefined ? {} : { status: binding.status }),
    ...(binding.authorizationStatus === undefined
      ? {}
      : { authorizationStatus: binding.authorizationStatus }),
  };
}

type ApplicationChannelBindingKind = ApplicationChannelAccountBinding["resourceAccountKind"];

function readGroupId(value: unknown): ApplicationGroupId | undefined {
  return value === "iam" || value === "deploy" || value === "app-store" ? value : undefined;
}

function normalizeIdentifier(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
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
