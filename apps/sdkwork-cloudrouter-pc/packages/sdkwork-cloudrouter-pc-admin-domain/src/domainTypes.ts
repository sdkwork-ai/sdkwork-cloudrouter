/**
 * Domain Center view types.
 *
 * The Domain Center does not own a domain control plane of its own. It presents
 * the authoritative `sdkwork-deployments` domain contract (`deploy_domain`,
 * `deploy_dns_zone`, `deploy_domain_dns_record`, `deploy_certificate`) through
 * the generated `@sdkwork/deployments-app-sdk` client, so the management UI and
 * the deployment engine can never disagree about a zone, a hostname, a record,
 * or a certificate. This module only aliases those contract types under the
 * names the admin surface uses.
 */

import type {
  CertificateArchiveRetryResult,
  CertificateArtifactResponse,
  CertificateChallengePresentationList,
  CertificateChallengePresentationResponse,
  CertificateChallengeReleaseResult,
  CertificateResponse,
} from '@sdkwork/deployments-app-sdk';

export type {
  CertificateRenewalResponse as DomainCertificateRenewal,
  CloudAccountRegistrationResponse as DomainCloudAccountRegistration,
  CloudAccountResponse as DomainCloudAccount,
  CreateCertificateRequest as CreateDomainCertificateInput,
  CreateCloudAccountRequest as CreateDomainCloudAccountInput,
  CreateDomainDnsRecordRequest as CreateDomainDnsRecordInput,
  CreateDomainHostnameRequest as CreateDomainHostnameInput,
  CreateDomainVerificationFileRequest as CreateDomainVerificationFileInput,
  CreateDomainZoneRequest as CreateDomainZoneInput,
  DomainDnsRecordResponse as DomainDnsRecord,
  DomainDnsRecordStatusRequest as DomainDnsRecordStatusInput,
  DomainDnsSyncResponse as DomainDnsSyncResult,
  DomainHostnameResponse as DomainHostname,
  DomainZoneFiling as DomainZoneFiling,
  DomainZonePoliceFiling as DomainZonePoliceFiling,
  DomainVerificationFileCheckResponse as DomainVerificationFileCheck,
  DomainVerificationFileResponse as DomainVerificationFile,
  DomainVerifyResponse as DomainVerifyResult,
  DomainZoneResponse as DomainZone,
  UpdateDomainDnsRecordRequest as UpdateDomainDnsRecordInput,
  UpdateDomainHostnameRequest as UpdateDomainHostnameInput,
  UpdateDomainZoneRequest as UpdateDomainZoneInput,
} from '@sdkwork/deployments-app-sdk';

export type DomainZoneStatus = 'ACTIVE' | 'PAUSED';
export type DomainZoneScope = 'USER' | 'PLATFORM';
export type DomainHostnameStatus = 'ACTIVE' | 'PAUSED';
export type DomainHostnameType = 'EXACT' | 'WILDCARD';
export type DomainVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export type DomainDnsProvider = 'ALIYUN_DNS' | 'DNSPOD' | 'CLOUDFLARE';
export type DomainDnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'CAA';
export type DomainDnsRecordStatus = 'ENABLED' | 'DISABLED';
export type DomainCertificateStatus = 'PENDING' | 'ISSUING' | 'ACTIVE' | 'EXPIRED' | 'FAILED' | 'REVOKED';
export type DomainCertificateSource = 'MANAGED' | 'CUSTOM';
export type DomainCertificateScope = 'SINGLE_DOMAIN' | 'WILDCARD';
export type DomainCertificateCaProfile = 'LETS_ENCRYPT_STAGING' | 'LETS_ENCRYPT_PRODUCTION' | 'CUSTOM';
export type DomainCertificateValidationMethod = 'AUTO' | 'HTTP_01' | 'DNS_01';
export type DomainCertificateKeyAlgorithm = 'RSA' | 'ECDSA';

/**
 * Who publishes and withdraws the ACME challenge response.
 *
 * `@sdkwork/deployments-app-sdk` is the authority (`CertificateResponse.presentationMode`
 * and `CreateCertificateRequest.challengePresentation` both use this closed
 * set); these aliases only name it for this surface.
 */
export type DomainCertificatePresentationMode =
  CertificateResponse['presentationMode'];

/**
 * Whether the issued leaf is (being) stored in the tenant drive space.
 *
 * `NONE` means the version was never issued, so nothing could be archived yet;
 * it is reported distinctly from `SKIPPED`, which means this deployment does not
 * archive at all.
 */
export type DomainCertificateArchiveStatus =
  CertificateResponse['archiveStatus'];

/**
 * Certificate row as the admin surface consumes it.
 *
 * A straight alias of the generated type: the SDK is the single authority for
 * the certificate read model, including `presentationMode` and the archive
 * fields, so this surface never declares a second copy of the wire shape.
 */
export type DomainCertificateResponse = CertificateResponse;

/** The certificate row this admin surface reads and renders. */
export type DomainCertificate = DomainCertificateResponse;

/**
 * `GET /app/v3/api/certificates/{certificateId}/challenges` item: one manual
 * DNS-01 record an operator has to publish.
 *
 * The record value is a public ACME proof, so echoing it exposes nothing DNS
 * itself does not.
 */
export type DomainCertificateChallenge = CertificateChallengePresentationResponse;

/** `GET .../challenges` payload: the manual presentation of the current order. */
export type DomainCertificateChallengePresentation = CertificateChallengePresentationList;

/** `POST .../challenge/verify` result: `false` is a retry, not an error. */
export type DomainCertificateChallengeReleaseResult = CertificateChallengeReleaseResult;

/**
 * `POST .../archive/retry` result.
 *
 * The command re-arms the archive row and answers immediately, so `accepted`
 * says the row was queued — not that the files are in Drive. `archiveStatus` is
 * the status the row carries after the command; callers poll the certificate
 * until it settles on `ARCHIVED` or `FAILED`.
 */
export type DomainCertificateArchiveRetryResult = CertificateArchiveRetryResult;

/** `GET .../artifact` result: public PEM bundle encoded as a ZIP. */
export type DomainCertificateArtifact = CertificateArtifactResponse;

export type DomainRenewalStatus = 'NONE' | 'PLANNED' | 'PROCESSING' | 'FAILED';
export type DomainValidityPhase = 'NOT_YET_VALID' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
export type DomainVerificationFilePlatform =
  | 'WECHAT_OFFICIAL_ACCOUNT'
  | 'WECHAT_MINI_PROGRAM'
  | 'ALIPAY'
  | 'BYTEDANCE'
  | 'APPLE'
  | 'GOOGLE'
  | 'CUSTOM';

/** The six operator surfaces of the Domain Center. */
export type DomainCenterSectionId = 'overview' | 'zones' | 'hostnames' | 'dns' | 'certificates' | 'accounts';

/** What the overview needs, computed once from the authoritative lists. */
export interface DomainOverviewSummary {
  zoneTotal: number;
  zoneActive: number;
  zonePaused: number;
  platformZones: number;
  hostnameTotal: number;
  hostnameVerified: number;
  hostnamePending: number;
  dnsAccountUsable: number;
  dnsAccountTotal: number;
  certificateTotal: number;
  certificateActive: number;
  certificateExpiringSoon: number;
  certificateExpired: number;
  certificateRenewalFailed: number;
  attentionCount: number;
}

export type DomainAttentionKind =
  | 'unverifiedZone'
  | 'pausedZone'
  | 'pendingHostnames'
  | 'certificateExpiring'
  | 'certificateExpired'
  | 'certificateRenewalFailed';

export interface DomainAttentionItem {
  kind: DomainAttentionKind;
  /** Stable identifier used as the React key. */
  id: string;
  /** The zone, hostname, or certificate name the operator must act on. */
  subject: string;
  /** Optional human hint, e.g. `12 days until expiry`. */
  detail?: string;
  /** The Domain Center section that owns the remediation. */
  section: DomainCenterSectionId;
}
