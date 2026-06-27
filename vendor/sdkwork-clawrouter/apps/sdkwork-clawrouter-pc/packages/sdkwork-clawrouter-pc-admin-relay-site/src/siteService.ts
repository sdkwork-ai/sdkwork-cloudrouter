import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  readApiRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readRequiredApiItems,
  readRequiredApiItem,
  requiredSafePathSegment,
  readRequiredString,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminSiteCreateRequest,
  AdminSiteUpdateRequest,
  MediaResource,
} from '@sdkwork/clawrouter-backend-sdk';

export interface SiteItem {
  id: string;
  siteCode: string;
  siteName: string;
  displayName: string;
  description: string | null;
  baseUrl: string;
  websiteUrl: string | null;
  docsUrl: string | null;
  logo: MediaResource | null;
  domains: string[];
  vendorCodes: string[];
  siteType: 'relay';
  ownerKind: string | null;
  regionCode: string | null;
  environment: 'production' | 'sandbox';
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  lastLatencyMs: number | null;
  consecutiveErrorCount: number;
  lastCheckedAt: string | null;
  lastSyncAt: string | null;
  sortOrder: number;
  status: 'active' | 'disabled';
}

export interface SiteCreateInput {
  siteName: string;
  displayName: string;
  description?: string | null;
  baseUrl: string;
  websiteUrl?: string | null;
  docsUrl?: string | null;
  logo?: MediaResource | null;
  domains?: string[];
  vendorCodes?: string[];
  siteType?: 'relay';
  ownerKind?: string | null;
  regionCode?: string | null;
  environment?: SiteItem['environment'];
  status?: SiteItem['status'];
  credentialRef?: string | null;
  maskedLabel?: string | null;
}

export interface SiteUpdateInput {
  siteCode?: string;
  siteName?: string;
  displayName?: string;
  description?: string | null;
  baseUrl?: string;
  websiteUrl?: string | null;
  docsUrl?: string | null;
  logo?: MediaResource | null;
  domains?: string[];
  vendorCodes?: string[];
  siteType?: 'relay';
  ownerKind?: string | null;
  regionCode?: string | null;
  environment?: SiteItem['environment'];
  status?: SiteItem['status'];
  credentialRef?: string | null;
  maskedLabel?: string | null;
}




export interface SiteChannelItem {
  id: string;
  channelCode: string;
  channelName: string;
  providerCode: string | null;
  siteCode: string | null;
  siteServiceCode: string | null;
  siteChannelRole: string | null;
  healthStatus: SiteItem['healthStatus'];
  status: SiteItem['status'];
}

export interface SiteConnectionCheckResult {
  siteId: string;
  status: 'success' | 'failed';
  healthStatus: SiteItem['healthStatus'];
  latencyMs: number | null;
  checkedAt: string;
  message: string | null;
}

export class SiteService {
  static async fetchSites(q?: string): Promise<SiteItem[]> {
    const result = await getClawRouterBackendSdkClient().sites.siteCatalog.list(q ? { q } : undefined);
    ensureSdkworkApiSuccess(result, 'Failed to fetch sites');
    return readRequiredApiItems(result, 'Failed to fetch sites')
      .map(normalizeSiteItem);
  }

  static async createSite(input: SiteCreateInput): Promise<SiteItem> {
    const result = await getClawRouterBackendSdkClient().sites.create(toSiteCreateRequest(input));
    ensureSdkworkApiSuccess(result, 'Failed to create site');
    return normalizeSiteItem(readRequiredApiItem(result, 'Failed to create site'));
  }

  static async updateSite(siteId: string, input: SiteUpdateInput): Promise<SiteItem> {
    const result = await getClawRouterBackendSdkClient().sites.update(
      requiredSafePathSegment(siteId, 'siteId'),
      toSiteUpdateRequest(input),
    );
    ensureSdkworkApiSuccess(result, 'Failed to update site');
    return normalizeSiteItem(readRequiredApiItem(result, 'Failed to update site'));
  }

  static async deleteSite(siteId: string): Promise<boolean> {
    const result = await getClawRouterBackendSdkClient().sites.delete(requiredSafePathSegment(siteId, 'siteId'));
    ensureSdkworkApiSuccess(result, 'Failed to delete site');
    return readBoolean(readApiRecord(result), 'deleted', false);
  }






  static async fetchSiteChannels(siteId: string): Promise<SiteChannelItem[]> {
    const result = await getClawRouterBackendSdkClient().sites.siteChannels.list(requiredSafePathSegment(siteId, 'siteId'));
    ensureSdkworkApiSuccess(result, 'Failed to fetch site channels');
    return readRequiredApiItems(result, 'Failed to fetch site channels')
      .map(normalizeSiteChannelItem);
  }

  static async testSiteConnection(siteId: string): Promise<SiteConnectionCheckResult> {
    const result = await getClawRouterBackendSdkClient().sites.testConnection.create(
      requiredSafePathSegment(siteId, 'siteId'),
      {},
    );
    ensureSdkworkApiSuccess(result, 'Failed to test site connection');
    return normalizeSiteConnectionCheckResult(readApiRecord(result));
  }

  static async healthCheckSite(siteId: string): Promise<SiteConnectionCheckResult> {
    const result = await getClawRouterBackendSdkClient().sites.healthCheck.create(
      requiredSafePathSegment(siteId, 'siteId'),
      {},
    );
    ensureSdkworkApiSuccess(result, 'Failed to health check site');
    return normalizeSiteConnectionCheckResult(readApiRecord(result));
  }
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readNullableNumber(item: ApiRecord, key: string): number | null {
  const value = item[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = readNumber(item, key, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNonNegativeInteger(item: ApiRecord, key: string, fallback: number): number {
  const value = item[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = readNumber(item, key, Number.NaN);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }
  return parsed;
}

function normalizeSiteItem(value: unknown): SiteItem {
  const item = readRequiredRecord(value, 'Site item must be an object');
  return {
    id: readRequiredString(item, 'id', 'Site id is required'),
    siteCode: readRequiredString(item, 'siteCode', 'Site code is required'),
    siteName: readRequiredString(item, 'siteName', 'Site name is required'),
    displayName: readRequiredString(item, 'displayName', 'Site display name is required'),
    description: readNullableString(item, 'description'),
    baseUrl: readRequiredString(item, 'baseUrl', 'Site base URL is required'),
    websiteUrl: readNullableString(item, 'websiteUrl'),
    docsUrl: readNullableString(item, 'docsUrl'),
    logo: readOptionalMediaResource(item, 'logo'),
    domains: readStringArray(item, 'domains'),
    vendorCodes: readStringArray(item, 'vendorCodes'),
    siteType: readSiteType(item),
    ownerKind: readNullableString(item, 'ownerKind'),
    regionCode: readNullableString(item, 'regionCode'),
    environment: readSiteEnvironment(item),
    healthStatus: readSiteHealthStatus(item),
    lastLatencyMs: readNullableNumber(item, 'lastLatencyMs'),
    consecutiveErrorCount: readNonNegativeInteger(item, 'consecutiveErrorCount', 0),
    lastCheckedAt: readNullableString(item, 'lastCheckedAt'),
    lastSyncAt: readNullableString(item, 'lastSyncAt'),
    sortOrder: readNonNegativeInteger(item, 'sortOrder', 100),
    status: readSiteStatus(item),
  };
}

function readOptionalMediaResource(item: ApiRecord, key: string): MediaResource | null {
  const value = item[key];
  if (!isRecord(value)) {
    return null;
  }
  const kind = readString(value, 'kind');
  const source = readString(value, 'source');
  if (!kind || !source) {
    return null;
  }
  return value as unknown as MediaResource;
}


function normalizeSiteChannelItem(value: unknown): SiteChannelItem {
  const item = readRequiredRecord(value, 'Site channel item must be an object');
  return {
    id: readRequiredString(item, 'id', 'Site channel id is required'),
    channelCode: readRequiredString(item, 'channelCode', 'Site channel code is required'),
    channelName: readRequiredString(item, 'channelName', 'Site channel name is required'),
    providerCode: readNullableString(item, 'providerCode'),
    siteCode: readNullableString(item, 'siteCode'),
    siteServiceCode: readNullableString(item, 'siteServiceCode'),
    siteChannelRole: readNullableString(item, 'siteChannelRole'),
    healthStatus: readSiteHealthStatus(item),
    status: readSiteStatus(item),
  };
}

function normalizeSiteConnectionCheckResult(value: unknown): SiteConnectionCheckResult {
  const item = readRequiredRecord(value, 'Site connection check result must be an object');
  return {
    siteId: readRequiredString(item, 'siteId', 'Site connection check site id is required'),
    status: readConnectionCheckStatus(item),
    healthStatus: readSiteHealthStatus(item),
    latencyMs: readNullableNumber(item, 'latencyMs'),
    checkedAt: readRequiredString(item, 'checkedAt', 'Site connection check timestamp is required'),
    message: readNullableString(item, 'message'),
  };
}

function toSiteCreateRequest(input: SiteCreateInput): AdminSiteCreateRequest {
  return {
    siteName: input.siteName,
    displayName: input.displayName,
    description: input.description ?? null,
    baseUrl: input.baseUrl,
    websiteUrl: input.websiteUrl ?? null,
    docsUrl: input.docsUrl ?? null,
    logo: input.logo ?? null,
    domains: input.domains ?? [],
    vendorCodes: input.vendorCodes ?? [],
    siteType: input.siteType ?? 'relay',
    ownerKind: input.ownerKind ?? null,
    regionCode: input.regionCode ?? null,
    environment: input.environment ?? 'production',
    status: input.status ?? 'active',
    credentialRef: input.credentialRef ?? null,
    maskedLabel: input.maskedLabel ?? null,
  };
}

function toSiteUpdateRequest(input: SiteUpdateInput): AdminSiteUpdateRequest {
  return {
    ...input,
    description: input.description ?? undefined,
    websiteUrl: input.websiteUrl ?? undefined,
    docsUrl: input.docsUrl ?? undefined,
    logo: input.logo ?? undefined,
    domains: input.domains ?? undefined,
    vendorCodes: input.vendorCodes ?? undefined,
    ownerKind: input.ownerKind ?? undefined,
    regionCode: input.regionCode ?? undefined,
    credentialRef: input.credentialRef ?? undefined,
    maskedLabel: input.maskedLabel ?? undefined,
  };
}



function readSiteType(item: ApiRecord): SiteItem['siteType'] {
  const value = readRequiredString(item, 'siteType', 'Site type is required');
  if (value === 'relay') {
    return value;
  }
  throw new Error(`Unsupported site type: ${value}`);
}

function readSiteEnvironment(item: ApiRecord): SiteItem['environment'] {
  const value = readRequiredString(item, 'environment', 'Site environment is required');
  if (value === 'production' || value === 'sandbox') {
    return value;
  }
  throw new Error(`Unsupported site environment: ${value}`);
}

function readSiteHealthStatus(item: ApiRecord): SiteItem['healthStatus'] {
  const value = readRequiredString(item, 'healthStatus', 'Site health status is required');
  if (value === 'unknown' || value === 'healthy' || value === 'degraded' || value === 'unhealthy') {
    return value;
  }
  throw new Error(`Unsupported site health status: ${value}`);
}

function readSiteStatus(item: ApiRecord): SiteItem['status'] {
  const value = readRequiredString(item, 'status', 'Site status is required');
  if (value === 'active' || value === 'disabled') {
    return value;
  }
  throw new Error(`Unsupported site status: ${value}`);
}

function readConnectionCheckStatus(item: ApiRecord): SiteConnectionCheckResult['status'] {
  const value = readRequiredString(item, 'status', 'Site connection check status is required');
  if (value === 'success' || value === 'failed') {
    return value;
  }
  throw new Error(`Unsupported site connection check status: ${value}`);
}
