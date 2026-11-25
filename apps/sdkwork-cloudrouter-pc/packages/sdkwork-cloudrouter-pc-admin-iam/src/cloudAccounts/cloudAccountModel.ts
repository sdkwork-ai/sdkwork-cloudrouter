import {
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES,
  IAM_CLOUD_ACCOUNT_SCOPE_LEVELS,
  extractSdkWorkListItems,
  extractSdkWorkListPage,
  iamCloudAccountCredentialFields,
  iamCloudAccountCredentialKindFields,
  iamCloudAccountTypeCredentialKind,
  resolveIamCloudAccountManageableScopeLevels,
  type IamCloudAccountCredentialField,
  type IamCloudAccountScopeLevel,
  type SdkWorkPageInfo,
} from '@sdkwork/iam-contracts';

/**
 * Cloud account (IAM provider account center) view model.
 *
 * The Cloud Router admin does not own the cloud account center: the platform
 * IAM service publishes it at `/backend/v3/api/iam/provider_accounts` and holds
 * the encrypted credential envelopes. This module is the thin projection the
 * admin page needs — it parses the route's camelCase projections, derives the
 * create/update/credential request bodies, and answers the label keys a
 * localized table renders. It performs no I/O, so it stays unit-testable
 * without a browser or a backend.
 *
 * Field names follow `crates/sdkwork-routes-iam-backend-api/src/provider_accounts.rs`
 * (`account_to_json` / `credential_to_json`). Neither projection carries secret
 * bytes: `credentialConfigured` / `credentialCount` and the credential's
 * `maskedLabel` / `secretFingerprint` are the only credential facts a listing
 * exposes.
 */

export interface CloudAccountRecord {
  id: string;
  uuid?: string;
  tenantId?: string;
  organizationId?: string;
  scopeType: string;
  ownerUserId?: string;
  vendorCode: string;
  accountCode: string;
  displayName: string;
  accountType?: string;
  environment?: string;
  externalAccountId?: string;
  capabilityCodes: readonly string[];
  regionCode?: string;
  isDefault: boolean;
  status?: string;
  version?: string;
  credentialConfigured: boolean;
  credentialCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudAccountCredentialRecord {
  id: string;
  providerAccountId: string;
  credentialKind?: string;
  credentialName?: string;
  maskedLabel?: string;
  secretFingerprint?: string;
  status?: string;
  expiresAt?: string;
  lastRotatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudAccountPage {
  items: CloudAccountRecord[];
  pageInfo?: SdkWorkPageInfo;
  total: number;
}

export interface CloudAccountDraft {
  vendorCode: string;
  accountCode: string;
  displayName: string;
  scopeType: IamCloudAccountScopeLevel;
  accountType: string;
  environment: string;
  regionCode: string;
  externalAccountId: string;
  capabilityCodes: readonly string[];
  isDefault: boolean;
}

export interface CloudAccountCredentialDraft {
  credentialKind: string;
  credentialName: string;
  accessKeyId: string;
  secretAccessKey: string;
  secretText: string;
  sessionToken: string;
  expiresAt: string;
}

export type CloudAccountDraftField = 'vendorCode' | 'accountCode' | 'displayName';

/** Mirror of `validate_vendor_code` in the IAM provider account service. */
export const CLOUD_ACCOUNT_VENDOR_CODE_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
/** Mirror of `validate_account_code` in the IAM provider account service. */
export const CLOUD_ACCOUNT_CODE_PATTERN = /^[a-z0-9][a-z0-9_.-]{1,63}$/;

const KNOWN_VENDOR_CODES: ReadonlySet<string> = new Set<string>(IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES);
const KNOWN_CREDENTIAL_KINDS: ReadonlySet<string> = new Set<string>(IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS);
const DEFAULT_CREDENTIAL_KIND = 'access_key_pair';
const DEFAULT_CREDENTIAL_NAME = 'default';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function asOptionalText(value: unknown): string | undefined {
  const text = asText(value);
  return text.length > 0 ? text : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asText(entry))
    .filter((entry) => entry.length > 0);
}

function asCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(asText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

/** Parse one row of the provider-account listing projection. */
export function toCloudAccountRecord(value: unknown): CloudAccountRecord | undefined {
  const row = asRecord(value);
  const id = asText(row.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    uuid: asOptionalText(row.uuid),
    tenantId: asOptionalText(row.tenantId),
    organizationId: asOptionalText(row.organizationId),
    scopeType: asText(row.scopeType),
    ownerUserId: asOptionalText(row.ownerUserId),
    vendorCode: asText(row.vendorCode),
    accountCode: asText(row.accountCode),
    displayName: asText(row.displayName),
    accountType: asOptionalText(row.accountType),
    environment: asOptionalText(row.environment),
    externalAccountId: asOptionalText(row.externalAccountId),
    capabilityCodes: asStringList(row.capabilityCodes),
    regionCode: asOptionalText(row.regionCode),
    isDefault: asBoolean(row.isDefault),
    status: asOptionalText(row.status),
    version: asOptionalText(row.version),
    credentialConfigured: asBoolean(row.credentialConfigured),
    credentialCount: asCount(row.credentialCount),
    createdAt: asOptionalText(row.createdAt),
    updatedAt: asOptionalText(row.updatedAt),
  };
}

/** Parse one row of the credential listing projection (never carries secrets). */
export function toCloudAccountCredentialRecord(
  value: unknown,
): CloudAccountCredentialRecord | undefined {
  const row = asRecord(value);
  const id = asText(row.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    providerAccountId: asText(row.providerAccountId),
    credentialKind: asOptionalText(row.credentialKind),
    credentialName: asOptionalText(row.credentialName),
    maskedLabel: asOptionalText(row.maskedLabel),
    secretFingerprint: asOptionalText(row.secretFingerprint),
    status: asOptionalText(row.status),
    expiresAt: asOptionalText(row.expiresAt),
    lastRotatedAt: asOptionalText(row.lastRotatedAt),
    createdAt: asOptionalText(row.createdAt),
    updatedAt: asOptionalText(row.updatedAt),
  };
}

function readTotal(pageInfo: SdkWorkPageInfo | undefined, fallback: number): number {
  if (pageInfo === undefined) {
    return fallback;
  }
  const parsed = Number(pageInfo.totalItems);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Parse a list response (`{ items, pageInfo }`) into the page view model. */
export function parseCloudAccountPage(value: unknown): CloudAccountPage {
  const page = extractSdkWorkListPage<unknown>(value);
  const items = page.items
    .map(toCloudAccountRecord)
    .filter((item): item is CloudAccountRecord => item !== undefined);
  return {
    items,
    ...(page.pageInfo !== undefined ? { pageInfo: page.pageInfo } : {}),
    total: readTotal(page.pageInfo, items.length),
  };
}

/** Parse a credential list response; the route answers `{ items }` without page info. */
export function parseCloudAccountCredentials(value: unknown): CloudAccountCredentialRecord[] {
  return extractSdkWorkListItems<unknown>(value)
    .map(toCloudAccountCredentialRecord)
    .filter((item): item is CloudAccountCredentialRecord => item !== undefined);
}

/**
 * The ownership levels the signed-in operator may act on.
 *
 * Delegated to the IAM contract so the page never restates the server's two
 * gates (`manage_shared` widens to organization/tenant; the platform tenant is
 * the only one that may publish a globally resolvable default).
 */
export function readableCloudAccountScopeLevels(
  permissionScope: readonly string[],
  tenantId?: string,
): readonly IamCloudAccountScopeLevel[] {
  return resolveIamCloudAccountManageableScopeLevels(permissionScope, {
    surface: 'admin',
    ...(tenantId !== undefined && tenantId.trim().length > 0 ? { tenantId } : {}),
  });
}

/** Known providers are the ones the IAM picker publishes; unknown codes still render. */
export function cloudAccountVendorLabelKey(vendorCode: string): string | undefined {
  const code = normalizeCode(vendorCode);
  return KNOWN_VENDOR_CODES.has(code) ? `admin.iam.cloudAccounts.vendors.${code}` : undefined;
}

export function cloudAccountScopeLabelKey(scopeType: string): string {
  return `admin.iam.cloudAccounts.scopes.${normalizeCode(scopeType) || 'user'}`;
}

export function cloudAccountStatusLabelKey(status: string): string {
  return `admin.iam.cloudAccounts.statuses.${normalizeCode(status) || 'active'}`;
}

export function cloudAccountTypeLabelKey(accountType: string): string {
  return `admin.iam.cloudAccounts.accountTypes.${normalizeCode(accountType) || 'long_term_key'}`;
}

export function cloudAccountEnvironmentLabelKey(environment: string): string {
  return `admin.iam.cloudAccounts.environments.${normalizeCode(environment) || 'production'}`;
}

export function cloudAccountCapabilityLabelKey(capabilityCode: string): string {
  return `admin.iam.cloudAccounts.capabilities.${normalizeCode(capabilityCode)}`;
}

export function cloudAccountCredentialKindLabelKey(kind: string): string {
  return `admin.iam.cloudAccounts.credentialKinds.${normalizeCode(kind) || DEFAULT_CREDENTIAL_KIND}`;
}

export function cloudAccountCredentialStatusLabelKey(status: string): string {
  return `admin.iam.cloudAccounts.credentialStatuses.${normalizeCode(status) || 'active'}`;
}

export function cloudAccountCredentialFieldLabelKey(field: IamCloudAccountCredentialField): string {
  return `admin.iam.cloudAccounts.credentialFields.${field}`;
}

/** Credential kind an identity shape is entered with, if it stores a secret here. */
export function cloudAccountCredentialKindForType(accountType: string): string | undefined {
  return iamCloudAccountTypeCredentialKind(normalizeCode(accountType));
}

/** Credential fields a draft of this identity shape must collect. */
export function cloudAccountRequiredCredentialFields(
  accountType: string,
): readonly IamCloudAccountCredentialField[] {
  return iamCloudAccountCredentialFields(normalizeCode(accountType));
}

/** Credential fields a chosen credential kind collects when kind is chosen directly. */
export function cloudAccountCredentialKindFields(
  kind: string,
): readonly IamCloudAccountCredentialField[] {
  return iamCloudAccountCredentialKindFields(normalizeCode(kind));
}

export function isKnownCloudAccountCredentialKind(kind: string): boolean {
  return KNOWN_CREDENTIAL_KINDS.has(normalizeCode(kind));
}

export function isValidCloudAccountVendorCode(value: string): boolean {
  return CLOUD_ACCOUNT_VENDOR_CODE_PATTERN.test(value.trim().toLowerCase());
}

export function isValidCloudAccountCode(value: string): boolean {
  return CLOUD_ACCOUNT_CODE_PATTERN.test(value.trim().toLowerCase());
}

export function isValidCloudAccountDisplayName(value: string): boolean {
  const name = value.trim();
  return name.length > 0 && [...name].length <= 128;
}

/** Required draft fields that are empty. */
export function missingCloudAccountDraftFields(draft: CloudAccountDraft): CloudAccountDraftField[] {
  const missing: CloudAccountDraftField[] = [];
  if (draft.vendorCode.trim().length === 0) {
    missing.push('vendorCode');
  }
  if (draft.accountCode.trim().length === 0) {
    missing.push('accountCode');
  }
  if (draft.displayName.trim().length === 0) {
    missing.push('displayName');
  }
  return missing;
}

/** Filled draft fields whose shape the server would reject. */
export function invalidCloudAccountDraftFields(draft: CloudAccountDraft): CloudAccountDraftField[] {
  const invalid: CloudAccountDraftField[] = [];
  if (
    draft.vendorCode.trim().length > 0
    && !isValidCloudAccountVendorCode(draft.vendorCode)
  ) {
    invalid.push('vendorCode');
  }
  if (
    draft.accountCode.trim().length > 0
    && !isValidCloudAccountCode(draft.accountCode)
  ) {
    invalid.push('accountCode');
  }
  if (
    draft.displayName.trim().length > 0
    && !isValidCloudAccountDisplayName(draft.displayName)
  ) {
    invalid.push('displayName');
  }
  return invalid;
}

function readCredentialFieldValue(
  draft: CloudAccountCredentialDraft,
  field: IamCloudAccountCredentialField,
): string {
  switch (field) {
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID:
      return draft.accessKeyId.trim();
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET:
      return draft.secretAccessKey.trim();
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT:
      return draft.secretText.trim();
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN:
      return draft.sessionToken.trim();
    default:
      return '';
  }
}

/** Whether every field the identity shape declares carries a value. */
export function isCloudAccountCredentialDraftComplete(
  draft: CloudAccountCredentialDraft,
  accountType: string,
): boolean {
  const fields = cloudAccountRequiredCredentialFields(accountType);
  return fields.length > 0 && fields.every((field) => readCredentialFieldValue(draft, field).length > 0);
}

/** Whether every field the chosen credential kind declares carries a value. */
export function isCloudAccountCredentialKindDraftComplete(
  draft: CloudAccountCredentialDraft,
): boolean {
  const fields = cloudAccountCredentialKindFields(draft.credentialKind);
  return fields.length > 0 && fields.every((field) => readCredentialFieldValue(draft, field).length > 0);
}

/**
 * Whether an expiry input can be handed to the route.
 *
 * The input is a `datetime-local` control (or an empty string), while the
 * service parses RFC3339, so the value is normalized when the body is built.
 * An unparseable value is a form error rather than a silently dropped field —
 * a credential that should expire but never does is the worse outcome.
 */
export function isValidCloudAccountCredentialExpiry(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || !Number.isNaN(new Date(trimmed).getTime());
}

export function emptyCloudAccountCredentialDraft(kind?: string): CloudAccountCredentialDraft {
  return {
    credentialKind: kind ?? DEFAULT_CREDENTIAL_KIND,
    credentialName: DEFAULT_CREDENTIAL_NAME,
    accessKeyId: '',
    secretAccessKey: '',
    secretText: '',
    sessionToken: '',
    expiresAt: '',
  };
}

/** The create request. Absent optional keys are omitted, never sent as `null`. */
export function buildCloudAccountCreateBody(draft: CloudAccountDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    vendorCode: draft.vendorCode.trim().toLowerCase(),
    accountCode: draft.accountCode.trim().toLowerCase(),
    displayName: draft.displayName.trim(),
    scopeType: draft.scopeType,
    accountType: normalizeCode(draft.accountType),
    environment: normalizeCode(draft.environment),
  };
  const regionCode = draft.regionCode.trim();
  if (regionCode.length > 0) {
    body.regionCode = regionCode;
  }
  const externalAccountId = draft.externalAccountId.trim();
  if (externalAccountId.length > 0) {
    body.externalAccountId = externalAccountId;
  }
  if (draft.capabilityCodes.length > 0) {
    body.capabilityCodes = [...draft.capabilityCodes];
  }
  if (draft.isDefault) {
    body.isDefault = true;
  }
  return body;
}

/**
 * The update request.
 *
 * `vendorCode` / `accountCode` / `scopeType` are immutable on this route, so
 * they never appear in a PATCH body. Empty optional text is omitted rather than
 * sent as an empty string: the service reads a blank value as "not provided",
 * so sending one would pretend to clear a field it keeps.
 */
export function buildCloudAccountUpdateBody(draft: CloudAccountDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    displayName: draft.displayName.trim(),
    accountType: normalizeCode(draft.accountType),
    environment: normalizeCode(draft.environment),
  };
  const regionCode = draft.regionCode.trim();
  if (regionCode.length > 0) {
    body.regionCode = regionCode;
  }
  const externalAccountId = draft.externalAccountId.trim();
  if (externalAccountId.length > 0) {
    body.externalAccountId = externalAccountId;
  }
  body.capabilityCodes = [...draft.capabilityCodes];
  return body;
}

/** Credential write body. Sending it again for the same slot rotates it. */
export function buildCloudAccountCredentialBody(
  draft: CloudAccountCredentialDraft,
): Record<string, unknown> {
  const kind = normalizeCode(draft.credentialKind);
  const fields = iamCloudAccountCredentialKindFields(kind);
  const body: Record<string, unknown> = {
    credentialKind: kind,
    credentialName: draft.credentialName.trim() || DEFAULT_CREDENTIAL_NAME,
  };
  for (const field of fields) {
    const value = readCredentialFieldValue(draft, field);
    switch (field) {
      case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID:
        body.accessKeyId = value;
        break;
      case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET:
        body.secretAccessKey = value;
        break;
      case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT:
        body.secretText = value;
        break;
      case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN:
        body.sessionToken = value;
        break;
      default:
        break;
    }
  }
  const expiresAt = draft.expiresAt.trim();
  if (expiresAt.length > 0) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      body.expiresAt = parsed.toISOString();
    }
  }
  return body;
}

/** Scope-level labels in resolution order (narrowest first), as the contract defines it. */
export const CLOUD_ACCOUNT_SCOPE_ORDER: readonly IamCloudAccountScopeLevel[] = IAM_CLOUD_ACCOUNT_SCOPE_LEVELS;
