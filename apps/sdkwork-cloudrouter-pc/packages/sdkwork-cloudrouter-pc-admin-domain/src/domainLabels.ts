/**
 * Status vocabulary for the Domain Center.
 *
 * The wire values are the deployment contract's own enums. Every label pair
 * carries the i18n key and its English fallback so a page renders a stable
 * label even before the central catalog loads, and the zh catalog can override
 * it without the page learning a second vocabulary.
 */

import type { DomainTone } from './components/domainUi';
import type {
  DomainCertificateArchiveStatus,
  DomainCertificateCaProfile,
  DomainCertificatePresentationMode,
  DomainCertificateScope,
  DomainCertificateSource,
  DomainCertificateStatus,
  DomainCertificateValidationMethod,
  DomainCloudAccount,
  DomainDnsRecordStatus,
  DomainDnsProvider,
  DomainHostnameType,
  DomainRenewalStatus,
  DomainValidityPhase,
  DomainVerificationFilePlatform,
  DomainVerificationStatus,
  DomainZoneScope,
  DomainZoneStatus,
} from './domainTypes';

export interface DomainLabel {
  key: string;
  fallback: string;
}

const label = (suffix: string, fallback: string): DomainLabel => ({
  key: `admin.domainCenter.status.${suffix}`,
  fallback,
});

export function zoneStatusLabel(status: DomainZoneStatus): DomainLabel {
  return status === 'ACTIVE' ? label('active', 'Active') : label('paused', 'Paused');
}

export function zoneStatusTone(status: DomainZoneStatus): DomainTone {
  return status === 'ACTIVE' ? 'success' : 'neutral';
}

export function zoneScopeLabel(scope: DomainZoneScope): DomainLabel {
  return scope === 'PLATFORM' ? label('platformScope', 'Platform') : label('userScope', 'Operator');
}

export function hostnameTypeLabel(type: DomainHostnameType): DomainLabel {
  return type === 'WILDCARD' ? label('wildcard', 'Wildcard') : label('exact', 'Exact');
}

export function verificationStatusLabel(status: DomainVerificationStatus): DomainLabel {
  switch (status) {
    case 'VERIFIED':
      return label('verified', 'Verified');
    case 'FAILED':
      return label('failed', 'Failed');
    case 'EXPIRED':
      return label('expired', 'Expired');
    default:
      return label('pending', 'Pending');
  }
}

export function verificationStatusTone(status: DomainVerificationStatus): DomainTone {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'EXPIRED':
      return 'warning';
    default:
      return 'warning';
  }
}

export function dnsRecordStatusLabel(status: DomainDnsRecordStatus): DomainLabel {
  return status === 'ENABLED' ? label('enabled', 'Enabled') : label('disabled', 'Paused');
}

export function dnsRecordStatusTone(status: DomainDnsRecordStatus): DomainTone {
  return status === 'ENABLED' ? 'success' : 'neutral';
}

export function certificateStatusLabel(status: DomainCertificateStatus): DomainLabel {
  switch (status) {
    case 'ACTIVE':
      return label('active', 'Active');
    case 'ISSUING':
      return label('issuing', 'Issuing');
    case 'EXPIRED':
      return label('expired', 'Expired');
    case 'FAILED':
      return label('failed', 'Failed');
    case 'REVOKED':
      return label('revoked', 'Revoked');
    default:
      return label('pending', 'Pending');
  }
}

export function certificateStatusTone(status: DomainCertificateStatus): DomainTone {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'ISSUING':
      return 'info';
    case 'EXPIRED':
      return 'danger';
    case 'FAILED':
      return 'danger';
    case 'REVOKED':
      return 'neutral';
    default:
      return 'warning';
  }
}

export function certificateSourceLabel(source: DomainCertificateSource): DomainLabel {
  return source === 'CUSTOM' ? label('customSource', 'Imported') : label('managedSource', 'Managed ACME');
}

export function certificateScopeLabel(scope: DomainCertificateScope): DomainLabel {
  return scope === 'WILDCARD' ? label('wildcardScope', 'Wildcard') : label('singleDomainScope', 'Single domain');
}

export function caProfileLabel(profile: DomainCertificateCaProfile): DomainLabel {
  switch (profile) {
    case 'LETS_ENCRYPT_STAGING':
      return label('caStaging', "Let's Encrypt staging");
    case 'CUSTOM':
      return label('caCustom', 'Custom CA');
    default:
      return label('caProduction', "Let's Encrypt");
  }
}

export function validationMethodLabel(method: DomainCertificateValidationMethod): DomainLabel {
  switch (method) {
    case 'HTTP_01':
      return label('http01', 'HTTP-01');
    case 'DNS_01':
      return label('dns01', 'DNS-01');
    default:
      return label('auto', 'Automatic');
  }
}

/**
 * Presentation mode, defaulted the way the deployments contract defaults it:
 * a certificate without the field was issued by a platform that presented the
 * challenge itself, so `MANAGED` is the honest reading of "absent".
 */
export function presentationModeLabel(
  mode: DomainCertificatePresentationMode | undefined,
): DomainLabel {
  return mode === 'MANUAL'
    ? label('presentationManual', 'Manual DNS')
    : label('presentationManaged', 'Automatic DNS');
}

export function archiveStatusLabel(status: DomainCertificateArchiveStatus | undefined): DomainLabel {
  switch (status) {
    case 'ARCHIVED':
      return label('archiveArchived', 'Archived to drive');
    case 'STORING':
      return label('archiveStoring', 'Archiving');
    case 'FAILED':
      return label('archiveFailed', 'Archive failed');
    case 'SKIPPED':
      return label('archiveSkipped', 'Archive skipped');
    case 'PENDING':
      return label('archivePending', 'Archive pending');
    default:
      return label('unknown', 'Unknown');
  }
}

export function renewalStatusLabel(status: DomainRenewalStatus): DomainLabel {
  switch (status) {
    case 'PLANNED':
      return label('renewalPlanned', 'Planned');
    case 'PROCESSING':
      return label('renewalProcessing', 'In progress');
    case 'FAILED':
      return label('renewalFailed', 'Renewal failed');
    default:
      return label('renewalNone', 'Not scheduled');
  }
}

export function renewalStatusTone(status: DomainRenewalStatus): DomainTone {
  switch (status) {
    case 'FAILED':
      return 'danger';
    case 'PROCESSING':
      return 'info';
    case 'PLANNED':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function validityPhaseLabel(phase: DomainValidityPhase | undefined): DomainLabel {
  switch (phase) {
    case 'NOT_YET_VALID':
      return label('notYetValid', 'Not yet valid');
    case 'EXPIRING_SOON':
      return label('expiringSoon', 'Expiring soon');
    case 'EXPIRED':
      return label('expired', 'Expired');
    case 'VALID':
      return label('valid', 'Valid');
    default:
      return label('unknown', 'Unknown');
  }
}

export function validityPhaseTone(phase: DomainValidityPhase | undefined): DomainTone {
  switch (phase) {
    case 'EXPIRING_SOON':
      return 'warning';
    case 'EXPIRED':
      return 'danger';
    case 'VALID':
      return 'success';
    case 'NOT_YET_VALID':
      return 'info';
    default:
      return 'neutral';
  }
}

export function dnsProviderLabelOf(provider: DomainDnsProvider | undefined): DomainLabel {
  switch (provider) {
    case 'ALIYUN_DNS':
      return label('aliyunDns', 'Aliyun DNS');
    case 'DNSPOD':
      return label('dnspod', 'DNSPod');
    case 'CLOUDFLARE':
      return label('cloudflare', 'Cloudflare');
    default:
      return label('providerDefault', 'Deployment default');
  }
}

export function cloudAccountStatusLabel(account: DomainCloudAccount): DomainLabel {
  if (account.status === 'disabled') {
    return label('disabled', 'Disabled');
  }
  if (account.status === 'archived') {
    return label('archived', 'Archived');
  }
  return label('active', 'Active');
}

export function cloudAccountStatusTone(account: DomainCloudAccount): DomainTone {
  if (account.status !== 'active') {
    return 'neutral';
  }
  return account.credentialConfigured ? 'success' : 'warning';
}

export function cloudAccountScopeLabel(scope: DomainCloudAccount['scopeType']): DomainLabel {
  switch (scope) {
    case 'platform':
      return label('platformScope', 'Platform');
    case 'user':
      return label('userScope', 'Mine');
    default:
      return label('tenantScope', 'Tenant');
  }
}

export function verificationFilePlatformLabel(platform: DomainVerificationFilePlatform): DomainLabel {
  switch (platform) {
    case 'WECHAT_OFFICIAL_ACCOUNT':
      return label('wechatOfficialAccount', 'WeChat official account');
    case 'WECHAT_MINI_PROGRAM':
      return label('wechatMiniProgram', 'WeChat mini program');
    case 'ALIPAY':
      return label('alipay', 'Alipay');
    case 'BYTEDANCE':
      return label('bytedance', 'ByteDance');
    case 'APPLE':
      return label('apple', 'Apple');
    case 'GOOGLE':
      return label('google', 'Google');
    default:
      return label('customPlatform', 'Custom');
  }
}

/** Translation helper type matching the i18next `t` used by the pages. */
export type DomainTranslate = (key: string, fallback: string) => string;

export function translateDomainLabel(t: DomainTranslate, value: DomainLabel): string {
  return t(value.key, value.fallback);
}
