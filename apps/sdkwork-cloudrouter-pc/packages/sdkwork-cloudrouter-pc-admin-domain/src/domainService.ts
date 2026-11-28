/**
 * Domain Center service boundary.
 *
 * Every call goes through the generated `@sdkwork/deployments-app-sdk` client:
 * the Domain Center never talks to a DNS provider or an ACME CA directly, and
 * never assembles raw HTTP. The deployments control plane owns credential
 * custody, provider dispatch, verification attempts, and certificate orders;
 * this surface only reads and commands that aggregate.
 */

import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import { getSdkworkDeploymentsAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { PageInfo } from '@sdkwork/deployments-app-sdk';

import type {
  CreateDomainCertificateInput,
  CreateDomainCloudAccountInput,
  CreateDomainDnsRecordInput,
  CreateDomainHostnameInput,
  CreateDomainVerificationFileInput,
  CreateDomainZoneInput,
  DomainCertificate,
  DomainCertificateArchiveRetryResult,
  DomainCertificateArtifact,
  DomainCertificateChallengePresentation,
  DomainCertificateChallengeReleaseResult,
  DomainCertificateRenewal,
  DomainCertificateResponse,
  DomainCloudAccount,
  DomainCloudAccountRegistration,
  DomainDnsRecord,
  DomainDnsRecordStatus,
  DomainDnsRecordType,
  DomainDnsSyncResult,
  DomainHostname,
  DomainVerificationFile,
  DomainVerificationFileCheck,
  DomainVerifyResult,
  DomainZone,
  UpdateDomainDnsRecordInput,
  UpdateDomainHostnameInput,
  UpdateDomainZoneInput,
} from './domainTypes';

/** Page size used by the explicit `listAll*` walks (dashboards and selectors). */
const PAGE_SIZE = 200;
const MAX_PAGES = 25;
/**
 * Page size of one interactive table page.
 *
 * Every Domain Center table asks for exactly one page (`PAGINATION_SPEC.md` §8),
 * so the default matches the footer's first option rather than the walk size.
 */
const TABLE_PAGE_SIZE = 20;

export interface DomainZoneListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'ACTIVE' | 'PAUSED';
  scope?: 'USER' | 'PLATFORM';
  providerAccountId?: string;
}

export interface DomainHostnameListParams {
  page?: number;
  pageSize?: number;
}

export interface DomainDnsRecordListParams {
  page?: number;
  pageSize?: number;
  hostnameId?: string;
  host?: string;
  recordType?: DomainDnsRecordType;
}

export interface DomainCloudAccountListParams {
  page?: number;
  pageSize?: number;
  dnsProvider?: 'ALIYUN_DNS' | 'DNSPOD' | 'CLOUDFLARE';
  scopeType?: 'platform' | 'tenant' | 'user';
  keyword?: string;
}

export interface DomainCertificateListParams {
  page?: number;
  pageSize?: number;
}

export interface DomainPage<T> {
  items: T[];
  pageInfo: PageInfo;
}

function client() {
  return getSdkworkDeploymentsAppSdkClient();
}

/**
 * The archive command resource of the generated certificate client.
 *
 * `retry` answers the retry result (`accepted` + the new `archiveStatus`), not
 * the certificate: the command re-arms the row and returns immediately, so the
 * console polls `retrieve` until the archive settles.
 */
interface SdkCertificateArchiveApi {
  retry(
    certificateId: string,
    params: { idempotencyKey: string },
  ): Promise<DomainCertificateArchiveRetryResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveCertificateArchiveApi(): SdkCertificateArchiveApi {
  const certificate: unknown = client().certificate;
  if (!isRecord(certificate)) {
    throw new DomainSdkCapabilityError('certificate');
  }
  const archive: unknown = certificate.archive;
  if (!isRecord(archive)) {
    throw new DomainSdkCapabilityError('certificate.archive');
  }
  const retry = archive.retry;
  if (typeof retry !== 'function') {
    throw new DomainSdkCapabilityError('certificate.archive.retry');
  }
  return archive as unknown as SdkCertificateArchiveApi;
}

/**
 * Raised when the applied `@sdkwork/deployments-app-sdk` does not carry an
 * operation this surface needs. Typed so the UI can say "the control plane
 * client is outdated" instead of surfacing a `TypeError` from a property read.
 */
export class DomainSdkCapabilityError extends Error {
  readonly capability: string;

  constructor(capability: string) {
    super(`deployments app SDK does not expose ${capability}`);
    this.name = 'DomainSdkCapabilityError';
    this.capability = capability;
  }
}

function requestOptionsOf(options: { signal?: AbortSignal }): { signal?: AbortSignal } {
  return options.signal ? { signal: options.signal } : {};
}

/**
 * Walks an offset page until the server says there is no more. Bounded so a
 * misbehaving `hasMore` cannot turn one admin page load into an unbounded loop.
 */
async function collectPages<T>(
  load: (page: number, pageSize: number) => Promise<DomainPage<T>>,
): Promise<T[]> {
  const collected: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await load(page, PAGE_SIZE);
    collected.push(...result.items);
    if (result.pageInfo.hasMore === false || result.items.length < PAGE_SIZE) {
      break;
    }
  }
  return collected;
}

export const domainCenterService = {
  // ---- Zones -------------------------------------------------------------

  async listZones(params: DomainZoneListParams = {}): Promise<DomainPage<DomainZone>> {
    const result = await client().domain.domainZones.list({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? TABLE_PAGE_SIZE,
      ...(params.keyword ? { keyword: params.keyword } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.providerAccountId ? { providerAccountId: params.providerAccountId } : {}),
    });
    return result;
  },

  async listAllZones(): Promise<DomainZone[]> {
    return collectPages((page, pageSize) =>
      client().domain.domainZones.list({ page, pageSize }),
    );
  },

  async retrieveZone(zoneId: string): Promise<DomainZone> {
    return client().domain.domainZones.retrieve(zoneId);
  },

  async createZone(input: CreateDomainZoneInput): Promise<DomainZone> {
    return client().domain.domainZones.create(input, createIdempotencyParams('domain-zone-create'));
  },

  async updateZone(zoneId: string, input: UpdateDomainZoneInput): Promise<DomainZone> {
    return client().domain.domainZones.update(zoneId, input);
  },

  async deleteZone(zoneId: string): Promise<void> {
    return client().domain.domainZones.delete(zoneId);
  },

  // ---- Hostnames ---------------------------------------------------------

  async listHostnames(
    zoneId: string,
    params: DomainHostnameListParams = {},
  ): Promise<DomainPage<DomainHostname>> {
    return client().domain.domainZones.hostnames.list(zoneId, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? TABLE_PAGE_SIZE,
    });
  },

  async listAllHostnames(zoneId: string): Promise<DomainHostname[]> {
    return collectPages((page, pageSize) =>
      client().domain.domainZones.hostnames.list(zoneId, { page, pageSize }),
    );
  },

  async createHostname(zoneId: string, input: CreateDomainHostnameInput): Promise<DomainHostname> {
    return client().domain.domainZones.hostnames.create(
      zoneId,
      input,
      createIdempotencyParams('domain-hostname-create'),
    );
  },

  async renameHostname(
    zoneId: string,
    hostnameId: string,
    input: UpdateDomainHostnameInput,
  ): Promise<DomainHostname> {
    return client().domain.domainZones.hostnames.update(zoneId, hostnameId, input);
  },

  async deleteHostname(zoneId: string, hostnameId: string): Promise<void> {
    return client().domain.domainZones.hostnames.delete(zoneId, hostnameId);
  },

  async verifyHostname(zoneId: string, hostnameId: string): Promise<DomainVerifyResult> {
    return client().domain.domainZones.hostnames.verify(
      zoneId,
      hostnameId,
      createIdempotencyParams('domain-hostname-verify'),
    );
  },

  // ---- DNS resolution ----------------------------------------------------

  async listDnsRecords(
    zoneId: string,
    params: DomainDnsRecordListParams = {},
  ): Promise<DomainPage<DomainDnsRecord>> {
    return client().domain.domainZones.dnsRecords.list(zoneId, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? TABLE_PAGE_SIZE,
      ...(params.hostnameId ? { hostnameId: params.hostnameId } : {}),
      ...(params.host ? { host: params.host } : {}),
      ...(params.recordType ? { recordType: params.recordType } : {}),
    });
  },

  async createDnsRecord(zoneId: string, input: CreateDomainDnsRecordInput): Promise<DomainDnsRecord> {
    return client().domain.domainZones.dnsRecords.create(
      zoneId,
      input,
      createIdempotencyParams('domain-dns-record-create'),
    );
  },

  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    input: UpdateDomainDnsRecordInput,
  ): Promise<DomainDnsRecord> {
    return client().domain.domainZones.dnsRecords.update(
      zoneId,
      recordId,
      input,
      createIdempotencyParams('domain-dns-record-update'),
    );
  },

  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    return client().domain.domainZones.dnsRecords.delete(
      zoneId,
      recordId,
      createIdempotencyParams('domain-dns-record-delete'),
    );
  },

  async setDnsRecordStatus(
    zoneId: string,
    recordId: string,
    recordStatus: DomainDnsRecordStatus,
  ): Promise<DomainDnsRecord> {
    return client().domain.domainZones.dnsRecords.status.update(
      zoneId,
      recordId,
      { enabled: recordStatus === 'ENABLED' },
      createIdempotencyParams('domain-dns-record-status'),
    );
  },

  async syncDnsRecords(zoneId: string): Promise<DomainDnsSyncResult> {
    return client().domain.domainZones.dnsRecords.sync(
      zoneId,
      createIdempotencyParams('domain-dns-record-sync'),
    );
  },

  // ---- Verification files ------------------------------------------------

  async listVerificationFiles(zoneId: string): Promise<DomainVerificationFile[]> {
    const result = await client().domain.domainZones.verificationFiles.list(zoneId);
    return result.items;
  },

  async createVerificationFile(
    zoneId: string,
    input: CreateDomainVerificationFileInput,
  ): Promise<DomainVerificationFile> {
    return client().domain.domainZones.verificationFiles.create(
      zoneId,
      input,
      createIdempotencyParams('domain-verification-file-create'),
    );
  },

  async deleteVerificationFile(zoneId: string, fileId: string): Promise<void> {
    return client().domain.domainZones.verificationFiles.delete(zoneId, fileId);
  },

  async checkVerificationFile(zoneId: string, fileId: string): Promise<DomainVerificationFileCheck> {
    return client().domain.domainZones.verificationFiles.check(zoneId, fileId);
  },

  // ---- Certificates ------------------------------------------------------

  async listCertificates(
    params: DomainCertificateListParams = {},
  ): Promise<DomainPage<DomainCertificate>> {
    return client().certificate.list({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? TABLE_PAGE_SIZE,
    });
  },

  async listAllCertificates(): Promise<DomainCertificate[]> {
    return collectPages((page, pageSize) => client().certificate.list({ page, pageSize }));
  },

  async retrieveCertificate(
    certificateId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<DomainCertificate> {
    return client().certificate.retrieve(certificateId, requestOptionsOf(options));
  },

  async retrieveCertificateArtifact(
    certificateId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<DomainCertificateArtifact> {
    return client().certificate.artifacts.retrieve(certificateId, requestOptionsOf(options));
  },

  async createCertificate(input: CreateDomainCertificateInput): Promise<DomainCertificate> {
    return client().certificate.create(
      input,
      createIdempotencyParams('domain-certificate-create'),
    );
  },

  async renewCertificate(certificateId: string): Promise<DomainCertificate> {
    return client().certificate.renew(
      certificateId,
      createIdempotencyParams('domain-certificate-renew'),
    );
  },

  async deleteCertificate(certificateId: string): Promise<void> {
    return client().certificate.delete(certificateId);
  },

  async listCertificateRenewals(certificateId: string): Promise<DomainCertificateRenewal[]> {
    const result = await client().certificate.renewals.list(certificateId, {
      page: 1,
      pageSize: PAGE_SIZE,
    });
    return result.items;
  },

  /** The manual DNS-01 instructions for a certificate's current order. */
  async retrieveCertificateChallenges(
    certificateId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<DomainCertificateChallengePresentation> {
    return client().certificate.challenges.list(certificateId, requestOptionsOf(options));
  },

  /** Records the operator's "I published the TXT records" command. */
  async verifyCertificateChallenges(
    certificateId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<DomainCertificateChallengeReleaseResult> {
    return client().certificate.challenges.verify(
      certificateId,
      createIdempotencyParams('domain-certificate-verify'),
      requestOptionsOf(options),
    );
  },

  /**
   * Re-arms the drive archive of an issued certificate (idempotent command).
   *
   * Asynchronous by contract: the command answers whether the row was queued and
   * the status it now carries. Callers re-read the certificate until
   * `archiveStatus` settles on `ARCHIVED` or `FAILED`; assuming this call means
   * "archived" is exactly the claim the archive read model exists to avoid.
   */
  async retryCertificateArchive(certificateId: string): Promise<DomainCertificateArchiveRetryResult> {
    const archive = resolveCertificateArchiveApi();
    return archive.retry(
      certificateId,
      createIdempotencyParams('domain-certificate-archive-retry'),
    );
  },

  /** `true` when the applied SDK really carries the archive retry command. */
  supportsCertificateArchiveRetry(): boolean {
    return resolveCertificateArchiveApi() !== undefined;
  },

  // ---- DNS automation accounts ------------------------------------------

  async listCloudAccounts(
    params: DomainCloudAccountListParams = {},
  ): Promise<DomainPage<DomainCloudAccount>> {
    return client().domain.cloudAccounts.list({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? TABLE_PAGE_SIZE,
      ...(params.dnsProvider ? { dnsProvider: params.dnsProvider } : {}),
      ...(params.scopeType ? { scopeType: params.scopeType } : {}),
      ...(params.keyword ? { keyword: params.keyword } : {}),
    });
  },

  async createCloudAccount(
    input: CreateDomainCloudAccountInput,
  ): Promise<DomainCloudAccountRegistration> {
    return client().domain.cloudAccounts.create(
      input,
      createIdempotencyParams('domain-cloud-account-create'),
    );
  },
} as const;
