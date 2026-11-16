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

export type {
  CertificateResponse as DomainCertificate,
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
