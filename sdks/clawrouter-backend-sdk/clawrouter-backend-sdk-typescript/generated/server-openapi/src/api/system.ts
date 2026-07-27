import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { AdminAnalyticsOverview, AdminAuthSettingsResponse, AdminAuthSettingsUpdateRequest, AdminFirewallRuleCreateRequest, AdminIpLimitCreateRequest, AdminModelLimitCreateRequest, AdminRecordPage, AdminRuntimeRegionSettingsResponse, AdminRuntimeRegionSettingsUpdateRequest, AdminServiceNodeCreateRequest, AdminServiceNodeItem, AdminServiceNodePage, AdminServiceNodeStatusUpdateRequest, AdminServiceNodeUpdateRequest, AdminSiteSettingsResponse, AdminSiteSettingsUpdateRequest, AdminTokenLimitCreateRequest, CacheNamespaceKeyPage, CacheOperationOutcome, CacheOverview, FirewallRuleItem, FirewallRulePage, IpLimitRuleItem, IpLimitRulePage, ModelLimitRuleItem, ModelLimitRulePage, MonitorAlertPage, MonitorNodePage, MonitorPerformancePage, TokenLimitRuleItem, TokenLimitRulePage } from '../types';
export class SystemSiteSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List settings */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminSiteSettingsResponse> {
    return this.client.request<AdminSiteSettingsResponse>(backendApiPath(`/system/site/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Update settings */
  async update(body: AdminSiteSettingsUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminSiteSettingsResponse> {
    return this.client.request<AdminSiteSettingsResponse>(backendApiPath(`/system/site/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json' });
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


/** Update node status */
  async update(nodeId: string, body: AdminServiceNodeStatusUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminServiceNodeItem> {
    return this.client.request<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, contentType: 'application/json' });
  }
}

export interface SystemServiceNodesListParams {
  q?: string;
  status?: 'enabled' | 'disabled';
  page?: number;
  pageSize?: number;
}

export class SystemServiceNodesApi {
  private client: HttpClient;
  public readonly status: SystemServiceNodesStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new SystemServiceNodesStatusApi(client);
  }


/** List nodes */
  async list(params?: SystemServiceNodesListParams, requestOptions?: ApiRequestOptions): Promise<AdminServiceNodePage> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AdminServiceNodePage>(appendQueryString(backendApiPath(`/system/service_nodes`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create node */
  async create(body: AdminServiceNodeCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminServiceNodeItem> {
    return this.client.request<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete node */
  async delete(nodeId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Update node */
  async update(nodeId: string, body: AdminServiceNodeUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminServiceNodeItem> {
    return this.client.request<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, contentType: 'application/json' });
  }
}

export class SystemRuntimeRegionSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List settings */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminRuntimeRegionSettingsResponse> {
    return this.client.request<AdminRuntimeRegionSettingsResponse>(backendApiPath(`/system/runtime_region/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Update settings */
  async update(body: AdminRuntimeRegionSettingsUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminRuntimeRegionSettingsResponse> {
    return this.client.request<AdminRuntimeRegionSettingsResponse>(backendApiPath(`/system/runtime_region/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json' });
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

export class SystemRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List logs */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminRecordPage> {
    return this.client.request<AdminRecordPage>(backendApiPath(`/system/records`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class SystemRateLimitsModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model limits */
  async list(requestOptions?: ApiRequestOptions): Promise<ModelLimitRulePage> {
    return this.client.request<ModelLimitRulePage>(backendApiPath(`/system/rate_limits/models`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create model limit */
  async create(body: AdminModelLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<ModelLimitRuleItem> {
    return this.client.request<ModelLimitRuleItem>(backendApiPath(`/system/rate_limits/models`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class SystemRateLimitsIpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List IP limits */
  async list(requestOptions?: ApiRequestOptions): Promise<IpLimitRulePage> {
    return this.client.request<IpLimitRulePage>(backendApiPath(`/system/rate_limits/ip`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create IP limit */
  async create(body: AdminIpLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<IpLimitRuleItem> {
    return this.client.request<IpLimitRuleItem>(backendApiPath(`/system/rate_limits/ip`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class SystemRateLimitsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List token limits */
  async list(requestOptions?: ApiRequestOptions): Promise<TokenLimitRulePage> {
    return this.client.request<TokenLimitRulePage>(backendApiPath(`/system/rate_limits/api_keys`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create token limit */
  async create(body: AdminTokenLimitCreateRequest, requestOptions?: ApiRequestOptions): Promise<TokenLimitRuleItem> {
    return this.client.request<TokenLimitRuleItem>(backendApiPath(`/system/rate_limits/api_keys`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
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
  async list(requestOptions?: ApiRequestOptions): Promise<MonitorPerformancePage> {
    return this.client.request<MonitorPerformancePage>(backendApiPath(`/system/monitor/performance`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class SystemMonitorNodesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List nodes */
  async list(requestOptions?: ApiRequestOptions): Promise<MonitorNodePage> {
    return this.client.request<MonitorNodePage>(backendApiPath(`/system/monitor/nodes`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class SystemMonitorAlertsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List alerts */
  async list(requestOptions?: ApiRequestOptions): Promise<MonitorAlertPage> {
    return this.client.request<MonitorAlertPage>(backendApiPath(`/system/monitor/alerts`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
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

export class SystemInstallationStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List installation status */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/system/installation/status`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
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
  async list(requestOptions?: ApiRequestOptions): Promise<FirewallRulePage> {
    return this.client.request<FirewallRulePage>(backendApiPath(`/system/firewalls/rules`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create firewall */
  async create(body: AdminFirewallRuleCreateRequest, requestOptions?: ApiRequestOptions): Promise<FirewallRuleItem> {
    return this.client.request<FirewallRuleItem>(backendApiPath(`/system/firewalls/rules`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete firewall */
  async delete(ruleId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
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
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/system/dashboard/admin/overview`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
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

export class SystemCacheOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List overview */
  async list(requestOptions?: ApiRequestOptions): Promise<CacheOverview> {
    return this.client.request<CacheOverview>(backendApiPath(`/system/cache/overview`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class SystemCacheNamespacesKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List keys */
  async list(namespace_: string, requestOptions?: ApiRequestOptions): Promise<CacheNamespaceKeyPage> {
    return this.client.request<CacheNamespaceKeyPage>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Delete key */
  async delete(namespace_: string, key: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }
}

export class SystemCacheNamespacesApi {
  private client: HttpClient;
  public readonly keys: SystemCacheNamespacesKeysApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.keys = new SystemCacheNamespacesKeysApi(client);
  }


/** Delete namespace */
  async delete(namespace_: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Refresh namespace */
  async refresh(namespace_: string, requestOptions?: ApiRequestOptions): Promise<CacheOperationOutcome> {
    return this.client.request<CacheOperationOutcome>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class SystemCacheInstancesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Delete instance */
  async delete(instanceName: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Refresh instance */
  async refresh(instanceName: string, requestOptions?: ApiRequestOptions): Promise<CacheOperationOutcome> {
    return this.client.request<CacheOperationOutcome>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}/refresh`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class SystemCacheApi {
  private client: HttpClient;
  public readonly instances: SystemCacheInstancesApi;
  public readonly namespaces: SystemCacheNamespacesApi;
  public readonly overview: SystemCacheOverviewApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.instances = new SystemCacheInstancesApi(client);
    this.namespaces = new SystemCacheNamespacesApi(client);
    this.overview = new SystemCacheOverviewApi(client);
  }


/** Refresh all */
  async refresh(requestOptions?: ApiRequestOptions): Promise<CacheOperationOutcome> {
    return this.client.request<CacheOperationOutcome>(backendApiPath(`/system/cache/refresh`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class SystemAuthSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List claw router auth settings */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<AdminAuthSettingsResponse> {
    return this.client.request<AdminAuthSettingsResponse>(backendApiPath(`/system/auth/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Update claw router auth settings */
  async update(body: AdminAuthSettingsUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminAuthSettingsResponse> {
    return this.client.request<AdminAuthSettingsResponse>(backendApiPath(`/system/auth/settings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json' });
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

export class SystemAnalyticsAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List overview */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminAnalyticsOverview> {
    return this.client.request<AdminAnalyticsOverview>(backendApiPath(`/system/analytics/admin/overview`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
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

export interface SystemMarketingReferralStatsListParams {
  page?: number;
  pageSize?: number;
}

export class SystemMarketingReferralStatsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: SystemMarketingReferralStatsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/marketing/referral_stats`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
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

export class SystemApi {
  private client: HttpClient;
  public readonly marketing: SystemMarketingApi;
  public readonly analytics: SystemAnalyticsApi;
  public readonly auth: SystemAuthApi;
  public readonly cache: SystemCacheApi;
  public readonly dashboard: SystemDashboardApi;
  public readonly firewalls: SystemFirewallsApi;
  public readonly installation: SystemInstallationApi;
  public readonly monitor: SystemMonitorApi;
  public readonly rateLimits: SystemRateLimitsApi;
  public readonly records: SystemRecordsApi;
  public readonly runtimeRegion: SystemRuntimeRegionApi;
  public readonly serviceNodes: SystemServiceNodesApi;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.marketing = new SystemMarketingApi(client);
    this.analytics = new SystemAnalyticsApi(client);
    this.auth = new SystemAuthApi(client);
    this.cache = new SystemCacheApi(client);
    this.dashboard = new SystemDashboardApi(client);
    this.firewalls = new SystemFirewallsApi(client);
    this.installation = new SystemInstallationApi(client);
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
