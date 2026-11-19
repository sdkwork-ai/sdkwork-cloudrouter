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
  ApplicationIntegrationBindings,
  ApplicationIntegrationDocument,
  ApplicationIntegrationIssue,
  ApplicationIntegrationSummary,
  ApplicationIntegrationValidationInput,
  ApplicationPaymentAccountBinding,
  ApplicationPaymentAccountOption,
  ApplicationResourceLinkRecord,
  BindableApplicationEnvironment,
  LinkedApplicationRef,
  PaymentAccountEnvironment,
} from "../types/application-integrations";
import {
  APPLICATION_INTEGRATION_METADATA_KEY,
  APPLICATION_INTEGRATION_SCHEMA,
} from "../types/application-integrations";
import {
  evaluateApplicationIntegrationReadiness,
  hasAnyIntegration,
  isBindableEnvironmentKey,
  matchesProviderPrefix,
  normalizeBindableEnvironmentKey,
  resolveApplicationIntegrationSurface,
} from "./application-integration-requirements";
import type { ApplicationGroupId, ApplicationRecord } from "../types/application-catalog";

/** The document an unconfigured application has. */
export function emptyApplicationIntegrationDocument(): ApplicationIntegrationDocument {
  return {
    schema: APPLICATION_INTEGRATION_SCHEMA,
    linkedApplications: [],
    environments: {},
    migratedEnvironments: [],
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
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      continue;
    }
    environments[normalizedKey] = normalizeEnvironmentIntegration(value);
  }
  return {
    schema: APPLICATION_INTEGRATION_SCHEMA,
    linkedApplications,
    environments,
    migratedEnvironments: readStringList(raw.migratedEnvironments ?? raw.migrated_environments),
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

/**
 * Records the legacy environment keys that were migrated to the authoritative
 * binding table.
 *
 * This is migration bookkeeping, not a binding authority: the legacy
 * `environments` body is preserved untouched, and the ledger only stops the
 * drawer from re-seeding an environment the operator has already cleared.
 */
export function writeApplicationIntegrationMigration(
  metadata: unknown,
  environments: readonly string[],
): Record<string, unknown> {
  const base = asRecord(metadata);
  const raw = asRecord(base[APPLICATION_INTEGRATION_METADATA_KEY]);
  const migrated = new Set(readStringList(raw.migratedEnvironments ?? raw.migrated_environments));
  for (const environment of environments) {
    const normalized = normalizeBindableEnvironmentKey(environment);
    if (normalized) {
      migrated.add(normalized);
    }
  }
  return {
    ...base,
    [APPLICATION_INTEGRATION_METADATA_KEY]: {
      ...raw,
      ...(raw.schema === undefined ? { schema: APPLICATION_INTEGRATION_SCHEMA } : {}),
      migratedEnvironments: [...migrated].sort(),
    },
  };
}

/**
 * Writes only the cross-system anchor, preserving every other key, including
 * the pre-migration `environments` document this console must not rewrite.
 *
 * Account bindings go to `deploy_application_resource_link`; the anchor is the
 * only application identity this console keeps on the Deploy metadata.
 */
export function writeApplicationIntegrationAnchor(
  metadata: unknown,
  linkedApplications: readonly LinkedApplicationRef[],
): Record<string, unknown> {
  const base = asRecord(metadata);
  const raw = asRecord(base[APPLICATION_INTEGRATION_METADATA_KEY]);
  const nextRaw: Record<string, unknown> = {
    ...raw,
    ...(raw.schema === undefined ? { schema: APPLICATION_INTEGRATION_SCHEMA } : {}),
    linkedApplications: linkedApplications.map((application) => ({
      groupId: application.groupId,
      id: application.id,
      ...(application.reference === undefined ? {} : { reference: application.reference }),
      ...(application.name === undefined ? {} : { name: application.name }),
    })),
  };
  return {
    ...base,
    [APPLICATION_INTEGRATION_METADATA_KEY]: nextRaw,
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
  appKind?: string,
): ApplicationIntegrationSummary | undefined {
  const document = readApplicationIntegrationDocument(metadata);
  return summarizeEnvironments(document.environments, deployAppId, linked, appKind);
}

/**
 * Groups authoritative resource-link rows into the per-environment view model.
 *
 * The catalog account id the operator picked lives in `metadata.accountId`
 * (new writes) or `metadata.sourceAccountId` (backfilled rows); the link row id
 * is not that id, so validation must use the stored snapshot id to resolve the
 * account in the loaded catalog.
 */
export function environmentIntegrationsFromResourceLinks(
  links: readonly ApplicationResourceLinkRecord[],
): Record<string, ApplicationEnvironmentIntegration> {
  const environments: Record<string, ApplicationEnvironmentIntegration> = {};
  for (const link of links) {
    const environment = link.environment.trim();
    if (!environment) {
      continue;
    }
    const current = environments[environment] ?? emptyEnvironmentIntegration();
    const next: ApplicationEnvironmentIntegration = {
      ...current,
      paymentAccounts: [...current.paymentAccounts],
    };
    if (link.resourceKind === "official_account") {
      next.officialAccount = channelBindingFromResourceLink(link, "official-account");
    } else if (link.resourceKind === "mini_program") {
      next.miniProgram = channelBindingFromResourceLink(link, "mini-program");
    } else if (link.resourceKind === "payment_account") {
      next.paymentAccounts.push(paymentBindingFromResourceLink(link));
    }
    environments[environment] = next;
  }
  return environments;
}

/** Builds the drawer view from authority rows plus the legacy read-only seed. */
export function applicationIntegrationBindingsFromResourceLinks(
  links: readonly ApplicationResourceLinkRecord[],
  legacyMetadata?: Record<string, unknown>,
): ApplicationIntegrationBindings {
  const fromAuthority = environmentIntegrationsFromResourceLinks(links);
  const legacy = readApplicationIntegrationDocument(legacyMetadata);
  const migrated = new Set(legacy.migratedEnvironments ?? []);
  const legacySeeded: Record<string, ApplicationEnvironmentIntegration> = {};
  for (const [environment, integration] of Object.entries(legacy.environments)) {
    // The authority wins. An environment absent from the table is seeded from
    // the legacy document only until this console has migrated it; the ledger
    // prevents a deliberately cleared environment from being resurrected.
    if (
      fromAuthority[environment] === undefined
      && !migrated.has(environment)
      && !isEnvironmentIntegrationEmpty(integration)
    ) {
      legacySeeded[environment] = integration;
    }
  }
  return {
    environments: { ...legacySeeded, ...fromAuthority },
    legacySeed: Object.keys(legacySeeded).length > 0,
    links,
  };
}

/** Summary derived from authoritative rows. */
export function summarizeApplicationIntegrationBindings(
  bindings: ApplicationIntegrationBindings,
  deployAppId: string,
  linked: boolean,
  appKind?: string,
): ApplicationIntegrationSummary | undefined {
  return summarizeEnvironments(bindings.environments, deployAppId, linked, appKind);
}

function summarizeEnvironments(
  environments: Record<string, ApplicationEnvironmentIntegration>,
  deployAppId: string,
  linked: boolean,
  appKind?: string,
): ApplicationIntegrationSummary | undefined {
  let officialAccountCount = 0;
  let miniProgramCount = 0;
  let paymentAccountCount = 0;
  let environmentCount = 0;
  let firstConfigured: ApplicationEnvironmentIntegration | undefined;
  for (const integration of Object.values(environments)) {
    if (isEnvironmentIntegrationEmpty(integration)) {
      continue;
    }
    environmentCount += 1;
    firstConfigured ??= integration;
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
  const summary: ApplicationIntegrationSummary = {
    deployAppId,
    linked,
    environmentCount,
    officialAccountCount,
    miniProgramCount,
    paymentAccountCount,
  };
  if (appKind && firstConfigured) {
    const readiness = evaluateApplicationIntegrationReadiness({ appKind, integration: firstConfigured });
    summary.readiness = {
      autoLogin: readiness.autoLogin.status,
      checkout: readiness.checkout.status,
    };
  }
  return summary;
}

/** One `apps.resourceLinks.update` upsert. */
export interface ApplicationResourceLinkUpsert {
  environment: BindableApplicationEnvironment;
  resourceKind: "mini_program" | "official_account" | "payment_account";
  resourceRef: string;
  providerCode?: string;
  isDefault?: boolean;
  bindingStatus: "ACTIVE";
  metadata: Record<string, unknown>;
}

/** One `apps.resourceLinks.delete`. */
export interface ApplicationResourceLinkDelete {
  id: string;
}

export interface ApplicationResourceLinkChangeSet {
  deletes: ApplicationResourceLinkDelete[];
  upserts: ApplicationResourceLinkUpsert[];
}

/**
 * Diffs one environment's edited view against the authoritative rows.
 *
 * A single-instance kind is addressed by `(environment, kind)`, so a changed
 * AppID is an update, not a second row. A payment account is addressed by
 * `(environment, kind, resourceRef)`, so a different merchant account is a new
 * row and a removed one becomes a soft delete.
 */
export function buildResourceLinkChangeSet(input: {
  environment: string;
  integration: ApplicationEnvironmentIntegration;
  existingLinks: readonly ApplicationResourceLinkRecord[];
}): ApplicationResourceLinkChangeSet {
  const environment = normalizeBindableEnvironmentKey(input.environment);
  if (!environment) {
    // The drawer blocks this before saving; the transport must not turn a
    // non-lifecycle key into a request the Deploy API would reject.
    throw new Error(`environment ${input.environment} cannot carry account bindings`);
  }
  const { integration } = input;
  const existing = input.existingLinks.filter(
    (link) => link.environment.trim().toLowerCase() === environment,
  );
  const deletes: ApplicationResourceLinkDelete[] = [];
  const upserts: ApplicationResourceLinkUpsert[] = [];

  const existingOfficial = existing.find((link) => link.resourceKind === "official_account");
  if (integration.officialAccount) {
    if (!existingOfficial || bindingDiffers(existingOfficial, integration.officialAccount)) {
      upserts.push(channelUpsert(environment, integration.officialAccount));
    }
  } else if (existingOfficial) {
    deletes.push({ id: existingOfficial.id });
  }

  const existingMini = existing.find((link) => link.resourceKind === "mini_program");
  if (integration.miniProgram) {
    if (!existingMini || bindingDiffers(existingMini, integration.miniProgram)) {
      upserts.push(channelUpsert(environment, integration.miniProgram));
    }
  } else if (existingMini) {
    deletes.push({ id: existingMini.id });
  }

  const existingPayments = new Map(
    existing
      .filter((link) => link.resourceKind === "payment_account")
      .map((link) => [link.resourceRef, link]),
  );
  const desiredPayments = new Set(integration.paymentAccounts.map((account) => account.accountNo));
  for (const [resourceRef, link] of existingPayments) {
    if (!desiredPayments.has(resourceRef)) {
      deletes.push({ id: link.id });
    }
  }
  for (const account of integration.paymentAccounts) {
    const current = existingPayments.get(account.accountNo);
    if (!current || current.isDefault !== account.isDefault || current.providerCode !== account.providerCode) {
      upserts.push(paymentUpsert(environment, account));
    }
  }
  return { deletes, upserts };
}

/** True when the stored row no longer matches the edited binding. */
function bindingDiffers(
  link: ApplicationResourceLinkRecord,
  binding: ApplicationChannelAccountBinding,
): boolean {
  const metadata = link.metadata;
  const storedAppId = readString(metadata.appId);
  const storedDisplayName = readString(metadata.displayName);
  return link.resourceRef !== binding.appId
    || (link.providerCode ?? undefined) !== binding.providerCode
    || (storedAppId !== undefined && storedAppId !== binding.appId)
    || (storedDisplayName !== undefined && storedDisplayName !== binding.displayName)
    || binding.enabled !== (link.bindingStatus.toUpperCase() === "ACTIVE");
}

function channelUpsert(
  environment: BindableApplicationEnvironment,
  binding: ApplicationChannelAccountBinding,
): ApplicationResourceLinkUpsert {
  return {
    bindingStatus: "ACTIVE",
    environment,
    metadata: {
      accountId: binding.id,
      appId: binding.appId,
      displayName: binding.displayName,
      providerCode: binding.providerCode,
      ...(binding.accountType === undefined ? {} : { accountType: binding.accountType }),
      ...(binding.status === undefined ? {} : { status: binding.status }),
      ...(binding.authorizationStatus === undefined
        ? {}
        : { authorizationStatus: binding.authorizationStatus }),
      source: "sdkwork-application-center",
    },
    providerCode: binding.providerCode,
    resourceKind: binding.resourceAccountKind === "official-account" ? "official_account" : "mini_program",
    resourceRef: binding.appId,
  };
}

function paymentUpsert(
  environment: BindableApplicationEnvironment,
  account: ApplicationPaymentAccountBinding,
): ApplicationResourceLinkUpsert {
  return {
    bindingStatus: "ACTIVE",
    environment,
    ...(account.isDefault ? { isDefault: true } : {}),
    metadata: {
      accountId: account.id,
      ...(account.accountName === undefined ? {} : { accountName: account.accountName }),
      accountMode: account.accountMode,
      environment: account.environment,
      ...(account.settlementCurrency === undefined
        ? {}
        : { settlementCurrency: account.settlementCurrency }),
      ...(account.countryCode === undefined ? {} : { countryCode: account.countryCode }),
      source: "sdkwork-application-center",
    },
    ...(account.providerCode ? { providerCode: account.providerCode } : {}),
    resourceKind: "payment_account",
    resourceRef: account.accountNo,
  };
}

function channelBindingFromResourceLink(
  link: ApplicationResourceLinkRecord,
  kind: "mini-program" | "official-account",
): ApplicationChannelAccountBinding {
  const metadata = link.metadata;
  return {
    id: readString(metadata.accountId ?? metadata.sourceAccountId) ?? link.id,
    appId: link.resourceRef,
    displayName: readString(metadata.displayName) ?? readString(metadata.appId) ?? link.resourceRef,
    providerCode: link.providerCode ?? readString(metadata.providerCode) ?? "wechat",
    ...(readString(metadata.accountType) === undefined
      ? {}
      : { accountType: readString(metadata.accountType) }),
    resourceAccountKind: kind,
    enabled: link.bindingStatus.trim().toUpperCase() === "ACTIVE",
    ...(readString(metadata.status ?? metadata.accountStatus) === undefined
      ? {}
      : { status: readString(metadata.status ?? metadata.accountStatus) }),
    ...(readString(metadata.authorizationStatus) === undefined
      ? {}
      : { authorizationStatus: readString(metadata.authorizationStatus) }),
  };
}

function paymentBindingFromResourceLink(link: ApplicationResourceLinkRecord): ApplicationPaymentAccountBinding {
  const metadata = link.metadata;
  return {
    id: readString(metadata.accountId ?? metadata.sourceAccountId) ?? link.id,
    accountNo: link.resourceRef,
    ...(readString(metadata.accountName) === undefined
      ? {}
      : { accountName: readString(metadata.accountName) }),
    providerCode: link.providerCode ?? readString(metadata.providerCode) ?? "unknown",
    // The backfill stores the provider environment under `paymentEnvironment`;
    // new console writes use `environment`.
    environment: readString(metadata.paymentEnvironment ?? metadata.environment) ?? link.environment,
    accountMode: readString(metadata.accountMode) ?? "direct",
    ...(readString(metadata.settlementCurrency) === undefined
      ? {}
      : { settlementCurrency: readString(metadata.settlementCurrency) }),
    ...(readString(metadata.countryCode) === undefined
      ? {}
      : { countryCode: readString(metadata.countryCode) }),
    isDefault: link.isDefault,
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
  // IAM installs one tenant application per deploy application and stores the
  // anchor itself. `iam_application_installation.deploy_application_id` is the
  // **decimal** `deploy_app.id`, not the public uuid, so compare it with the
  // Deploy row's decimal identity first and keep the uuid as a tolerant
  // fallback for hosts that mirror the public id.
  if (record.deployApplicationId) {
    const anchored = deployApplications.find(
      (application) => application.deployApplicationId === record.deployApplicationId,
    ) ?? deployApplications.find(
      (application) => application.id === record.deployApplicationId,
    );
    if (anchored) {
      return anchored;
    }
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
  const surface = resolveApplicationIntegrationSurface(input.appKind);
  const paymentById = new Map(input.paymentAccounts.map((account) => [account.id, account]));
  const channelById = new Map(input.channelAccounts.map((account) => [account.id, account]));
  const paymentIds = new Set<string>();
  const defaultsByProvider = new Map<string, number>();

  if (!isBindableEnvironmentKey(input.environment)) {
    // Deploy can register extra environment keys, but a resource-link row only
    // exists on a fleet lifecycle value. Explaining the limit is better than a
    // 400 from the write.
    issues.push(issue("environment-not-bindable", "error", { environment: input.environment || "-" }));
  }

  // The IAM installation and the Deploy app describe the same endpoint through
  // two different vocabularies. `deploy_application_id` makes them comparable,
  // and a silent disagreement is exactly the kind of governance defect this
  // screen exists to surface.
  const expectedIamType = expectedIamApplicationType(surface.id);
  const registeredIamType = input.iamApplicationType?.trim().toLowerCase();
  if (
    expectedIamType
    && registeredIamType
    && registeredIamType !== "other"
    && registeredIamType !== expectedIamType
  ) {
    issues.push(issue("application-type-mismatch", "warning", {
      expected: expectedIamType,
      registered: registeredIamType,
      surface: surface.id,
    }));
  }

  for (const binding of input.integration.paymentAccounts) {
    if (paymentIds.has(binding.id)) {
      issues.push(issue("payment-duplicate", "error", { account: displayPayment(binding) }));
      continue;
    }
    paymentIds.add(binding.id);
    if (binding.isDefault) {
      defaultsByProvider.set(binding.providerCode, (defaultsByProvider.get(binding.providerCode) ?? 0) + 1);
    }
    if (!surface.paymentApplies) {
      issues.push(issue("payment-not-used-by-app-kind", "error", {
        account: displayPayment(binding),
        surface: surface.id,
      }));
    }
    if (!matchesProviderPrefix(binding.providerCode, surface.paymentProviderPrefixes)) {
      issues.push(issue("payment-provider-incompatible", "error", {
        account: displayPayment(binding),
        provider: binding.providerCode,
        surface: surface.id,
      }));
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
    if (surface.channelKinds.length === 0) {
      issues.push(issue(
        "account-not-used-by-app-kind",
        // An API service can never act as a channel account; a native app with
        // a stale channel binding is only a warning because it is harmless.
        surface.id === "api" ? "error" : "warning",
        {
          account: channel.displayName || channel.appId,
          surface: surface.id,
        },
      ));
    } else if (!surface.channelKinds.includes(channel.resourceAccountKind)) {
      issues.push(issue("account-not-used-by-app-kind", "error", {
        account: channel.displayName || channel.appId,
        surface: surface.id,
      }));
    }
    // A Douyin surface cannot act as a WeChat account (and vice versa). An
    // unknown app kind stays permissive so legacy rows keep loading.
    if (surface.id !== "unknown" && !matchesProviderPrefix(channel.providerCode, surface.channelProviderPrefixes)) {
      issues.push(issue("account-not-used-by-app-kind", "error", {
        account: channel.displayName || channel.appId,
        provider: channel.providerCode,
        surface: surface.id,
      }));
    }
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
  // WeChat Pay only needs an openid-bearing channel (official account / mini
  // program AppID) on the JSAPI surfaces. PC uses native/QR pay and the native
  // mobile kinds use App pay, so their merchant AppID is an open-platform
  // identity and must not be compared with the channel AppID. An unknown or
  // legacy kind keeps the stricter check so legacy rows are not silently
  // under-reported.
  const wechatJsapiChannelExpected = surface.id === "unknown"
    || surface.id === "h5"
    || surface.id === "wechat-mini-program"
    || surface.id === "web-legacy";
  if (wechatJsapiChannelExpected && wechatChannels.length > 0 && hasWechatPaymentCatalog && wechatPayAccounts.length === 0) {
    issues.push(issue("wechat-payment-missing", "warning", {
      channel: wechatChannels.map((channel) => channel.displayName).join(" / "),
    }));
  }
  if (wechatJsapiChannelExpected && wechatChannels.length === 0 && wechatPayAccounts.length > 0) {
    issues.push(issue("wechat-channel-missing", "warning", { provider: "wechat_pay" }));
  }
  if (wechatJsapiChannelExpected && wechatChannels.length > 0) {
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

  // The remaining findings describe commercial readiness rather than broken
  // rows, so they are warnings: an operator may legitimately bind payment
  // before the channel account is approved. An empty environment is untouched
  // state and is not nagged about.
  if (hasAnyIntegration(input.integration)) {
    for (const requirement of surface.requires) {
      if (!requirementPresent(requirement, input.integration)) {
        issues.push(issue("required-integration-missing", "warning", {
          requirement,
          surface: surface.id,
        }));
      }
    }
    const autoLoginRequirement = surface.autoLogin === "official-account"
      ? "official-account"
      : surface.autoLogin === "mini-program"
        ? "mini-program"
        : undefined;
    if (
      autoLoginRequirement
      && !requirementPresent(autoLoginRequirement, input.integration)
      // A required channel already reports the same gap; do not repeat it as
      // an auto-login warning.
      && !surface.requires.includes(autoLoginRequirement)
    ) {
      issues.push(issue("auto-login-not-configured", "warning", {
        requirement: autoLoginRequirement,
        surface: surface.id,
      }));
    }
    const missingCheckoutChannel = surface.requires.some(
      (requirement) => requirement !== "payment-account"
        && !requirementPresent(requirement, input.integration),
    );
    if (
      surface.checkout
      && input.integration.paymentAccounts.length > 0
      && missingCheckoutChannel
    ) {
      issues.push(issue("checkout-not-ready", "warning", {
        surface: surface.id,
      }));
    }
  }

  return issues;
}

function requirementPresent(
  requirement: "mini-program" | "official-account" | "payment-account",
  integration: ApplicationEnvironmentIntegration,
): boolean {
  switch (requirement) {
    case "official-account":
      return Boolean(integration.officialAccount);
    case "mini-program":
      return Boolean(integration.miniProgram);
    case "payment-account":
      return integration.paymentAccounts.length > 0;
  }
}

/** The IAM `applicationType` that corresponds to one Deploy surface. */
export function expectedIamApplicationType(
  surfaceId: ReturnType<typeof resolveApplicationIntegrationSurface>["id"],
): string | undefined {
  switch (surfaceId) {
    case "api":
      return "api";
    case "h5":
      return "h5";
    case "pc":
      return "pc";
    case "web-legacy":
      // A legacy static/SPA kind can be either the PC or the H5 surface, so it
      // cannot contradict an IAM registration without a false positive.
      return undefined;
    case "wechat-mini-program":
    case "douyin-mini-program":
      return "miniprogram";
    case "flutter":
      return "flutter";
    case "ios":
      return "ios";
    case "android":
      return "android";
    case "harmonyos":
      return "harmonyos";
    case "desktop":
      return "desktop";
    case "unknown":
      return undefined;
  }
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
    ...(document.migratedEnvironments && document.migratedEnvironments.length > 0
      ? { migratedEnvironments: [...document.migratedEnvironments] }
      : {}),
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

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value
    .map((entry) => readString(entry)?.toLowerCase())
    .filter((entry): entry is string => entry !== undefined))];
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
