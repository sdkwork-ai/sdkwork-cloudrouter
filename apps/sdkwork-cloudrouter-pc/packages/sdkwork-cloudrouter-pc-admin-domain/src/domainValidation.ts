/**
 * Input validation for the Domain Center.
 *
 * The control plane remains the authority: these checks only stop a request the
 * deployments domain contract would reject anyway, so an operator gets the
 * offending field before a round trip. They deliberately mirror the contract's
 * documented shapes (RFC 1035 labels, RFC 8555 challenge names, APEX-relative
 * `relativeName`, CAA value syntax) rather than inventing a second vocabulary.
 *
 * Every function returns a map of `field -> i18n key`; an empty map means valid.
 */

import type {
  CreateDomainCertificateInput,
  CreateDomainCloudAccountInput,
  CreateDomainDnsRecordInput,
  CreateDomainVerificationFileInput,
  CreateDomainZoneInput,
  DomainDnsRecordType,
  DomainZoneFiling,
  DomainZonePoliceFiling,
  DomainVerificationFilePlatform,
} from './domainTypes';
import {
  isValidCertificateIdentifier,
  normalizeCertificateIdentifier,
} from './domainCertificateIssuance';
import {
  DOMAIN_VERIFICATION_PLATFORMS,
  isServableVerificationFileName,
  platformAcceptsExtension,
  verificationFileExtension,
} from './domainVerificationPlatforms';

export type DomainFieldErrors = Record<string, string>;

export const DOMAIN_DNS_RECORD_TYPES: readonly DomainDnsRecordType[] = [
  'A',
  'AAAA',
  'CNAME',
  'TXT',
  'MX',
  'NS',
  'CAA',
];

/** The closed platform set, derived from the one catalog this console mirrors. */
export const DOMAIN_VERIFICATION_FILE_PLATFORMS: readonly DomainVerificationFilePlatform[] =
  DOMAIN_VERIFICATION_PLATFORMS.map((spec) => spec.platform);

/** Largest verification file the control plane stores, in UTF-8 bytes. */
export const DOMAIN_VERIFICATION_FILE_CONTENT_MAX = 4096;

const LABEL_PATTERN = /^[a-z0-9\u00a1-\uffff](?:[a-z0-9\u00a1-\uffff-]{0,61}[a-z0-9\u00a1-\uffff])?$/u;
const ASCII_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_OCTET_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_PATTERN = /^[0-9a-fA-F:]+$/;
const CAA_PATTERN = /^(\d{1,3})\s+(issue|issuewild|iodef)\s+"([^"\s]+)"$/i;
const ACCOUNT_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

const validationKey = (name: string): string => `admin.domainCenter.validation.${name}`;

function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

function stripTrailingDot(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

/**
 * Canonical apex form: lower-case, trailing dot removed. The control plane is
 * the authority on registrability, so this only removes presentation noise.
 */
export function normalizeApexHostname(value: string): string {
  return stripTrailingDot(value.trim().toLowerCase());
}

/** Canonical relative name form: trimmed, apostrophes (`@`) preserved verbatim. */
export function normalizeRelativeName(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidApexHostname(value: string): boolean {
  const candidate = normalizeApexHostname(value);
  if (candidate.length === 0 || candidate.length > 253) {
    return false;
  }
  if (candidate.includes('://') || /[/\\?#\s]/.test(candidate) || candidate.includes('*')) {
    return false;
  }
  const labels = candidate.split('.');
  if (labels.length < 2) {
    return false;
  }
  if (!labels.every((label) => LABEL_PATTERN.test(label))) {
    return false;
  }
  const tld = labels[labels.length - 1] ?? '';
  return tld.length >= 2;
}

export function isValidRelativeName(value: string): boolean {
  const candidate = normalizeRelativeName(value);
  if (candidate.length === 0 || candidate.length > 253) {
    return false;
  }
  if (candidate === '@' || candidate === '*') {
    return true;
  }
  const wildcard = candidate.startsWith('*.');
  const body = wildcard ? candidate.slice(2) : candidate;
  if (body.length === 0) {
    return false;
  }
  const labels = body.split('.');
  return labels.every((label) => ASCII_LABEL_PATTERN.test(label));
}

export function isValidDnsHostLabel(value: string): boolean {
  const candidate = normalizeRelativeName(value);
  if (candidate === '@' || candidate === '*') {
    return true;
  }
  if (candidate.includes('*')) {
    return false;
  }
  if (candidate.length === 0) {
    return false;
  }
  return candidate.split('.').every((label) => ASCII_LABEL_PATTERN.test(label));
}

export function isValidIpv4(value: string): boolean {
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every((part) => IPV4_OCTET_PATTERN.test(part));
}

export function isValidIpv6(value: string): boolean {
  const candidate = value.trim();
  if (candidate.length === 0 || !candidate.includes(':') || !IPV6_PATTERN.test(candidate)) {
    return false;
  }
  const groups = candidate.split(':');
  return groups.length >= 3 && groups.filter((group) => group.length > 0).length >= 2;
}

/** A DNS target is a domain name, optionally trailing-dotted. */
export function isValidDnsTarget(value: string): boolean {
  const candidate = stripTrailingDot(value.trim().toLowerCase());
  if (candidate.length === 0 || candidate.length > 253) {
    return false;
  }
  const labels = candidate.split('.');
  if (labels.length < 2) {
    return false;
  }
  return labels.every((label) => ASCII_LABEL_PATTERN.test(label));
}

/** `TTL` is optional (provider default); when present RFC 2181 range applies. */
export function parseTtlSeconds(value: string | number | undefined | null): number | null | undefined {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 60 || parsed > 86_400) {
    return null;
  }
  return parsed;
}

export function parsePriority(value: string | number | undefined | null): number | null | undefined {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    return null;
  }
  return parsed;
}

export interface DomainZoneForm {
  apexHostname: string;
  displayName: string;
  dnsProvider: string;
  providerAccountId: string;
}

export function validateZoneForm(form: DomainZoneForm): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (isBlank(form.apexHostname)) {
    errors.apexHostname = validationKey('required');
  } else if (!isValidApexHostname(form.apexHostname)) {
    errors.apexHostname = validationKey('invalidApexHostname');
  }
  if (form.displayName.trim().length > 128) {
    errors.displayName = validationKey('tooLong');
  }
  return errors;
}

export function toCreateZoneInput(form: DomainZoneForm): CreateDomainZoneInput {
  const input: CreateDomainZoneInput = { apexHostname: normalizeApexHostname(form.apexHostname) };
  if (!isBlank(form.displayName)) {
    input.displayName = form.displayName.trim();
  }
  if (!isBlank(form.dnsProvider)) {
    input.dnsProvider = form.dnsProvider.trim();
  }
  if (!isBlank(form.providerAccountId)) {
    input.providerAccountId = form.providerAccountId.trim();
  }
  return input;
}

export interface DomainZoneFilingForm {
  recordNumber: string;
  entityName: string;
  websiteName: string;
  reviewDate: string;
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateZoneFilingForm(
  form: DomainZoneFilingForm,
  today = localIsoDate(),
): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (form.recordNumber.trim().length > 64) {
    errors.recordNumber = validationKey('filingRecordNumberTooLong');
  }
  if (form.entityName.trim().length > 200) {
    errors.entityName = validationKey('filingEntityNameTooLong');
  }
  if (form.websiteName.trim().length > 200) {
    errors.websiteName = validationKey('filingWebsiteNameTooLong');
  }
  const reviewDate = form.reviewDate.trim();
  if (reviewDate && (!isValidIsoDate(reviewDate) || reviewDate > today)) {
    errors.reviewDate = validationKey('invalidFilingReviewDate');
  }
  return errors;
}

export function toZoneFilingInput(form: DomainZoneFilingForm): DomainZoneFiling {
  const filing: DomainZoneFiling = {};
  const recordNumber = form.recordNumber.trim();
  const entityName = form.entityName.trim();
  const websiteName = form.websiteName.trim();
  const reviewDate = form.reviewDate.trim();
  if (recordNumber) filing.recordNumber = recordNumber;
  if (entityName) filing.entityName = entityName;
  if (websiteName) filing.websiteName = websiteName;
  if (reviewDate) filing.reviewDate = reviewDate;
  return filing;
}

export interface DomainZonePoliceFilingForm {
  recordNumber: string;
  recordUrl: string;
}

export function isValidHttpUrl(value: string): boolean {
  if (!/^https?:\/\//iu.test(value) || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value) || /%(?![0-9a-f]{2})/iu.test(value)) {
    return false;
  }
  const remainder = value.slice(value.indexOf('://') + 3);
  const authorityEnd = remainder.search(/[/?#]/u);
  const authority = authorityEnd < 0 ? remainder : remainder.slice(0, authorityEnd);
  if (!authority || authority.startsWith('\\')) {
    return false;
  }
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function validateZonePoliceFilingForm(
  form: DomainZonePoliceFilingForm,
): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (form.recordNumber.trim().length > 64) {
    errors.recordNumber = validationKey('policeFilingRecordNumberTooLong');
  }
  const recordUrl = form.recordUrl.trim();
  if (recordUrl.length > 2048) {
    errors.recordUrl = validationKey('policeFilingRecordUrlTooLong');
  } else if (recordUrl && !isValidHttpUrl(recordUrl)) {
    errors.recordUrl = validationKey('invalidPoliceFilingRecordUrl');
  }
  return errors;
}

export function toZonePoliceFilingInput(form: DomainZonePoliceFilingForm): DomainZonePoliceFiling {
  const filing: DomainZonePoliceFiling = {};
  const recordNumber = form.recordNumber.trim();
  const recordUrl = form.recordUrl.trim();
  if (recordNumber) filing.recordNumber = recordNumber;
  if (recordUrl) filing.recordUrl = recordUrl;
  return filing;
}

export interface DomainDnsRecordForm {
  recordType: DomainDnsRecordType;
  host: string;
  recordValue: string;
  ttlSeconds: string;
  priority: string;
  recordLine: string;
}

export function validateDnsRecordForm(form: DomainDnsRecordForm): DomainFieldErrors {
  const errors: DomainFieldErrors = {};

  if (!DOMAIN_DNS_RECORD_TYPES.includes(form.recordType)) {
    errors.recordType = validationKey('invalidRecordType');
  }

  if (isBlank(form.host)) {
    errors.host = validationKey('required');
  } else if (!isValidDnsHostLabel(form.host)) {
    errors.host = validationKey('invalidDnsHost');
  }

  if (isBlank(form.recordValue)) {
    errors.recordValue = validationKey('required');
  } else {
    const value = form.recordValue.trim();
    switch (form.recordType) {
      case 'A':
        if (!isValidIpv4(value)) {
          errors.recordValue = validationKey('invalidIpv4');
        }
        break;
      case 'AAAA':
        if (!isValidIpv6(value)) {
          errors.recordValue = validationKey('invalidIpv6');
        }
        break;
      case 'CNAME':
      case 'NS':
        if (!isValidDnsTarget(value)) {
          errors.recordValue = validationKey('invalidDnsTarget');
        }
        break;
      case 'MX':
        if (!isValidDnsTarget(value)) {
          errors.recordValue = validationKey('invalidDnsTarget');
        }
        break;
      case 'TXT':
        if (value.length > 2048) {
          errors.recordValue = validationKey('txtTooLong');
        }
        break;
      case 'CAA': {
        const match = CAA_PATTERN.exec(value);
        const flags = match?.[1];
        if (!match || !flags || Number(flags) > 255) {
          errors.recordValue = validationKey('invalidCaa');
        }
        break;
      }
      default:
        break;
    }
  }

  const ttl = parseTtlSeconds(form.ttlSeconds);
  if (ttl === null) {
    errors.ttlSeconds = validationKey('invalidTtl');
  }

  const priority = parsePriority(form.priority);
  if (priority === null) {
    errors.priority = validationKey('invalidPriority');
  }
  if (form.recordType === 'MX' && priority === undefined) {
    errors.priority = validationKey('priorityRequired');
  }
  if (form.recordType !== 'MX' && priority !== undefined) {
    errors.priority = validationKey('priorityNotAllowed');
  }

  if (form.recordLine.trim().length > 128) {
    errors.recordLine = validationKey('tooLong');
  }

  return errors;
}

export function toDnsRecordInput(form: DomainDnsRecordForm): CreateDomainDnsRecordInput {
  const input: CreateDomainDnsRecordInput = {
    recordType: form.recordType,
    host: normalizeRelativeName(form.host),
    recordValue: form.recordValue.trim(),
  };
  const ttl = parseTtlSeconds(form.ttlSeconds);
  if (typeof ttl === 'number') {
    input.ttlSeconds = ttl;
  }
  const priority = parsePriority(form.priority);
  if (typeof priority === 'number') {
    input.priority = priority;
  }
  if (!isBlank(form.recordLine)) {
    input.recordLine = form.recordLine.trim();
  }
  return input;
}

export interface DomainCertificateForm {
  certName: string;
  /** Verified hostnames picked from the zone inventory (legacy submission shape). */
  domainIds: readonly string[];
  /**
   * Hostnames the operator typed. Sent as `requestedIdentifiers`, which the
   * control plane canonicalizes and requires to be verified hostnames of the
   * tenant. Exactly one of this and `domainIds` may be non-empty.
   */
  requestedIdentifiers: readonly string[];
  certificateScope: 'SINGLE_DOMAIN' | 'WILDCARD';
  validationMethod: 'AUTO' | 'HTTP_01' | 'DNS_01';
  /** `MANAGED` writes DNS-01 through a cloud account; `MANUAL` asks the operator to paste it. */
  presentationMode: 'MANAGED' | 'MANUAL';
  caProfile: 'LETS_ENCRYPT_STAGING' | 'LETS_ENCRYPT_PRODUCTION';
  preferredKeyAlgorithm: 'RSA' | 'ECDSA';
  autoRenew: boolean;
  renewBeforeDays: string;
  providerAccountId: string;
}

/**
 * Field keys in the order focus should visit them: the first error in this order
 * receives focus, so the operator lands on the field nearest the top instead of
 * on whichever object key happened to be written first.
 */
export const CERTIFICATE_FORM_FIELD_ORDER: readonly (keyof DomainCertificateForm)[] = [
  'certName',
  'requestedIdentifiers',
  'domainIds',
  'presentationMode',
  'certificateScope',
  'validationMethod',
  'caProfile',
  'preferredKeyAlgorithm',
  'providerAccountId',
  'renewBeforeDays',
  'autoRenew',
];

export function firstDomainFieldError(errors: DomainFieldErrors, order: readonly string[]): string | undefined {
  for (const field of order) {
    if (errors[field] !== undefined) {
      return field;
    }
  }
  return Object.keys(errors)[0];
}

export function validateCertificateForm(form: DomainCertificateForm): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (isBlank(form.certName)) {
    errors.certName = validationKey('required');
  } else if (form.certName.trim().length > 128) {
    errors.certName = validationKey('tooLong');
  }
  if (form.domainIds.length === 0 && form.requestedIdentifiers.length === 0) {
    // The typed list is the primary input now, so the message names it; the
    // verified-hostname picker fills the same slot.
    errors.requestedIdentifiers = validationKey('identifiersRequired');
  } else if (form.domainIds.length > 0 && form.requestedIdentifiers.length > 0) {
    errors.requestedIdentifiers = validationKey('identifiersAmbiguous');
  }
  const invalidIdentifier = form.requestedIdentifiers.find(
    (identifier) => !isValidCertificateIdentifier(identifier),
  );
  if (invalidIdentifier !== undefined) {
    errors.requestedIdentifiers = validationKey('invalidCertificateIdentifier');
  }
  const duplicate = duplicatedCertificateIdentifier(form.requestedIdentifiers);
  if (duplicate !== undefined) {
    errors.requestedIdentifiers = validationKey('duplicateCertificateIdentifier');
  }
  if (form.certificateScope === 'WILDCARD' && form.validationMethod === 'HTTP_01') {
    errors.validationMethod = validationKey('wildcardRequiresDns01');
  }
  if (form.presentationMode === 'MANUAL' && form.validationMethod === 'HTTP_01') {
    errors.validationMethod = validationKey('manualRequiresDns01');
  }
  const renewBefore = form.renewBeforeDays.trim();
  if (renewBefore.length > 0) {
    const parsed = Number(renewBefore);
    if (!Number.isInteger(parsed) || parsed < 7 || parsed > 90) {
      errors.renewBeforeDays = validationKey('invalidRenewBeforeDays');
    }
  }
  return errors;
}

function duplicatedCertificateIdentifier(
  identifiers: readonly string[],
): string | undefined {
  const seen = new Set<string>();
  for (const identifier of identifiers) {
    const key = normalizeCertificateIdentifier(identifier);
    if (seen.has(key)) {
      return identifier;
    }
    seen.add(key);
  }
  return undefined;
}

export function toCreateCertificateInput(form: DomainCertificateForm): CreateDomainCertificateInput {
  const typed = form.requestedIdentifiers.map((identifier) => normalizeCertificateIdentifier(identifier));
  return {
    certName: form.certName.trim(),
    // The two identifier shapes are exclusive in the contract: sending both is
    // an error, so the typed list wins when it is the one the operator used.
    domainIds: typed.length === 0 ? [...form.domainIds] : [],
    ...(typed.length === 0 ? {} : { requestedIdentifiers: typed }),
    certificateScope: form.certificateScope,
    validationMethod: form.validationMethod,
    challengePresentation: form.presentationMode,
    caProfile: form.caProfile,
    preferredKeyAlgorithm: form.preferredKeyAlgorithm,
    autoRenew: form.autoRenew,
    ...(form.renewBeforeDays.trim().length > 0
      ? { renewBeforeDays: Number(form.renewBeforeDays.trim()) }
      : {}),
    ...(isBlank(form.providerAccountId) ? {} : { providerAccountId: form.providerAccountId.trim() }),
  };
}

export interface DomainCloudAccountForm {
  displayName: string;
  accountCode: string;
  dnsProvider: 'ALIYUN_DNS' | 'DNSPOD' | 'CLOUDFLARE';
  scopeType: 'platform' | 'tenant' | 'user';
  environment: 'development' | 'sandbox' | 'production';
  isDefault: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  confirmsCredential: boolean;
}

/** Key-pair families need the public half; Cloudflare authenticates with a bearer token. */
export function dnsProviderNeedsAccessKeyId(provider: DomainCloudAccountForm['dnsProvider']): boolean {
  return provider === 'ALIYUN_DNS' || provider === 'DNSPOD';
}

export function validateCloudAccountForm(form: DomainCloudAccountForm): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (isBlank(form.displayName)) {
    errors.displayName = validationKey('required');
  } else if (form.displayName.trim().length > 128) {
    errors.displayName = validationKey('tooLong');
  }
  const accountCode = form.accountCode.trim();
  if (accountCode.length > 0 && !ACCOUNT_CODE_PATTERN.test(accountCode)) {
    errors.accountCode = validationKey('invalidAccountCode');
  }
  if (dnsProviderNeedsAccessKeyId(form.dnsProvider) && isBlank(form.accessKeyId)) {
    errors.accessKeyId = validationKey('required');
  }
  if (isBlank(form.secretAccessKey)) {
    errors.secretAccessKey = validationKey('required');
  }
  if (!form.confirmsCredential) {
    errors.confirmsCredential = validationKey('credentialConfirmationRequired');
  }
  return errors;
}

export function toCreateCloudAccountInput(
  form: DomainCloudAccountForm,
): CreateDomainCloudAccountInput {
  const input: CreateDomainCloudAccountInput = {
    displayName: form.displayName.trim(),
    dnsProvider: form.dnsProvider,
    scopeType: form.scopeType,
    environment: form.environment,
    secretAccessKey: form.secretAccessKey,
    confirmsCredential: true,
  };
  const accountCode = form.accountCode.trim();
  if (accountCode.length > 0) {
    input.accountCode = accountCode;
  }
  if (form.isDefault) {
    input.isDefault = true;
  }
  if (dnsProviderNeedsAccessKeyId(form.dnsProvider) && !isBlank(form.accessKeyId)) {
    input.accessKeyId = form.accessKeyId.trim();
  }
  return input;
}

export interface DomainVerificationFileForm {
  platform: DomainVerificationFilePlatform;
  fileName: string;
  content: string;
}

export function validateVerificationFileForm(form: DomainVerificationFileForm): DomainFieldErrors {
  const errors: DomainFieldErrors = {};
  if (!DOMAIN_VERIFICATION_FILE_PLATFORMS.includes(form.platform)) {
    errors.platform = validationKey('invalidPlatform');
  }
  const fileName = form.fileName.trim();
  if (isBlank(fileName)) {
    errors.fileName = validationKey('required');
  } else if (!isServableVerificationFileName(fileName)) {
    errors.fileName = validationKey('invalidVerificationFileName');
  } else if (!platformAcceptsExtension(form.platform, verificationFileExtension(fileName))) {
    // The platform only ever fetches its own shape; registering another one
    // would show "uploaded" and then never verify.
    errors.fileName = validationKey('verificationFilePlatformExtension');
  }
  if (isBlank(form.content)) {
    errors.content = validationKey('required');
  } else if (new TextEncoder().encode(form.content).length > DOMAIN_VERIFICATION_FILE_CONTENT_MAX) {
    errors.content = validationKey('tooLong');
  }
  return errors;
}

export function toVerificationFileInput(
  form: DomainVerificationFileForm,
): CreateDomainVerificationFileInput {
  return {
    platform: form.platform,
    fileName: form.fileName.trim(),
    content: form.content,
  };
}

/** True when a validation issue map has at least one field error. */
export function hasDomainFieldErrors(errors: DomainFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
