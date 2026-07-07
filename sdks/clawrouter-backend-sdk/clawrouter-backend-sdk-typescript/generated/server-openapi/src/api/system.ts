import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { AdminAnalyticsOverview, CacheNamespaceKeyPage, CacheOperationOutcome, CacheOverview } from '../types';
export class SystemSiteSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/site/settings`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/site/settings`));
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

export class SystemShopsVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(shopId: string, verificationId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/verifications/${serializePathParameter(verificationId, { name: 'verificationId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/shipping_templates`));
  }
}

export class SystemShopsSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(shopId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile`));
  }

/** Approve */
  async approve(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/approve`));
  }

/** Reject */
  async reject(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/reject`));
  }
}

export class SystemShopsServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas`));
  }

/** Update */
  async update(shopId: string, serviceAreaId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals`));
  }

/** Resolve */
  async resolve(shopId: string, riskSignalId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals/${serializePathParameter(riskSignalId, { name: 'riskSignalId', style: 'simple', explode: false })}/resolve`));
  }
}

export class SystemShopsReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/return_addresses`));
  }
}

export class SystemShopsQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/qualifications`));
  }
}

export class SystemShopsPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies`));
  }

/** Update */
  async update(shopId: string, policyId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsFulfillmentProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(shopId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/fulfillment_profile`));
  }
}

export class SystemShopsDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(shopId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account`));
  }

/** Review */
  async review(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account/review`));
  }
}

export class SystemShopsCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/customer_services`));
  }
}

export class SystemShopsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels`));
  }

/** Update */
  async update(shopId: string, channelId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/category_bindings`));
  }
}

export class SystemShopsBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(shopId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/business_hours`));
  }
}

export class SystemShopsBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Upsert */
  async upsert(shopId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/brand_authorizations`));
  }
}

export class SystemShopsApi {
  private client: HttpClient;
  public readonly brandAuthorizations: SystemShopsBrandAuthorizationsApi;
  public readonly businessHours: SystemShopsBusinessHoursApi;
  public readonly categoryBindings: SystemShopsCategoryBindingsApi;
  public readonly channels: SystemShopsChannelsApi;
  public readonly customerServices: SystemShopsCustomerServicesApi;
  public readonly depositAccount: SystemShopsDepositAccountApi;
  public readonly fulfillmentProfile: SystemShopsFulfillmentProfileApi;
  public readonly policies: SystemShopsPoliciesApi;
  public readonly qualifications: SystemShopsQualificationsApi;
  public readonly returnAddresses: SystemShopsReturnAddressesApi;
  public readonly riskSignals: SystemShopsRiskSignalsApi;
  public readonly serviceAreas: SystemShopsServiceAreasApi;
  public readonly settlementProfile: SystemShopsSettlementProfileApi;
  public readonly shippingTemplates: SystemShopsShippingTemplatesApi;
  public readonly verifications: SystemShopsVerificationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.brandAuthorizations = new SystemShopsBrandAuthorizationsApi(client);
    this.businessHours = new SystemShopsBusinessHoursApi(client);
    this.categoryBindings = new SystemShopsCategoryBindingsApi(client);
    this.channels = new SystemShopsChannelsApi(client);
    this.customerServices = new SystemShopsCustomerServicesApi(client);
    this.depositAccount = new SystemShopsDepositAccountApi(client);
    this.fulfillmentProfile = new SystemShopsFulfillmentProfileApi(client);
    this.policies = new SystemShopsPoliciesApi(client);
    this.qualifications = new SystemShopsQualificationsApi(client);
    this.returnAddresses = new SystemShopsReturnAddressesApi(client);
    this.riskSignals = new SystemShopsRiskSignalsApi(client);
    this.serviceAreas = new SystemShopsServiceAreasApi(client);
    this.settlementProfile = new SystemShopsSettlementProfileApi(client);
    this.shippingTemplates = new SystemShopsShippingTemplatesApi(client);
    this.verifications = new SystemShopsVerificationsApi(client);
  }


/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops`));
  }

/** Update */
  async update(shopId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }

/** Approve */
  async approve(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/approve`));
  }

/** Close */
  async close(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/close`));
  }

/** Reject */
  async reject(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/reject`));
  }

/** Resume */
  async resume(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/resume`));
  }

/** Create review */
  async submitReview(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/submit_review`));
  }

/** Suspend */
  async suspend(shopId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/suspend`));
  }
}

export class SystemServiceNodesStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(nodeId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`));
  }
}

export class SystemServiceNodesApi {
  private client: HttpClient;
  public readonly status: SystemServiceNodesStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new SystemServiceNodesStatusApi(client);
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/service_nodes`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/service_nodes`));
  }

/** Delete */
  async delete(nodeId: string): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(nodeId: string): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }
}

export class SystemRuntimeRegionSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/runtime_region/settings`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/runtime_region/settings`));
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


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/records`));
  }
}

export class SystemRateLimitsModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/rate_limits/models`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/rate_limits/models`));
  }
}

export class SystemRateLimitsIpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/rate_limits/ip`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/rate_limits/ip`));
  }
}

export class SystemRateLimitsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/rate_limits/api_keys`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/rate_limits/api_keys`));
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


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/monitor/performance`));
  }
}

export class SystemMonitorNodesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/monitor/nodes`));
  }
}

export class SystemMonitorAlertsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/monitor/alerts`));
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


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/marketing/referral_stats`));
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


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/installation/status`));
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


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/firewalls/rules`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/firewalls/rules`));
  }

/** Delete */
  async delete(ruleId: string): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`));
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


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/dashboard/admin/overview`));
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


/** Create */
  async create(): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/refresh`));
  }
}

export class SystemCacheOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<CacheOverview> {
    return this.client.get<CacheOverview>(backendApiPath(`/system/cache/overview`));
  }
}

export class SystemCacheNamespacesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(namespace_: string): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`));
  }
}

export interface SystemCacheNamespacesKeysListParams {
  pageSize?: number;
  cursor?: string;
}

export class SystemCacheNamespacesKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(namespace_: string, params?: SystemCacheNamespacesKeysListParams): Promise<CacheNamespaceKeyPage> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CacheNamespaceKeyPage>(appendQueryString(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`), query));
  }

/** Delete */
  async delete(namespace_: string, key: string): Promise<CacheOperationOutcome> {
    return this.client.delete<CacheOperationOutcome>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`));
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


/** Delete */
  async delete(namespace_: string): Promise<CacheOperationOutcome> {
    return this.client.delete<CacheOperationOutcome>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`));
  }
}

export class SystemCacheInstancesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(instanceName: string): Promise<CacheOperationOutcome> {
    return this.client.post<CacheOperationOutcome>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}/refresh`));
  }
}

export class SystemCacheInstancesApi {
  private client: HttpClient;
  public readonly refresh: SystemCacheInstancesRefreshApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.refresh = new SystemCacheInstancesRefreshApi(client);
  }


/** Delete */
  async delete(instanceName: string): Promise<CacheOperationOutcome> {
    return this.client.delete<CacheOperationOutcome>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`));
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


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/system/auth/settings`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(backendApiPath(`/system/auth/settings`));
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
  rankingSize?: number;
}

export class SystemAnalyticsAdminOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(params?: SystemAnalyticsAdminOverviewRetrieveParams): Promise<AdminAnalyticsOverview> {
    const query = buildQueryString([
      { name: 'time_range', value: params?.timeRange, style: 'form', explode: true, allowReserved: false },
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'ranking_size', value: params?.rankingSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<AdminAnalyticsOverview>(appendQueryString(backendApiPath(`/system/analytics/admin/overview`), query));
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

export class SystemAfterSalesReviewsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(afterSalesRequestId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/reviews`));
  }
}

export class SystemAfterSalesApi {
  private client: HttpClient;
  public readonly reviews: SystemAfterSalesReviewsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.reviews = new SystemAfterSalesReviewsApi(client);
  }

}

export class SystemApi {
  private client: HttpClient;
  public readonly afterSales: SystemAfterSalesApi;
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
  public readonly shops: SystemShopsApi;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.afterSales = new SystemAfterSalesApi(client);
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
    this.shops = new SystemShopsApi(client);
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
