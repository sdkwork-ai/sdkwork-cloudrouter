import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AdminAuthSettingsUpdateRequest, AdminFirewallRuleCreateRequest, AdminIpLimitCreateRequest, AdminModelLimitCreateRequest, AdminRuntimeRegionSettingsUpdateRequest, AdminServiceNodeCreateRequest, AdminServiceNodeStatusUpdateRequest, AdminServiceNodeUpdateRequest, AdminSiteSettingsUpdateRequest, AdminTokenLimitCreateRequest, AnalyticsAdminOverviewRetrieveResult, AuthSettingsRetrieveResult, AuthSettingsUpdateResult, CacheInstancesDeleteResult, CacheInstancesRefreshCreateResult, CacheNamespacesDeleteResult, CacheNamespacesKeysDeleteResult, CacheNamespacesKeysListResult, CacheNamespacesRefreshCreateResult, CacheOverviewRetrieveResult, CacheRefreshCreateResult, DashboardAdminOverviewRetrieveResult, FirewallsRulesCreateResult, FirewallsRulesDeleteResult, FirewallsRulesListResult, InstallationStatusRetrieveResult, MarketingReferralStatsListResult, MonitorAlertsListResult, MonitorNodesListResult, MonitorPerformanceListResult, RateLimitsApiKeysCreateResult, RateLimitsApiKeysListResult, RateLimitsIpCreateResult, RateLimitsIpListResult, RateLimitsModelsCreateResult, RateLimitsModelsListResult, RecordsListResult, RuntimeRegionSettingsRetrieveResult, RuntimeRegionSettingsUpdateResult, ServiceNodesCreateResult, ServiceNodesDeleteResult, ServiceNodesListResult, ServiceNodesStatusUpdateResult, ServiceNodesUpdateResult, SiteSettingsRetrieveResult, SiteSettingsUpdateResult } from '../types';


export class SystemSiteSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve site branding and deployment personalization settings */
  async retrieve(): Promise<SiteSettingsRetrieveResult> {
    return this.client.get<SiteSettingsRetrieveResult>(backendApiPath(`/system/site/settings`));
  }

/** Update site branding and deployment personalization settings */
  async update(body: AdminSiteSettingsUpdateRequest): Promise<SiteSettingsUpdateResult> {
    return this.client.patch<SiteSettingsUpdateResult>(backendApiPath(`/system/site/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemSiteApi {
  private client: HttpClient;
  public readonly settings: SystemSiteSettingsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.settings = new SystemSiteSettingsApi(client);
  }

}

export class SystemServiceNodesStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update service node status */
  async update(nodeId: string, body: AdminServiceNodeStatusUpdateRequest): Promise<ServiceNodesStatusUpdateResult> {
    return this.client.put<ServiceNodesStatusUpdateResult>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`), body, undefined, undefined, 'application/json');
  }
}

export interface SystemServiceNodesListParams {
  q?: string;
  status?: 'enabled' | 'disabled';
}

export class SystemServiceNodesApi {
  private client: HttpClient;
  public readonly status: SystemServiceNodesStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new SystemServiceNodesStatusApi(client);
  }


/** List service nodes */
  async list(params?: SystemServiceNodesListParams): Promise<ServiceNodesListResult> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ServiceNodesListResult>(appendQueryString(backendApiPath(`/system/service_nodes`), query));
  }

/** Create service node */
  async create(body: AdminServiceNodeCreateRequest): Promise<ServiceNodesCreateResult> {
    return this.client.post<ServiceNodesCreateResult>(backendApiPath(`/system/service_nodes`), body, undefined, undefined, 'application/json');
  }

/** Delete service node */
  async delete(nodeId: string): Promise<ServiceNodesDeleteResult> {
    return this.client.delete<ServiceNodesDeleteResult>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

/** Update service node */
  async update(nodeId: string, body: AdminServiceNodeUpdateRequest): Promise<ServiceNodesUpdateResult> {
    return this.client.put<ServiceNodesUpdateResult>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRuntimeRegionSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve runtime region settings */
  async retrieve(): Promise<RuntimeRegionSettingsRetrieveResult> {
    return this.client.get<RuntimeRegionSettingsRetrieveResult>(backendApiPath(`/system/runtime_region/settings`));
  }

/** Update runtime region settings */
  async update(body: AdminRuntimeRegionSettingsUpdateRequest): Promise<RuntimeRegionSettingsUpdateResult> {
    return this.client.patch<RuntimeRegionSettingsUpdateResult>(backendApiPath(`/system/runtime_region/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRuntimeRegionApi {
  private client: HttpClient;
  public readonly settings: SystemRuntimeRegionSettingsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.settings = new SystemRuntimeRegionSettingsApi(client);
  }

}

export interface SystemRecordsListParams {
  page?: string;
  pageSize?: string;
  user?: string;
  token?: string;
  model?: string;
}

export class SystemRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List logs */
  async list(params?: SystemRecordsListParams): Promise<RecordsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'user', value: params?.user, style: 'form', explode: true, allowReserved: false },
      { name: 'token', value: params?.token, style: 'form', explode: true, allowReserved: false },
      { name: 'model', value: params?.model, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RecordsListResult>(appendQueryString(backendApiPath(`/system/records`), query));
  }
}

export class SystemRateLimitsModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model limits */
  async list(): Promise<RateLimitsModelsListResult> {
    return this.client.get<RateLimitsModelsListResult>(backendApiPath(`/system/rate_limits/models`));
  }

/** Create model limit */
  async create(body: AdminModelLimitCreateRequest): Promise<RateLimitsModelsCreateResult> {
    return this.client.post<RateLimitsModelsCreateResult>(backendApiPath(`/system/rate_limits/models`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsIpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List IP limits */
  async list(): Promise<RateLimitsIpListResult> {
    return this.client.get<RateLimitsIpListResult>(backendApiPath(`/system/rate_limits/ip`));
  }

/** Create IP limit */
  async create(body: AdminIpLimitCreateRequest): Promise<RateLimitsIpCreateResult> {
    return this.client.post<RateLimitsIpCreateResult>(backendApiPath(`/system/rate_limits/ip`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List token limits */
  async list(): Promise<RateLimitsApiKeysListResult> {
    return this.client.get<RateLimitsApiKeysListResult>(backendApiPath(`/system/rate_limits/api_keys`));
  }

/** Create token limit */
  async create(body: AdminTokenLimitCreateRequest): Promise<RateLimitsApiKeysCreateResult> {
    return this.client.post<RateLimitsApiKeysCreateResult>(backendApiPath(`/system/rate_limits/api_keys`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsApi {
  private client: HttpClient;
  public readonly apiKeys: SystemRateLimitsApiKeysApi;
  public readonly ip: SystemRateLimitsIpApi;
  public readonly models: SystemRateLimitsModelsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.apiKeys = new SystemRateLimitsApiKeysApi(client);
    this.ip = new SystemRateLimitsIpApi(client);
    this.models = new SystemRateLimitsModelsApi(client);
  }

}

export class SystemMonitorPerformanceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List performance data */
  async list(): Promise<MonitorPerformanceListResult> {
    return this.client.get<MonitorPerformanceListResult>(backendApiPath(`/system/monitor/performance`));
  }
}

export class SystemMonitorNodesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List nodes */
  async list(): Promise<MonitorNodesListResult> {
    return this.client.get<MonitorNodesListResult>(backendApiPath(`/system/monitor/nodes`));
  }
}

export class SystemMonitorAlertsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List alerts */
  async list(): Promise<MonitorAlertsListResult> {
    return this.client.get<MonitorAlertsListResult>(backendApiPath(`/system/monitor/alerts`));
  }
}

export class SystemMonitorApi {
  private client: HttpClient;
  public readonly alerts: SystemMonitorAlertsApi;
  public readonly nodes: SystemMonitorNodesApi;
  public readonly performance: SystemMonitorPerformanceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.alerts = new SystemMonitorAlertsApi(client);
    this.nodes = new SystemMonitorNodesApi(client);
    this.performance = new SystemMonitorPerformanceApi(client);
  }

}

export class SystemMarketingReferralStatsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List referral stats */
  async list(): Promise<MarketingReferralStatsListResult> {
    return this.client.get<MarketingReferralStatsListResult>(backendApiPath(`/system/marketing/referral_stats`));
  }
}

export class SystemMarketingApi {
  private client: HttpClient;
  public readonly referralStats: SystemMarketingReferralStatsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.referralStats = new SystemMarketingReferralStatsApi(client);
  }

}

export class SystemInstallationStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List installation status */
  async retrieve(): Promise<InstallationStatusRetrieveResult> {
    return this.client.get<InstallationStatusRetrieveResult>(backendApiPath(`/system/installation/status`));
  }
}

export class SystemInstallationApi {
  private client: HttpClient;
  public readonly status: SystemInstallationStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new SystemInstallationStatusApi(client);
  }

}

export class SystemFirewallsRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List firewalls */
  async list(): Promise<FirewallsRulesListResult> {
    return this.client.get<FirewallsRulesListResult>(backendApiPath(`/system/firewalls/rules`));
  }

/** Create firewall */
  async create(body: AdminFirewallRuleCreateRequest): Promise<FirewallsRulesCreateResult> {
    return this.client.post<FirewallsRulesCreateResult>(backendApiPath(`/system/firewalls/rules`), body, undefined, undefined, 'application/json');
  }

/** Delete firewall */
  async delete(ruleId: string): Promise<FirewallsRulesDeleteResult> {
    return this.client.delete<FirewallsRulesDeleteResult>(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`));
  }
}

export class SystemFirewallsApi {
  private client: HttpClient;
  public readonly rules: SystemFirewallsRulesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.rules = new SystemFirewallsRulesApi(client);
  }

}

export class SystemDashboardAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List dashboard data */
  async retrieve(): Promise<DashboardAdminOverviewRetrieveResult> {
    return this.client.get<DashboardAdminOverviewRetrieveResult>(backendApiPath(`/system/dashboard/admin/overview`));
  }
}

export class SystemDashboardAdminApi {
  private client: HttpClient;
  public readonly overview: SystemDashboardAdminOverviewApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new SystemDashboardAdminOverviewApi(client);
  }

}

export class SystemDashboardApi {
  private client: HttpClient;
  public readonly admin: SystemDashboardAdminApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.admin = new SystemDashboardAdminApi(client);
  }

}

export class SystemCacheRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Refresh all runtime cache instances */
  async create(): Promise<CacheRefreshCreateResult> {
    return this.client.post<CacheRefreshCreateResult>(backendApiPath(`/system/cache/refresh`));
  }
}

export class SystemCacheOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve runtime cache overview */
  async retrieve(): Promise<CacheOverviewRetrieveResult> {
    return this.client.get<CacheOverviewRetrieveResult>(backendApiPath(`/system/cache/overview`));
  }
}

export class SystemCacheNamespacesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Refresh one runtime cache namespace */
  async create(namespace_: string): Promise<CacheNamespacesRefreshCreateResult> {
    return this.client.post<CacheNamespacesRefreshCreateResult>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`));
  }
}

export interface SystemCacheNamespacesKeysListParams {
  limit?: string;
  cursor?: string;
}

export class SystemCacheNamespacesKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List runtime cache keys in a namespace */
  async list(namespace_: string, params?: SystemCacheNamespacesKeysListParams): Promise<CacheNamespacesKeysListResult> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CacheNamespacesKeysListResult>(appendQueryString(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`), query));
  }

/** Delete a runtime cache key */
  async delete(namespace_: string, key: string): Promise<CacheNamespacesKeysDeleteResult> {
    return this.client.delete<CacheNamespacesKeysDeleteResult>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`));
  }
}

export class SystemCacheNamespacesApi {
  private client: HttpClient;
  public readonly keys: SystemCacheNamespacesKeysApi;
  public readonly refresh: SystemCacheNamespacesRefreshApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.keys = new SystemCacheNamespacesKeysApi(client);
    this.refresh = new SystemCacheNamespacesRefreshApi(client);
  }


/** Delete a runtime cache namespace */
  async delete(namespace_: string): Promise<CacheNamespacesDeleteResult> {
    return this.client.delete<CacheNamespacesDeleteResult>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`));
  }
}

export class SystemCacheInstancesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Refresh one runtime cache instance */
  async create(instanceName: string): Promise<CacheInstancesRefreshCreateResult> {
    return this.client.post<CacheInstancesRefreshCreateResult>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}/refresh`));
  }
}

export class SystemCacheInstancesApi {
  private client: HttpClient;
  public readonly refresh: SystemCacheInstancesRefreshApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.refresh = new SystemCacheInstancesRefreshApi(client);
  }


/** Delete one runtime cache instance */
  async delete(instanceName: string): Promise<CacheInstancesDeleteResult> {
    return this.client.delete<CacheInstancesDeleteResult>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`));
  }
}

export class SystemCacheApi {
  private client: HttpClient;
  public readonly instances: SystemCacheInstancesApi;
  public readonly namespaces: SystemCacheNamespacesApi;
  public readonly overview: SystemCacheOverviewApi;
  public readonly refresh: SystemCacheRefreshApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.instances = new SystemCacheInstancesApi(client);
    this.namespaces = new SystemCacheNamespacesApi(client);
    this.overview = new SystemCacheOverviewApi(client);
    this.refresh = new SystemCacheRefreshApi(client);
  }

}

export class SystemAuthSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve IAM auth runtime settings */
  async retrieve(): Promise<AuthSettingsRetrieveResult> {
    return this.client.get<AuthSettingsRetrieveResult>(backendApiPath(`/system/auth/settings`));
  }

/** Update IAM auth runtime settings */
  async update(body: AdminAuthSettingsUpdateRequest): Promise<AuthSettingsUpdateResult> {
    return this.client.patch<AuthSettingsUpdateResult>(backendApiPath(`/system/auth/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemAuthApi {
  private client: HttpClient;
  public readonly settings: SystemAuthSettingsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.settings = new SystemAuthSettingsApi(client);
  }

}

export interface SystemAnalyticsAdminOverviewRetrieveParams {
  timeRange?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  startTime?: string;
  endTime?: string;
  limit?: string;
}

export class SystemAnalyticsAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List overview */
  async retrieve(params?: SystemAnalyticsAdminOverviewRetrieveParams): Promise<AnalyticsAdminOverviewRetrieveResult> {
    const query = buildQueryString([
      { name: 'time_range', value: params?.timeRange, style: 'form', explode: true, allowReserved: false },
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<AnalyticsAdminOverviewRetrieveResult>(appendQueryString(backendApiPath(`/system/analytics/admin/overview`), query));
  }
}

export class SystemAnalyticsAdminApi {
  private client: HttpClient;
  public readonly overview: SystemAnalyticsAdminOverviewApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new SystemAnalyticsAdminOverviewApi(client);
  }

}

export class SystemAnalyticsApi {
  private client: HttpClient;
  public readonly admin: SystemAnalyticsAdminApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.admin = new SystemAnalyticsAdminApi(client);
  }

}

export class SystemApi {
  private client: HttpClient;
  public readonly analytics: SystemAnalyticsApi;
  public readonly auth: SystemAuthApi;
  public readonly cache: SystemCacheApi;
  public readonly dashboard: SystemDashboardApi;
  public readonly firewalls: SystemFirewallsApi;
  public readonly installation: SystemInstallationApi;
  public readonly marketing: SystemMarketingApi;
  public readonly monitor: SystemMonitorApi;
  public readonly rateLimits: SystemRateLimitsApi;
  public readonly records: SystemRecordsApi;
  public readonly runtimeRegion: SystemRuntimeRegionApi;
  public readonly serviceNodes: SystemServiceNodesApi;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.analytics = new SystemAnalyticsApi(client);
    this.auth = new SystemAuthApi(client);
    this.cache = new SystemCacheApi(client);
    this.dashboard = new SystemDashboardApi(client);
    this.firewalls = new SystemFirewallsApi(client);
    this.installation = new SystemInstallationApi(client);
    this.marketing = new SystemMarketingApi(client);
    this.monitor = new SystemMonitorApi(client);
    this.rateLimits = new SystemRateLimitsApi(client);
    this.records = new SystemRecordsApi(client);
    this.runtimeRegion = new SystemRuntimeRegionApi(client);
    this.serviceNodes = new SystemServiceNodesApi(client);
    this.site = new SystemSiteApi(client);
  }

}

export function createSystemApi(client: HttpClient): SystemApi {
  return new SystemApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
