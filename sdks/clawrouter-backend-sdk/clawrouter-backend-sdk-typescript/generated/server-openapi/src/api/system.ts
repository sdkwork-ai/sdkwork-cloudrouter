import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AfterSalesManagementRetrieveResult, AfterSalesReviewsCreateResult, AnalyticsAdminOverviewRetrieveResult, AuthSettingsRetrieveResult, AuthSettingsUpdateResult, CacheInstancesRefreshCreateResult, CacheNamespacesRefreshCreateResult, CacheOverviewRetrieveResult, CacheRefreshCreateResult, DashboardAdminOverviewRetrieveResult, FirewallsRulesCreateResult, InstallationStatusRetrieveResult, PageInfo, PromotionsCodesCreateResult, PromotionsCouponStocksCreateResult, PromotionsOffersCreateResult, PromotionsOffersUpdateResult, RateLimitsApiKeysCreateResult, RateLimitsIpCreateResult, RateLimitsModelsCreateResult, ReportsCommerceOverviewRetrieveResult, RuntimeRegionSettingsRetrieveResult, RuntimeRegionSettingsUpdateResult, ServiceNodesCreateResult, ServiceNodesStatusUpdateResult, ServiceNodesUpdateResult, ShopsApproveResult, ShopsBrandAuthorizationsUpsertResult, ShopsBusinessHoursRetrieveResult, ShopsBusinessHoursUpdateResult, ShopsCategoryBindingsUpsertResult, ShopsChannelsCreateResult, ShopsChannelsUpdateResult, ShopsCloseResult, ShopsCreateResult, ShopsCustomerServicesUpsertResult, ShopsDepositAccountRetrieveResult, ShopsDepositAccountReviewResult, ShopsDepositAccountUpdateResult, ShopsFulfillmentProfileRetrieveResult, ShopsFulfillmentProfileUpdateResult, ShopsManagementRetrieveResult, ShopsPoliciesCreateResult, ShopsPoliciesUpdateResult, ShopsQualificationsUpsertResult, ShopsReadinessRetrieveResult, ShopsRejectResult, ShopsResumeResult, ShopsReturnAddressesUpsertResult, ShopsRiskSignalsCreateResult, ShopsRiskSignalsResolveResult, ShopsServiceAreasCreateResult, ShopsServiceAreasUpdateResult, ShopsSettlementProfileApproveResult, ShopsSettlementProfileRejectResult, ShopsSettlementProfileRetrieveResult, ShopsSettlementProfileUpdateResult, ShopsShippingTemplatesUpsertResult, ShopsSubmitReviewResult, ShopsSuspendResult, ShopsUpdateResult, ShopsVerificationsUpdateResult, SiteSettingsRetrieveResult, SiteSettingsUpdateResult } from '../types';


export class SystemSiteSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<SiteSettingsRetrieveResult> {
    return this.client.get<SiteSettingsRetrieveResult>(backendApiPath(`/system/site/settings`));
  }

/** Update */
  async update(): Promise<SiteSettingsUpdateResult> {
    return this.client.patch<SiteSettingsUpdateResult>(backendApiPath(`/system/site/settings`));
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


/** Update */
  async update(nodeId: string): Promise<ServiceNodesStatusUpdateResult> {
    return this.client.put<ServiceNodesStatusUpdateResult>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`));
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
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/service_nodes`));
  }

/** Create */
  async create(): Promise<ServiceNodesCreateResult> {
    return this.client.post<ServiceNodesCreateResult>(backendApiPath(`/system/service_nodes`));
  }

/** Delete */
  async delete(nodeId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(nodeId: string): Promise<ServiceNodesUpdateResult> {
    return this.client.put<ServiceNodesUpdateResult>(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }
}

export class SystemRuntimeRegionSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<RuntimeRegionSettingsRetrieveResult> {
    return this.client.get<RuntimeRegionSettingsRetrieveResult>(backendApiPath(`/system/runtime_region/settings`));
  }

/** Update */
  async update(): Promise<RuntimeRegionSettingsUpdateResult> {
    return this.client.patch<RuntimeRegionSettingsUpdateResult>(backendApiPath(`/system/runtime_region/settings`));
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
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/records`));
  }
}

export class SystemRateLimitsModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/rate_limits/models`));
  }

/** Create */
  async create(): Promise<RateLimitsModelsCreateResult> {
    return this.client.post<RateLimitsModelsCreateResult>(backendApiPath(`/system/rate_limits/models`));
  }
}

export class SystemRateLimitsIpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/rate_limits/ip`));
  }

/** Create */
  async create(): Promise<RateLimitsIpCreateResult> {
    return this.client.post<RateLimitsIpCreateResult>(backendApiPath(`/system/rate_limits/ip`));
  }
}

export class SystemRateLimitsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/rate_limits/api_keys`));
  }

/** Create */
  async create(): Promise<RateLimitsApiKeysCreateResult> {
    return this.client.post<RateLimitsApiKeysCreateResult>(backendApiPath(`/system/rate_limits/api_keys`));
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
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/monitor/performance`));
  }
}

export class SystemMonitorNodesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/monitor/nodes`));
  }
}

export class SystemMonitorAlertsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/monitor/alerts`));
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
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/marketing/referral_stats`));
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


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/firewalls/rules`));
  }

/** Create */
  async create(): Promise<FirewallsRulesCreateResult> {
    return this.client.post<FirewallsRulesCreateResult>(backendApiPath(`/system/firewalls/rules`));
  }

/** Delete */
  async delete(ruleId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`));
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


/** Create */
  async create(): Promise<CacheRefreshCreateResult> {
    return this.client.post<CacheRefreshCreateResult>(backendApiPath(`/system/cache/refresh`));
  }
}

export class SystemCacheOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<CacheOverviewRetrieveResult> {
    return this.client.get<CacheOverviewRetrieveResult>(backendApiPath(`/system/cache/overview`));
  }
}

export class SystemCacheNamespacesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(namespace_: string): Promise<CacheNamespacesRefreshCreateResult> {
    return this.client.post<CacheNamespacesRefreshCreateResult>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`));
  }
}

export class SystemCacheNamespacesKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(namespace_: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`));
  }

/** Delete */
  async delete(namespace_: string, key: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`));
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
  async delete(namespace_: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`));
  }
}

export class SystemCacheInstancesRefreshApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
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


/** Delete */
  async delete(instanceName: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`));
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
  async retrieve(): Promise<AuthSettingsRetrieveResult> {
    return this.client.get<AuthSettingsRetrieveResult>(backendApiPath(`/system/auth/settings`));
  }

/** Update */
  async update(): Promise<AuthSettingsUpdateResult> {
    return this.client.patch<AuthSettingsUpdateResult>(backendApiPath(`/system/auth/settings`));
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


/** Retrieve */
  async retrieve(): Promise<AnalyticsAdminOverviewRetrieveResult> {
    return this.client.get<AnalyticsAdminOverviewRetrieveResult>(backendApiPath(`/system/analytics/admin/overview`));
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

export class SystemShopsVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/verifications`));
  }

/** Update */
  async update(shopId: string, verificationId: string): Promise<ShopsVerificationsUpdateResult> {
    return this.client.patch<ShopsVerificationsUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/verifications/${serializePathParameter(verificationId, { name: 'verificationId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsStatusEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/status_events`));
  }
}

export class SystemShopsShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/shipping_templates`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsShippingTemplatesUpsertResult> {
    return this.client.put<ShopsShippingTemplatesUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/shipping_templates`));
  }
}

export class SystemShopsSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsSettlementProfileRetrieveResult> {
    return this.client.get<ShopsSettlementProfileRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile`));
  }

/** Update */
  async update(shopId: string): Promise<ShopsSettlementProfileUpdateResult> {
    return this.client.patch<ShopsSettlementProfileUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile`));
  }

/** Approve */
  async approve(shopId: string): Promise<ShopsSettlementProfileApproveResult> {
    return this.client.post<ShopsSettlementProfileApproveResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/approve`));
  }

/** Reject */
  async reject(shopId: string): Promise<ShopsSettlementProfileRejectResult> {
    return this.client.post<ShopsSettlementProfileRejectResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/reject`));
  }
}

export class SystemShopsServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas`));
  }

/** Create */
  async create(shopId: string): Promise<ShopsServiceAreasCreateResult> {
    return this.client.post<ShopsServiceAreasCreateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas`));
  }

/** Update */
  async update(shopId: string, serviceAreaId: string): Promise<ShopsServiceAreasUpdateResult> {
    return this.client.patch<ShopsServiceAreasUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals`));
  }

/** Create */
  async create(shopId: string): Promise<ShopsRiskSignalsCreateResult> {
    return this.client.post<ShopsRiskSignalsCreateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals`));
  }

/** Resolve */
  async resolve(shopId: string, riskSignalId: string): Promise<ShopsRiskSignalsResolveResult> {
    return this.client.post<ShopsRiskSignalsResolveResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals/${serializePathParameter(riskSignalId, { name: 'riskSignalId', style: 'simple', explode: false })}/resolve`));
  }
}

export class SystemShopsReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/return_addresses`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsReturnAddressesUpsertResult> {
    return this.client.put<ShopsReturnAddressesUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/return_addresses`));
  }
}

export class SystemShopsReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsReadinessRetrieveResult> {
    return this.client.get<ShopsReadinessRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/readiness`));
  }
}

export class SystemShopsQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/qualifications`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsQualificationsUpsertResult> {
    return this.client.put<ShopsQualificationsUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/qualifications`));
  }
}

export class SystemShopsPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies`));
  }

/** Create */
  async create(shopId: string): Promise<ShopsPoliciesCreateResult> {
    return this.client.post<ShopsPoliciesCreateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies`));
  }

/** Update */
  async update(shopId: string, policyId: string): Promise<ShopsPoliciesUpdateResult> {
    return this.client.patch<ShopsPoliciesUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsFulfillmentProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsFulfillmentProfileRetrieveResult> {
    return this.client.get<ShopsFulfillmentProfileRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/fulfillment_profile`));
  }

/** Update */
  async update(shopId: string): Promise<ShopsFulfillmentProfileUpdateResult> {
    return this.client.patch<ShopsFulfillmentProfileUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/fulfillment_profile`));
  }
}

export class SystemShopsDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsDepositAccountRetrieveResult> {
    return this.client.get<ShopsDepositAccountRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account`));
  }

/** Update */
  async update(shopId: string): Promise<ShopsDepositAccountUpdateResult> {
    return this.client.patch<ShopsDepositAccountUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account`));
  }

/** Review */
  async review(shopId: string): Promise<ShopsDepositAccountReviewResult> {
    return this.client.post<ShopsDepositAccountReviewResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account/review`));
  }
}

export class SystemShopsCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/customer_services`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsCustomerServicesUpsertResult> {
    return this.client.put<ShopsCustomerServicesUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/customer_services`));
  }
}

export class SystemShopsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels`));
  }

/** Create */
  async create(shopId: string): Promise<ShopsChannelsCreateResult> {
    return this.client.post<ShopsChannelsCreateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels`));
  }

/** Update */
  async update(shopId: string, channelId: string): Promise<ShopsChannelsUpdateResult> {
    return this.client.patch<ShopsChannelsUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/category_bindings`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsCategoryBindingsUpsertResult> {
    return this.client.put<ShopsCategoryBindingsUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/category_bindings`));
  }
}

export class SystemShopsBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsBusinessHoursRetrieveResult> {
    return this.client.get<ShopsBusinessHoursRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/business_hours`));
  }

/** Update */
  async update(shopId: string): Promise<ShopsBusinessHoursUpdateResult> {
    return this.client.patch<ShopsBusinessHoursUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/business_hours`));
  }
}

export class SystemShopsBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shopId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/brand_authorizations`));
  }

/** Upsert */
  async upsert(shopId: string): Promise<ShopsBrandAuthorizationsUpsertResult> {
    return this.client.put<ShopsBrandAuthorizationsUpsertResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/brand_authorizations`));
  }
}

export class SystemShopsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shops`));
  }

/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsManagementRetrieveResult> {
    return this.client.get<ShopsManagementRetrieveResult>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsApi {
  private client: HttpClient;
  public readonly management: SystemShopsManagementApi;
  public readonly brandAuthorizations: SystemShopsBrandAuthorizationsApi;
  public readonly businessHours: SystemShopsBusinessHoursApi;
  public readonly categoryBindings: SystemShopsCategoryBindingsApi;
  public readonly channels: SystemShopsChannelsApi;
  public readonly customerServices: SystemShopsCustomerServicesApi;
  public readonly depositAccount: SystemShopsDepositAccountApi;
  public readonly fulfillmentProfile: SystemShopsFulfillmentProfileApi;
  public readonly policies: SystemShopsPoliciesApi;
  public readonly qualifications: SystemShopsQualificationsApi;
  public readonly readiness: SystemShopsReadinessApi;
  public readonly returnAddresses: SystemShopsReturnAddressesApi;
  public readonly riskSignals: SystemShopsRiskSignalsApi;
  public readonly serviceAreas: SystemShopsServiceAreasApi;
  public readonly settlementProfile: SystemShopsSettlementProfileApi;
  public readonly shippingTemplates: SystemShopsShippingTemplatesApi;
  public readonly statusEvents: SystemShopsStatusEventsApi;
  public readonly verifications: SystemShopsVerificationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new SystemShopsManagementApi(client);
    this.brandAuthorizations = new SystemShopsBrandAuthorizationsApi(client);
    this.businessHours = new SystemShopsBusinessHoursApi(client);
    this.categoryBindings = new SystemShopsCategoryBindingsApi(client);
    this.channels = new SystemShopsChannelsApi(client);
    this.customerServices = new SystemShopsCustomerServicesApi(client);
    this.depositAccount = new SystemShopsDepositAccountApi(client);
    this.fulfillmentProfile = new SystemShopsFulfillmentProfileApi(client);
    this.policies = new SystemShopsPoliciesApi(client);
    this.qualifications = new SystemShopsQualificationsApi(client);
    this.readiness = new SystemShopsReadinessApi(client);
    this.returnAddresses = new SystemShopsReturnAddressesApi(client);
    this.riskSignals = new SystemShopsRiskSignalsApi(client);
    this.serviceAreas = new SystemShopsServiceAreasApi(client);
    this.settlementProfile = new SystemShopsSettlementProfileApi(client);
    this.shippingTemplates = new SystemShopsShippingTemplatesApi(client);
    this.statusEvents = new SystemShopsStatusEventsApi(client);
    this.verifications = new SystemShopsVerificationsApi(client);
  }


/** Create */
  async create(): Promise<ShopsCreateResult> {
    return this.client.post<ShopsCreateResult>(backendApiPath(`/system/shops`));
  }

/** Update */
  async update(shopId: string): Promise<ShopsUpdateResult> {
    return this.client.patch<ShopsUpdateResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }

/** Approve */
  async approve(shopId: string): Promise<ShopsApproveResult> {
    return this.client.post<ShopsApproveResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/approve`));
  }

/** Close */
  async close(shopId: string): Promise<ShopsCloseResult> {
    return this.client.post<ShopsCloseResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/close`));
  }

/** Reject */
  async reject(shopId: string): Promise<ShopsRejectResult> {
    return this.client.post<ShopsRejectResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/reject`));
  }

/** Resume */
  async resume(shopId: string): Promise<ShopsResumeResult> {
    return this.client.post<ShopsResumeResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/resume`));
  }

/** Create review */
  async submitReview(shopId: string): Promise<ShopsSubmitReviewResult> {
    return this.client.post<ShopsSubmitReviewResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/submit_review`));
  }

/** Suspend */
  async suspend(shopId: string): Promise<ShopsSuspendResult> {
    return this.client.post<ShopsSuspendResult>(backendApiPath(`/system/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/suspend`));
  }
}

export class SystemReportsSalesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/reports/sales`));
  }
}

export class SystemReportsPaymentReconciliationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/reports/payment_reconciliation`));
  }
}

export class SystemReportsCommerceOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ReportsCommerceOverviewRetrieveResult> {
    return this.client.get<ReportsCommerceOverviewRetrieveResult>(backendApiPath(`/reports/commerce_overview`));
  }
}

export class SystemReportsApi {
  private client: HttpClient;
  public readonly commerceOverview: SystemReportsCommerceOverviewApi;
  public readonly paymentReconciliation: SystemReportsPaymentReconciliationApi;
  public readonly sales: SystemReportsSalesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.commerceOverview = new SystemReportsCommerceOverviewApi(client);
    this.paymentReconciliation = new SystemReportsPaymentReconciliationApi(client);
    this.sales = new SystemReportsSalesApi(client);
  }

}

export class SystemPromotionsUserCouponsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/user_coupons`));
  }
}

export class SystemPromotionsUserCouponsApi {
  private client: HttpClient;
  public readonly management: SystemPromotionsUserCouponsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new SystemPromotionsUserCouponsManagementApi(client);
  }

}

export class SystemPromotionsOffersManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/offers`));
  }
}

export class SystemPromotionsOffersApi {
  private client: HttpClient;
  public readonly management: SystemPromotionsOffersManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new SystemPromotionsOffersManagementApi(client);
  }


/** Create */
  async create(): Promise<PromotionsOffersCreateResult> {
    return this.client.post<PromotionsOffersCreateResult>(backendApiPath(`/promotions/offers`));
  }

/** Update */
  async update(offerId: string): Promise<PromotionsOffersUpdateResult> {
    return this.client.patch<PromotionsOffersUpdateResult>(backendApiPath(`/promotions/offers/${serializePathParameter(offerId, { name: 'offerId', style: 'simple', explode: false })}`));
  }
}

export class SystemPromotionsExternalBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/external_bindings`));
  }
}

export class SystemPromotionsEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/events`));
  }
}

export class SystemPromotionsDiscountApplicationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/discount_applications`));
  }
}

export class SystemPromotionsDiscountAllocationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/discount_allocations`));
  }
}

export class SystemPromotionsCouponStocksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/coupon_stocks`));
  }

/** Create */
  async create(): Promise<PromotionsCouponStocksCreateResult> {
    return this.client.post<PromotionsCouponStocksCreateResult>(backendApiPath(`/promotions/coupon_stocks`));
  }
}

export class SystemPromotionsCouponLedgerEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/coupon_ledger_entries`));
  }
}

export class SystemPromotionsCodesRedemptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/codes/redemptions`));
  }
}

export class SystemPromotionsCodesApi {
  private client: HttpClient;
  public readonly redemptions: SystemPromotionsCodesRedemptionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.redemptions = new SystemPromotionsCodesRedemptionsApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/codes`));
  }

/** Create */
  async create(): Promise<PromotionsCodesCreateResult> {
    return this.client.post<PromotionsCodesCreateResult>(backendApiPath(`/promotions/codes`));
  }
}

export class SystemPromotionsBudgetLedgerEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/promotions/budget_ledger_entries`));
  }
}

export class SystemPromotionsApi {
  private client: HttpClient;
  public readonly budgetLedgerEntries: SystemPromotionsBudgetLedgerEntriesApi;
  public readonly codes: SystemPromotionsCodesApi;
  public readonly couponLedgerEntries: SystemPromotionsCouponLedgerEntriesApi;
  public readonly couponStocks: SystemPromotionsCouponStocksApi;
  public readonly discountAllocations: SystemPromotionsDiscountAllocationsApi;
  public readonly discountApplications: SystemPromotionsDiscountApplicationsApi;
  public readonly events: SystemPromotionsEventsApi;
  public readonly externalBindings: SystemPromotionsExternalBindingsApi;
  public readonly offers: SystemPromotionsOffersApi;
  public readonly userCoupons: SystemPromotionsUserCouponsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.budgetLedgerEntries = new SystemPromotionsBudgetLedgerEntriesApi(client);
    this.codes = new SystemPromotionsCodesApi(client);
    this.couponLedgerEntries = new SystemPromotionsCouponLedgerEntriesApi(client);
    this.couponStocks = new SystemPromotionsCouponStocksApi(client);
    this.discountAllocations = new SystemPromotionsDiscountAllocationsApi(client);
    this.discountApplications = new SystemPromotionsDiscountApplicationsApi(client);
    this.events = new SystemPromotionsEventsApi(client);
    this.externalBindings = new SystemPromotionsExternalBindingsApi(client);
    this.offers = new SystemPromotionsOffersApi(client);
    this.userCoupons = new SystemPromotionsUserCouponsApi(client);
  }

}

export class SystemEntitlementsLedgerEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/entitlements/ledger_entries`));
  }
}

export class SystemEntitlementsGrantsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/entitlements/grants`));
  }
}

export class SystemEntitlementsAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/entitlements/accounts`));
  }
}

export class SystemEntitlementsApi {
  private client: HttpClient;
  public readonly accounts: SystemEntitlementsAccountsApi;
  public readonly grants: SystemEntitlementsGrantsApi;
  public readonly ledgerEntries: SystemEntitlementsLedgerEntriesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new SystemEntitlementsAccountsApi(client);
    this.grants = new SystemEntitlementsGrantsApi(client);
    this.ledgerEntries = new SystemEntitlementsLedgerEntriesApi(client);
  }

}

export class SystemAfterSalesReviewsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(afterSalesRequestId: string): Promise<AfterSalesReviewsCreateResult> {
    return this.client.post<AfterSalesReviewsCreateResult>(backendApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/reviews`));
  }
}

export class SystemAfterSalesReturnShipmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(afterSalesRequestId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/return_shipments`));
  }
}

export class SystemAfterSalesEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(afterSalesRequestId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/events`));
  }
}

export class SystemAfterSalesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/after_sales/requests`));
  }

/** Retrieve */
  async retrieve(afterSalesRequestId: string): Promise<AfterSalesManagementRetrieveResult> {
    return this.client.get<AfterSalesManagementRetrieveResult>(backendApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}`));
  }
}

export class SystemAfterSalesApi {
  private client: HttpClient;
  public readonly management: SystemAfterSalesManagementApi;
  public readonly events: SystemAfterSalesEventsApi;
  public readonly returnShipments: SystemAfterSalesReturnShipmentsApi;
  public readonly reviews: SystemAfterSalesReviewsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new SystemAfterSalesManagementApi(client);
    this.events = new SystemAfterSalesEventsApi(client);
    this.returnShipments = new SystemAfterSalesReturnShipmentsApi(client);
    this.reviews = new SystemAfterSalesReviewsApi(client);
  }

}

export class SystemApi {
  private client: HttpClient;
  public readonly afterSales: SystemAfterSalesApi;
  public readonly entitlements: SystemEntitlementsApi;
  public readonly promotions: SystemPromotionsApi;
  public readonly reports: SystemReportsApi;
  public readonly shops: SystemShopsApi;
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
    this.afterSales = new SystemAfterSalesApi(client);
    this.entitlements = new SystemEntitlementsApi(client);
    this.promotions = new SystemPromotionsApi(client);
    this.reports = new SystemReportsApi(client);
    this.shops = new SystemShopsApi(client);
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
