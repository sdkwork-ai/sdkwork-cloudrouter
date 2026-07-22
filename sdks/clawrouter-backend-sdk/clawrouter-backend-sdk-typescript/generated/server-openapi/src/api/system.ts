import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { AdminAnalyticsOverview, AdminAuthSettingsResponse, AdminAuthSettingsUpdateRequest, AdminFirewallRuleCreateRequest, AdminIpLimitCreateRequest, AdminModelLimitCreateRequest, AdminRecordPage, AdminRuntimeRegionSettingsResponse, AdminRuntimeRegionSettingsUpdateRequest, AdminServiceNodeCreateRequest, AdminServiceNodeItem, AdminServiceNodePage, AdminServiceNodeStatusUpdateRequest, AdminServiceNodeUpdateRequest, AdminSiteSettingsResponse, AdminSiteSettingsUpdateRequest, AdminTokenLimitCreateRequest, CacheNamespaceKeyPage, CacheOperationOutcome, CacheOverview, FirewallRuleItem, FirewallRulePage, IpLimitRuleItem, IpLimitRulePage, ModelLimitRuleItem, ModelLimitRulePage, MonitorAlertPage, MonitorNodePage, MonitorPerformancePage, TokenLimitRuleItem, TokenLimitRulePage } from '../types';
export class SystemSiteSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List settings */
  async list(): Promise<AdminSiteSettingsResponse> {
    return this.client.get<AdminSiteSettingsResponse>(backendApiPath(`/system/site/settings`));
  }

/** Update settings */
  async update(body: AdminSiteSettingsUpdateRequest): Promise<AdminSiteSettingsResponse> {
    return this.client.patch<AdminSiteSettingsResponse>(backendApiPath(`/system/site/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemSiteApi {

  public readonly settings: SystemSiteSettingsApi;

  constructor(client: HttpClient) {

    this.settings = new SystemSiteSettingsApi(client);
  }

}

export class SystemServiceNodesStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update node status */
  async update(nodeId: string, body: AdminServiceNodeStatusUpdateRequest): Promise<AdminServiceNodeItem> {
    return this.client.put<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`), body, undefined, undefined, 'application/json');
  }
}

export class SystemServiceNodesApi {
  private client: HttpClient;
  public readonly status: SystemServiceNodesStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new SystemServiceNodesStatusApi(client);
  }


/** List nodes */
  async list(): Promise<AdminServiceNodePage> {
    return this.client.get<AdminServiceNodePage>(backendApiPath(`/system/service_nodes`));
  }

/** Create node */
  async create(body: AdminServiceNodeCreateRequest): Promise<AdminServiceNodeItem> {
    return this.client.post<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes`), body, undefined, undefined, 'application/json');
  }

/** Delete node */
  async delete(nodeId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

/** Update node */
  async update(nodeId: string, body: AdminServiceNodeUpdateRequest): Promise<AdminServiceNodeItem> {
    return this.client.put<AdminServiceNodeItem>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRuntimeRegionSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List settings */
  async list(): Promise<AdminRuntimeRegionSettingsResponse> {
    return this.client.get<AdminRuntimeRegionSettingsResponse>(backendApiPath(`/system/runtime_region/settings`));
  }

/** Update settings */
  async update(body: AdminRuntimeRegionSettingsUpdateRequest): Promise<AdminRuntimeRegionSettingsResponse> {
    return this.client.patch<AdminRuntimeRegionSettingsResponse>(backendApiPath(`/system/runtime_region/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRuntimeRegionApi {

  public readonly settings: SystemRuntimeRegionSettingsApi;

  constructor(client: HttpClient) {

    this.settings = new SystemRuntimeRegionSettingsApi(client);
  }

}

export class SystemRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List logs */
  async list(): Promise<AdminRecordPage> {
    return this.client.get<AdminRecordPage>(backendApiPath(`/system/records`));
  }
}

export class SystemRateLimitsModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model limits */
  async list(): Promise<ModelLimitRulePage> {
    return this.client.get<ModelLimitRulePage>(backendApiPath(`/system/rate_limits/models`));
  }

/** Create model limit */
  async create(body: AdminModelLimitCreateRequest): Promise<ModelLimitRuleItem> {
    return this.client.post<ModelLimitRuleItem>(backendApiPath(`/system/rate_limits/models`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsIpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List IP limits */
  async list(): Promise<IpLimitRulePage> {
    return this.client.get<IpLimitRulePage>(backendApiPath(`/system/rate_limits/ip`));
  }

/** Create IP limit */
  async create(body: AdminIpLimitCreateRequest): Promise<IpLimitRuleItem> {
    return this.client.post<IpLimitRuleItem>(backendApiPath(`/system/rate_limits/ip`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List token limits */
  async list(): Promise<TokenLimitRulePage> {
    return this.client.get<TokenLimitRulePage>(backendApiPath(`/system/rate_limits/api_keys`));
  }

/** Create token limit */
  async create(body: AdminTokenLimitCreateRequest): Promise<TokenLimitRuleItem> {
    return this.client.post<TokenLimitRuleItem>(backendApiPath(`/system/rate_limits/api_keys`), body, undefined, undefined, 'application/json');
  }
}

export class SystemRateLimitsApi {

  public readonly apiKeys: SystemRateLimitsApiKeysApi;
  public readonly ip: SystemRateLimitsIpApi;
  public readonly models: SystemRateLimitsModelsApi;

  constructor(client: HttpClient) {

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
  async list(): Promise<MonitorPerformancePage> {
    return this.client.get<MonitorPerformancePage>(backendApiPath(`/system/monitor/performance`));
  }
}

export class SystemMonitorNodesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List nodes */
  async list(): Promise<MonitorNodePage> {
    return this.client.get<MonitorNodePage>(backendApiPath(`/system/monitor/nodes`));
  }
}

export class SystemMonitorAlertsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List alerts */
  async list(): Promise<MonitorAlertPage> {
    return this.client.get<MonitorAlertPage>(backendApiPath(`/system/monitor/alerts`));
  }
}

export class SystemMonitorApi {

  public readonly alerts: SystemMonitorAlertsApi;
  public readonly nodes: SystemMonitorNodesApi;
  public readonly performance: SystemMonitorPerformanceApi;

  constructor(client: HttpClient) {

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
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/installation/status`));
  }
}

export class SystemInstallationApi {

  public readonly status: SystemInstallationStatusApi;

  constructor(client: HttpClient) {

    this.status = new SystemInstallationStatusApi(client);
  }

}

export class SystemFirewallsRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List firewalls */
  async list(): Promise<FirewallRulePage> {
    return this.client.get<FirewallRulePage>(backendApiPath(`/system/firewalls/rules`));
  }

/** Create firewall */
  async create(body: AdminFirewallRuleCreateRequest): Promise<FirewallRuleItem> {
    return this.client.post<FirewallRuleItem>(backendApiPath(`/system/firewalls/rules`), body, undefined, undefined, 'application/json');
  }

/** Delete firewall */
  async delete(ruleId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`));
  }
}

export class SystemFirewallsApi {

  public readonly rules: SystemFirewallsRulesApi;

  constructor(client: HttpClient) {

    this.rules = new SystemFirewallsRulesApi(client);
  }

}

export class SystemDashboardAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List dashboard data */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/dashboard/admin/overview`));
  }
}

export class SystemDashboardAdminApi {

  public readonly overview: SystemDashboardAdminOverviewApi;

  constructor(client: HttpClient) {

    this.overview = new SystemDashboardAdminOverviewApi(client);
  }

}

export class SystemDashboardApi {

  public readonly admin: SystemDashboardAdminApi;

  constructor(client: HttpClient) {

    this.admin = new SystemDashboardAdminApi(client);
  }

}

export class SystemCacheOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List overview */
  async list(): Promise<CacheOverview> {
    return this.client.get<CacheOverview>(backendApiPath(`/system/cache/overview`));
  }
}

export class SystemCacheNamespacesKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List keys */
  async list(namespace_: string): Promise<CacheNamespaceKeyPage> {
    return this.client.get<CacheNamespaceKeyPage>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`));
  }

/** Delete key */
  async delete(namespace_: string, key: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`));
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
  async delete(namespace_: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`));
  }

/** Refresh namespace */
  async refresh(namespace_: string): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`));
  }
}

export class SystemCacheInstancesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Delete instance */
  async delete(instanceName: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`));
  }

/** Refresh instance */
  async refresh(instanceName: string): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}/refresh`));
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
  async refresh(): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/refresh`));
  }
}

export class SystemAuthSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List claw router auth settings */
  async retrieve(): Promise<AdminAuthSettingsResponse> {
    return this.client.get<AdminAuthSettingsResponse>(backendApiPath(`/system/auth/settings`));
  }

/** Update claw router auth settings */
  async update(body: AdminAuthSettingsUpdateRequest): Promise<AdminAuthSettingsResponse> {
    return this.client.patch<AdminAuthSettingsResponse>(backendApiPath(`/system/auth/settings`), body, undefined, undefined, 'application/json');
  }
}

export class SystemAuthApi {

  public readonly settings: SystemAuthSettingsApi;

  constructor(client: HttpClient) {

    this.settings = new SystemAuthSettingsApi(client);
  }

}

export class SystemAnalyticsAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List overview */
  async list(): Promise<AdminAnalyticsOverview> {
    return this.client.get<AdminAnalyticsOverview>(backendApiPath(`/system/analytics/admin/overview`));
  }
}

export class SystemAnalyticsAdminApi {

  public readonly overview: SystemAnalyticsAdminOverviewApi;

  constructor(client: HttpClient) {

    this.overview = new SystemAnalyticsAdminOverviewApi(client);
  }

}

export class SystemAnalyticsApi {

  public readonly admin: SystemAnalyticsAdminApi;

  constructor(client: HttpClient) {

    this.admin = new SystemAnalyticsAdminApi(client);
  }

}

export class SystemApi {

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
