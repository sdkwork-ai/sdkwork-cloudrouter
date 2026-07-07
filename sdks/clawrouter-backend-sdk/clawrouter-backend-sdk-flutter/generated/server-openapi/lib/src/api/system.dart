import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class SystemApi {
  final HttpClient _client;

  SystemApi(this._client);

  /// Create
  Future<AfterSalesReviewsCreateResult?> afterSalesReviewsCreate(String afterSalesRequestId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}/reviews'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesReviewsCreateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<AnalyticsAdminOverviewRetrieveResult?> analyticsAdminOverviewRetrieve([String? timeRange, String? startTime, String? endTime, int? rankingSize]) async {
    final query = buildQueryString([
      QueryParameterSpec('time_range', timeRange, 'form', true, false, null),
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('ranking_size', rankingSize, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/analytics/admin/overview'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AnalyticsAdminOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<AuthSettingsRetrieveResult?> authSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/auth/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AuthSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update
  Future<AuthSettingsUpdateResult?> authSettingsUpdate() async {
    final response = await _client.patch(ApiPaths.backendPath('/system/auth/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AuthSettingsUpdateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<CacheInstancesDeleteResult?> cacheInstancesDelete(String instanceName) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/instances/${serializePathParameter(instanceName, const PathParameterSpec('instanceName', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheInstancesDeleteResult.fromJson(map);
    })();
  }

  /// Create
  Future<CacheInstancesRefreshCreateResult?> cacheInstancesRefreshCreate(String instanceName) async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/instances/${serializePathParameter(instanceName, const PathParameterSpec('instanceName', 'simple', false))}/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheInstancesRefreshCreateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<CacheNamespacesDeleteResult?> cacheNamespacesDelete(String namespace) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesDeleteResult.fromJson(map);
    })();
  }

  /// List
  Future<CacheNamespacesKeysListResult?> cacheNamespacesKeysList(String namespace, [int? pageSize, String? cursor]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesKeysListResult.fromJson(map);
    })();
  }

  /// Delete
  Future<CacheNamespacesKeysDeleteResult?> cacheNamespacesKeysDelete(String namespace, String key) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/keys/${serializePathParameter(key, const PathParameterSpec('key', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesKeysDeleteResult.fromJson(map);
    })();
  }

  /// Create
  Future<CacheNamespacesRefreshCreateResult?> cacheNamespacesRefreshCreate(String namespace) async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesRefreshCreateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<CacheOverviewRetrieveResult?> cacheOverviewRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/cache/overview'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// Create
  Future<CacheRefreshCreateResult?> cacheRefreshCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheRefreshCreateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<DashboardAdminOverviewRetrieveResult?> dashboardAdminOverviewRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/dashboard/admin/overview'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DashboardAdminOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<FirewallsRulesListResult?> firewallsRulesList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/firewalls/rules'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesListResult.fromJson(map);
    })();
  }

  /// Create
  Future<FirewallsRulesCreateResult?> firewallsRulesCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/firewalls/rules'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesCreateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<FirewallsRulesDeleteResult?> firewallsRulesDelete(String ruleId) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/firewalls/rules/${serializePathParameter(ruleId, const PathParameterSpec('ruleId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesDeleteResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<InstallationStatusRetrieveResult?> installationStatusRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/installation/status'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InstallationStatusRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<MarketingReferralStatsListResult?> marketingReferralStatsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/marketing/referral_stats'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MarketingReferralStatsListResult.fromJson(map);
    })();
  }

  /// List
  Future<MonitorAlertsListResult?> monitorAlertsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/alerts'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorAlertsListResult.fromJson(map);
    })();
  }

  /// List
  Future<MonitorNodesListResult?> monitorNodesList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/nodes'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorNodesListResult.fromJson(map);
    })();
  }

  /// List
  Future<MonitorPerformanceListResult?> monitorPerformanceList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/performance'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorPerformanceListResult.fromJson(map);
    })();
  }

  /// List
  Future<RateLimitsApiKeysListResult?> rateLimitsApiKeysList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/api_keys'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsApiKeysListResult.fromJson(map);
    })();
  }

  /// Create
  Future<RateLimitsApiKeysCreateResult?> rateLimitsApiKeysCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/api_keys'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsApiKeysCreateResult.fromJson(map);
    })();
  }

  /// List
  Future<RateLimitsIpListResult?> rateLimitsIpList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/ip'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsIpListResult.fromJson(map);
    })();
  }

  /// Create
  Future<RateLimitsIpCreateResult?> rateLimitsIpCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/ip'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsIpCreateResult.fromJson(map);
    })();
  }

  /// List
  Future<RateLimitsModelsListResult?> rateLimitsModelsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/models'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsModelsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<RateLimitsModelsCreateResult?> rateLimitsModelsCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/models'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsModelsCreateResult.fromJson(map);
    })();
  }

  /// List
  Future<RecordsListResult?> recordsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/records'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RecordsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<RuntimeRegionSettingsRetrieveResult?> runtimeRegionSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/runtime_region/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RuntimeRegionSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update
  Future<RuntimeRegionSettingsUpdateResult?> runtimeRegionSettingsUpdate() async {
    final response = await _client.patch(ApiPaths.backendPath('/system/runtime_region/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RuntimeRegionSettingsUpdateResult.fromJson(map);
    })();
  }

  /// List
  Future<ServiceNodesListResult?> serviceNodesList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/service_nodes'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesListResult.fromJson(map);
    })();
  }

  /// Create
  Future<ServiceNodesCreateResult?> serviceNodesCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/service_nodes'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesCreateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<ServiceNodesDeleteResult?> serviceNodesDelete(String nodeId) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesDeleteResult.fromJson(map);
    })();
  }

  /// Update
  Future<ServiceNodesUpdateResult?> serviceNodesUpdate(String nodeId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesUpdateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ServiceNodesStatusUpdateResult?> serviceNodesStatusUpdate(String nodeId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}/status'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesStatusUpdateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCreateResult?> shopsCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsUpdateResult?> shopsUpdate(String shopId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsUpdateResult.fromJson(map);
    })();
  }

  /// Approve
  Future<ShopsApproveResult?> shopsApprove(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/approve'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsApproveResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsBrandAuthorizationsUpsertResult?> shopsBrandAuthorizationsUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/brand_authorizations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsBrandAuthorizationsUpsertResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsBusinessHoursUpdateResult?> shopsBusinessHoursUpdate(String shopId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/business_hours'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsBusinessHoursUpdateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCategoryBindingsUpsertResult?> shopsCategoryBindingsUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/category_bindings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCategoryBindingsUpsertResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsChannelsCreateResult?> shopsChannelsCreate(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsChannelsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsChannelsUpdateResult?> shopsChannelsUpdate(String shopId, String channelId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/channels/${serializePathParameter(channelId, const PathParameterSpec('channelId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsChannelsUpdateResult.fromJson(map);
    })();
  }

  /// Close
  Future<ShopsCloseResult?> shopsClose(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/close'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCloseResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCustomerServicesUpsertResult?> shopsCustomerServicesUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/customer_services'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCustomerServicesUpsertResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsDepositAccountUpdateResult?> shopsDepositAccountUpdate(String shopId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/deposit_account'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsDepositAccountUpdateResult.fromJson(map);
    })();
  }

  /// Review
  Future<ShopsDepositAccountReviewResult?> shopsDepositAccountReview(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/deposit_account/review'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsDepositAccountReviewResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsFulfillmentProfileUpdateResult?> shopsFulfillmentProfileUpdate(String shopId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/fulfillment_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsFulfillmentProfileUpdateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsPoliciesCreateResult?> shopsPoliciesCreate(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/policies'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsPoliciesCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsPoliciesUpdateResult?> shopsPoliciesUpdate(String shopId, String policyId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/policies/${serializePathParameter(policyId, const PathParameterSpec('policyId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsPoliciesUpdateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsQualificationsUpsertResult?> shopsQualificationsUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/qualifications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsQualificationsUpsertResult.fromJson(map);
    })();
  }

  /// Reject
  Future<ShopsRejectResult?> shopsReject(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/reject'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsRejectResult.fromJson(map);
    })();
  }

  /// Resume
  Future<ShopsResumeResult?> shopsResume(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/resume'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsResumeResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsReturnAddressesUpsertResult?> shopsReturnAddressesUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/return_addresses'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsReturnAddressesUpsertResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsRiskSignalsCreateResult?> shopsRiskSignalsCreate(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/risk_signals'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsRiskSignalsCreateResult.fromJson(map);
    })();
  }

  /// Resolve
  Future<ShopsRiskSignalsResolveResult?> shopsRiskSignalsResolve(String shopId, String riskSignalId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/risk_signals/${serializePathParameter(riskSignalId, const PathParameterSpec('riskSignalId', 'simple', false))}/resolve'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsRiskSignalsResolveResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsServiceAreasCreateResult?> shopsServiceAreasCreate(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/service_areas'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsServiceAreasCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsServiceAreasUpdateResult?> shopsServiceAreasUpdate(String shopId, String serviceAreaId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/service_areas/${serializePathParameter(serviceAreaId, const PathParameterSpec('serviceAreaId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsServiceAreasUpdateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsSettlementProfileUpdateResult?> shopsSettlementProfileUpdate(String shopId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/settlement_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsSettlementProfileUpdateResult.fromJson(map);
    })();
  }

  /// Approve
  Future<ShopsSettlementProfileApproveResult?> shopsSettlementProfileApprove(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/settlement_profile/approve'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsSettlementProfileApproveResult.fromJson(map);
    })();
  }

  /// Reject
  Future<ShopsSettlementProfileRejectResult?> shopsSettlementProfileReject(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/settlement_profile/reject'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsSettlementProfileRejectResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsShippingTemplatesUpsertResult?> shopsShippingTemplatesUpsert(String shopId) async {
    final response = await _client.put(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/shipping_templates'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsShippingTemplatesUpsertResult.fromJson(map);
    })();
  }

  /// Create review
  Future<ShopsSubmitReviewResult?> shopsSubmitReview(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/submit_review'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsSubmitReviewResult.fromJson(map);
    })();
  }

  /// Suspend
  Future<ShopsSuspendResult?> shopsSuspend(String shopId) async {
    final response = await _client.post(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/suspend'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsSuspendResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsVerificationsUpdateResult?> shopsVerificationsUpdate(String shopId, String verificationId) async {
    final response = await _client.patch(ApiPaths.backendPath('/system/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}/verifications/${serializePathParameter(verificationId, const PathParameterSpec('verificationId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsVerificationsUpdateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<SiteSettingsRetrieveResult?> siteSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/site/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SiteSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update
  Future<SiteSettingsUpdateResult?> siteSettingsUpdate() async {
    final response = await _client.patch(ApiPaths.backendPath('/system/site/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SiteSettingsUpdateResult.fromJson(map);
    })();
  }
}

class PathParameterSpec {
  final String name;
  final String style;
  final bool explode;

  const PathParameterSpec(this.name, this.style, this.explode);
}

String serializePathParameter(dynamic value, PathParameterSpec spec) {
  if (value == null) return '';
  final style = spec.style.trim().isEmpty ? 'simple' : spec.style;
  if (value is Iterable) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (value is Map) {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrimitivePrefix(spec.name, style) + Uri.encodeComponent(value.toString());
}

String serializePathArray(String name, Iterable values, String style, bool explode) {
  final serialized = values.where((item) => item != null).map((item) => Uri.encodeComponent(item.toString())).toList();
  if (serialized.isEmpty) return pathPrefix(name, style);
  if (style == 'matrix') {
    if (explode) {
      return serialized.map((item) => ';$name=$item').join();
    }
    return ';$name=${serialized.join(',')}';
  }
  final separator = explode ? '.' : ',';
  return pathPrefix(name, style) + serialized.join(separator);
}

String serializePathObject(String name, Map values, String style, bool explode) {
  final entries = <String>[];
  final exploded = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    final escapedKey = Uri.encodeComponent(key.toString());
    final escapedValue = Uri.encodeComponent(value.toString());
    if (explode) {
      if (style == 'matrix') {
        exploded.add(';$escapedKey=$escapedValue');
      } else {
        exploded.add('$escapedKey=$escapedValue');
      }
    } else {
      entries.add(escapedKey);
      entries.add(escapedValue);
    }
  });
  if (style == 'matrix') {
    if (explode) return exploded.join();
    return ';$name=${entries.join(',')}';
  }
  if (explode) {
    final separator = style == 'label' ? '.' : ',';
    return pathPrefix(name, style) + exploded.join(separator);
  }
  return pathPrefix(name, style) + entries.join(',');
}

String pathPrefix(String name, String style) {
  if (style == 'label') return '.';
  if (style == 'matrix') return ';$name';
  return '';
}

String pathPrimitivePrefix(String name, String style) {
  return style == 'matrix' ? ';$name=' : pathPrefix(name, style);
}
class QueryParameterSpec {
  final String name;
  final dynamic value;
  final String style;
  final bool explode;
  final bool allowReserved;
  final String? contentType;

  const QueryParameterSpec(
    this.name,
    this.value,
    this.style,
    this.explode,
    this.allowReserved,
    this.contentType,
  );
}

String buildQueryString(List<QueryParameterSpec> parameters) {
  final pairs = <String>[];
  for (final parameter in parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) {
  final value = parameter.value;
  if (value == null) return;

  final contentType = parameter.contentType;
  if (contentType != null && contentType.trim().isNotEmpty) {
    pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(jsonEncode(value), parameter.allowReserved)}');
    return;
  }

  final style = parameter.style.trim().isEmpty ? 'form' : parameter.style;
  if (style == 'deepObject' && value is Map) {
    appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved);
    return;
  }
  if (value is Iterable) {
    appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (value is Map) {
    appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(value.toString(), parameter.allowReserved)}');
}

void appendArrayParameter(
  List<String> pairs,
  String name,
  Iterable values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = values.where((item) => item != null).map((item) => item.toString()).toList();
  if (serialized.isEmpty) return;
  if (style == 'form' && explode) {
    for (final item in serialized) {
      pairs.add('${urlEncode(name)}=${encodeQueryValue(item, allowReserved)}');
    }
    return;
  }
  pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
}

void appendObjectParameter(
  List<String> pairs,
  String name,
  Map values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    if (style == 'form' && explode) {
      pairs.add('${urlEncode(key.toString())}=${encodeQueryValue(value.toString(), allowReserved)}');
      return;
    }
    serialized.add(key.toString());
    serialized.add(value.toString());
  });
  if (serialized.isNotEmpty) {
    pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
  }
}

void appendDeepObjectParameter(List<String> pairs, String name, Map values, bool allowReserved) {
  values.forEach((key, value) {
    if (value != null) {
      pairs.add('${urlEncode('$name[$key]')}=${encodeQueryValue(value.toString(), allowReserved)}');
    }
  });
}

String encodeQueryValue(String value, bool allowReserved) {
  var encoded = urlEncode(value);
  if (!allowReserved) return encoded;
  const replacements = <String, String>{
    '%3A': ':',
    '%2F': '/',
    '%3F': '?',
    '%23': '#',
    '%5B': '[',
    '%5D': ']',
    '%40': '@',
    '%21': '!',
    '%24': r'$',
    '%26': '&',
    '%27': "'",
    '%28': '(',
    '%29': ')',
    '%2A': '*',
    '%2B': '+',
    '%2C': ',',
    '%3B': ';',
    '%3D': '=',
  };
  replacements.forEach((escaped, reserved) {
    encoded = encoded.replaceAll(escaped, reserved);
  });
  return encoded;
}

String urlEncode(String value) => Uri.encodeQueryComponent(value);
