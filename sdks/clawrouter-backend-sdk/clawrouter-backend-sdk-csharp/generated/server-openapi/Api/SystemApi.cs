using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class SystemApi
    {
        private readonly SdkHttpClient _client;

        public SystemApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AfterSalesReviewsCreateResult?> AfterSalesReviewsCreateAsync(string afterSalesRequestId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.AfterSalesReviewsCreateResult>(ApiPaths.BackendPath($"/system/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}/reviews"), null);
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AnalyticsAdminOverviewRetrieveResult?> AnalyticsAdminOverviewRetrieveAsync(string? timeRange = null, string? startTime = null, string? endTime = null, int? rankingSize = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("time_range", timeRange, "form", true, false, null),
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("ranking_size", rankingSize, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AnalyticsAdminOverviewRetrieveResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/system/analytics/admin/overview"), queryString));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AuthSettingsRetrieveResult?> AuthSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AuthSettingsRetrieveResult>(ApiPaths.BackendPath("/system/auth/settings"));
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AuthSettingsUpdateResult?> AuthSettingsUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.AuthSettingsUpdateResult>(ApiPaths.BackendPath("/system/auth/settings"), null);
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheInstancesDeleteResult?> CacheInstancesDeleteAsync(string instanceName)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheInstancesDeleteResult>(ApiPaths.BackendPath($"/system/cache/instances/{SerializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false))}"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheInstancesRefreshCreateResult?> CacheInstancesRefreshCreateAsync(string instanceName)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheInstancesRefreshCreateResult>(ApiPaths.BackendPath($"/system/cache/instances/{SerializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false))}/refresh"), null);
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesDeleteResult?> CacheNamespacesDeleteAsync(string namespace_)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesDeleteResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysListResult?> CacheNamespacesKeysListAsync(string namespace_, int? pageSize = null, string? cursor = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/keys"), queryString));
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysDeleteResult?> CacheNamespacesKeysDeleteAsync(string namespace_, string key)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysDeleteResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/keys/{SerializePathParameter(key, new PathParameterSpec("key", "simple", false))}"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesRefreshCreateResult?> CacheNamespacesRefreshCreateAsync(string namespace_)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesRefreshCreateResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/refresh"), null);
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheOverviewRetrieveResult?> CacheOverviewRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.CacheOverviewRetrieveResult>(ApiPaths.BackendPath("/system/cache/overview"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheRefreshCreateResult?> CacheRefreshCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheRefreshCreateResult>(ApiPaths.BackendPath("/system/cache/refresh"), null);
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.DashboardAdminOverviewRetrieveResult?> DashboardAdminOverviewRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.DashboardAdminOverviewRetrieveResult>(ApiPaths.BackendPath("/system/dashboard/admin/overview"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesListResult?> FirewallsRulesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesListResult>(ApiPaths.BackendPath("/system/firewalls/rules"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesCreateResult?> FirewallsRulesCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesCreateResult>(ApiPaths.BackendPath("/system/firewalls/rules"), null);
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesDeleteResult?> FirewallsRulesDeleteAsync(string ruleId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesDeleteResult>(ApiPaths.BackendPath($"/system/firewalls/rules/{SerializePathParameter(ruleId, new PathParameterSpec("ruleId", "simple", false))}"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.InstallationStatusRetrieveResult?> InstallationStatusRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.InstallationStatusRetrieveResult>(ApiPaths.BackendPath("/system/installation/status"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MarketingReferralStatsListResult?> MarketingReferralStatsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MarketingReferralStatsListResult>(ApiPaths.BackendPath("/system/marketing/referral_stats"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorAlertsListResult?> MonitorAlertsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorAlertsListResult>(ApiPaths.BackendPath("/system/monitor/alerts"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorNodesListResult?> MonitorNodesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorNodesListResult>(ApiPaths.BackendPath("/system/monitor/nodes"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorPerformanceListResult?> MonitorPerformanceListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorPerformanceListResult>(ApiPaths.BackendPath("/system/monitor/performance"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysListResult?> RateLimitsApiKeysListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysListResult>(ApiPaths.BackendPath("/system/rate_limits/api_keys"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysCreateResult?> RateLimitsApiKeysCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysCreateResult>(ApiPaths.BackendPath("/system/rate_limits/api_keys"), null);
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpListResult?> RateLimitsIpListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpListResult>(ApiPaths.BackendPath("/system/rate_limits/ip"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpCreateResult?> RateLimitsIpCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpCreateResult>(ApiPaths.BackendPath("/system/rate_limits/ip"), null);
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsListResult?> RateLimitsModelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsListResult>(ApiPaths.BackendPath("/system/rate_limits/models"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsCreateResult?> RateLimitsModelsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsCreateResult>(ApiPaths.BackendPath("/system/rate_limits/models"), null);
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RecordsListResult?> RecordsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RecordsListResult>(ApiPaths.BackendPath("/system/records"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsRetrieveResult?> RuntimeRegionSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsRetrieveResult>(ApiPaths.BackendPath("/system/runtime_region/settings"));
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsUpdateResult?> RuntimeRegionSettingsUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsUpdateResult>(ApiPaths.BackendPath("/system/runtime_region/settings"), null);
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesListResult?> ServiceNodesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesListResult>(ApiPaths.BackendPath("/system/service_nodes"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesCreateResult?> ServiceNodesCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesCreateResult>(ApiPaths.BackendPath("/system/service_nodes"), null);
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesDeleteResult?> ServiceNodesDeleteAsync(string nodeId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesDeleteResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}"));
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesUpdateResult?> ServiceNodesUpdateAsync(string nodeId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesUpdateResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesStatusUpdateResult?> ServiceNodesStatusUpdateAsync(string nodeId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesStatusUpdateResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}/status"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsCreateResult?> ShopsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsCreateResult>(ApiPaths.BackendPath("/system/shops"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsUpdateResult?> ShopsUpdateAsync(string shopId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}"), null);
        }

        /// <summary>
        /// Approve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsApproveResult?> ShopsApproveAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsApproveResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/approve"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsBrandAuthorizationsUpsertResult?> ShopsBrandAuthorizationsUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsBrandAuthorizationsUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/brand_authorizations"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsBusinessHoursUpdateResult?> ShopsBusinessHoursUpdateAsync(string shopId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsBusinessHoursUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/business_hours"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsCategoryBindingsUpsertResult?> ShopsCategoryBindingsUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsCategoryBindingsUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/category_bindings"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsChannelsCreateResult?> ShopsChannelsCreateAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsChannelsCreateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/channels"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsChannelsUpdateResult?> ShopsChannelsUpdateAsync(string shopId, string channelId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsChannelsUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}"), null);
        }

        /// <summary>
        /// Close
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsCloseResult?> ShopsCloseAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsCloseResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/close"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsCustomerServicesUpsertResult?> ShopsCustomerServicesUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsCustomerServicesUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/customer_services"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsDepositAccountUpdateResult?> ShopsDepositAccountUpdateAsync(string shopId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsDepositAccountUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/deposit_account"), null);
        }

        /// <summary>
        /// Review
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsDepositAccountReviewResult?> ShopsDepositAccountReviewAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsDepositAccountReviewResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/deposit_account/review"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsFulfillmentProfileUpdateResult?> ShopsFulfillmentProfileUpdateAsync(string shopId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsFulfillmentProfileUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/fulfillment_profile"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsPoliciesCreateResult?> ShopsPoliciesCreateAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsPoliciesCreateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/policies"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsPoliciesUpdateResult?> ShopsPoliciesUpdateAsync(string shopId, string policyId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsPoliciesUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/policies/{SerializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false))}"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsQualificationsUpsertResult?> ShopsQualificationsUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsQualificationsUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/qualifications"), null);
        }

        /// <summary>
        /// Reject
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsRejectResult?> ShopsRejectAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsRejectResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/reject"), null);
        }

        /// <summary>
        /// Resume
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsResumeResult?> ShopsResumeAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsResumeResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/resume"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsReturnAddressesUpsertResult?> ShopsReturnAddressesUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsReturnAddressesUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/return_addresses"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsRiskSignalsCreateResult?> ShopsRiskSignalsCreateAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsRiskSignalsCreateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/risk_signals"), null);
        }

        /// <summary>
        /// Resolve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsRiskSignalsResolveResult?> ShopsRiskSignalsResolveAsync(string shopId, string riskSignalId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsRiskSignalsResolveResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/risk_signals/{SerializePathParameter(riskSignalId, new PathParameterSpec("riskSignalId", "simple", false))}/resolve"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsServiceAreasCreateResult?> ShopsServiceAreasCreateAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsServiceAreasCreateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/service_areas"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsServiceAreasUpdateResult?> ShopsServiceAreasUpdateAsync(string shopId, string serviceAreaId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsServiceAreasUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/service_areas/{SerializePathParameter(serviceAreaId, new PathParameterSpec("serviceAreaId", "simple", false))}"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileUpdateResult?> ShopsSettlementProfileUpdateAsync(string shopId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/settlement_profile"), null);
        }

        /// <summary>
        /// Approve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileApproveResult?> ShopsSettlementProfileApproveAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileApproveResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/settlement_profile/approve"), null);
        }

        /// <summary>
        /// Reject
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileRejectResult?> ShopsSettlementProfileRejectAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsSettlementProfileRejectResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/settlement_profile/reject"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsShippingTemplatesUpsertResult?> ShopsShippingTemplatesUpsertAsync(string shopId)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ShopsShippingTemplatesUpsertResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/shipping_templates"), null);
        }

        /// <summary>
        /// Create review
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsSubmitReviewResult?> ShopsSubmitReviewAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsSubmitReviewResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/submit_review"), null);
        }

        /// <summary>
        /// Suspend
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsSuspendResult?> ShopsSuspendAsync(string shopId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ShopsSuspendResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/suspend"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ShopsVerificationsUpdateResult?> ShopsVerificationsUpdateAsync(string shopId, string verificationId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ShopsVerificationsUpdateResult>(ApiPaths.BackendPath($"/system/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}/verifications/{SerializePathParameter(verificationId, new PathParameterSpec("verificationId", "simple", false))}"), null);
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.SiteSettingsRetrieveResult?> SiteSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.SiteSettingsRetrieveResult>(ApiPaths.BackendPath("/system/site/settings"));
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.SiteSettingsUpdateResult?> SiteSettingsUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.SiteSettingsUpdateResult>(ApiPaths.BackendPath("/system/site/settings"), null);
        }

        private sealed record PathParameterSpec(string Name, string Style, bool Explode);

        private static string SerializePathParameter(object? value, PathParameterSpec spec)
        {
            if (value is null)
            {
                return string.Empty;
            }
            var style = string.IsNullOrWhiteSpace(spec.Style) ? "simple" : spec.Style;
            if (value is System.Collections.IDictionary dictionary)
            {
                return SerializePathObject(spec.Name, dictionary, style, spec.Explode);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return SerializePathArray(spec.Name, enumerable, style, spec.Explode);
            }
            return PathPrimitivePrefix(spec.Name, style) + Uri.EscapeDataString(value.ToString() ?? string.Empty);
        }

        private static string SerializePathArray(string name, System.Collections.IEnumerable values, string style, bool explode)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(Uri.EscapeDataString(item.ToString() ?? string.Empty));
                }
            }
            if (serialized.Count == 0)
            {
                return PathPrefix(name, style);
            }
            if (style == "matrix")
            {
                if (explode)
                {
                    var parts = new List<string>();
                    foreach (var item in serialized)
                    {
                        parts.Add(";" + name + "=" + item);
                    }
                    return string.Join(string.Empty, parts);
                }
                return ";" + name + "=" + string.Join(",", serialized);
            }
            var separator = explode ? "." : ",";
            return PathPrefix(name, style) + string.Join(separator, serialized);
        }

        private static string SerializePathObject(string name, System.Collections.IDictionary values, string style, bool explode)
        {
            var entries = new List<string>();
            var exploded = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                var escapedKey = Uri.EscapeDataString(item.Key.ToString() ?? string.Empty);
                var escapedValue = Uri.EscapeDataString(item.Value.ToString() ?? string.Empty);
                if (explode)
                {
                    exploded.Add(style == "matrix" ? ";" + escapedKey + "=" + escapedValue : escapedKey + "=" + escapedValue);
                }
                else
                {
                    entries.Add(escapedKey);
                    entries.Add(escapedValue);
                }
            }
            if (style == "matrix")
            {
                return explode ? string.Join(string.Empty, exploded) : ";" + name + "=" + string.Join(",", entries);
            }
            if (explode)
            {
                var separator = style == "label" ? "." : ",";
                return PathPrefix(name, style) + string.Join(separator, exploded);
            }
            return PathPrefix(name, style) + string.Join(",", entries);
        }

        private static string PathPrefix(string name, string style)
        {
            return style switch
            {
                "label" => ".",
                "matrix" => ";" + name,
                _ => string.Empty,
            };
        }

        private static string PathPrimitivePrefix(string name, string style)
        {
            return style == "matrix" ? ";" + name + "=" : PathPrefix(name, style);
        }

        private sealed record QueryParameterSpec(
            string Name,
            object? Value,
            string Style,
            bool Explode,
            bool AllowReserved,
            string? ContentType);

        private static string BuildQueryString(IEnumerable<QueryParameterSpec> parameters)
        {
            var pairs = new List<string>();
            foreach (var parameter in parameters)
            {
                AppendSerializedParameter(pairs, parameter);
            }
            return string.Join("&", pairs);
        }

        private static void AppendSerializedParameter(List<string> pairs, QueryParameterSpec parameter)
        {
            if (parameter.Value is null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(parameter.ContentType))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(parameter.Value);
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(json, parameter.AllowReserved));
                return;
            }

            var style = string.IsNullOrWhiteSpace(parameter.Style) ? "form" : parameter.Style;
            if (style == "deepObject" && parameter.Value is System.Collections.IDictionary deepObject)
            {
                AppendDeepObjectParameter(pairs, parameter.Name, deepObject, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IEnumerable enumerable && parameter.Value is not string && parameter.Value is not System.Collections.IDictionary)
            {
                AppendArrayParameter(pairs, parameter.Name, enumerable, style, parameter.Explode, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IDictionary dictionary)
            {
                AppendObjectParameter(pairs, parameter.Name, dictionary, style, parameter.Explode, parameter.AllowReserved);
            }
            else
            {
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(parameter.Value.ToString() ?? string.Empty, parameter.AllowReserved));
            }
        }

        private static void AppendArrayParameter(List<string> pairs, string name, System.Collections.IEnumerable values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(item.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count == 0)
            {
                return;
            }
            if (style == "form" && explode)
            {
                foreach (var item in serialized)
                {
                    pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(item, allowReserved));
                }
                return;
            }
            pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
        }

        private static void AppendObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                if (style == "form" && explode)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key.ToString() ?? string.Empty) + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
                else
                {
                    serialized.Add(item.Key.ToString() ?? string.Empty);
                    serialized.Add(item.Value.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count > 0)
            {
                pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
            }
        }

        private static void AppendDeepObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, bool allowReserved)
        {
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is not null)
                {
                    pairs.Add(Uri.EscapeDataString(name + "[" + item.Key + "]") + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
            }
        }

        private static string EncodeQueryValue(string value, bool allowReserved)
        {
            var encoded = Uri.EscapeDataString(value);
            if (!allowReserved)
            {
                return encoded;
            }
            return encoded
                .Replace("%3A", ":").Replace("%2F", "/").Replace("%3F", "?").Replace("%23", "#")
                .Replace("%5B", "[").Replace("%5D", "]").Replace("%40", "@").Replace("%21", "!")
                .Replace("%24", "$").Replace("%26", "&").Replace("%27", "'").Replace("%28", "(")
                .Replace("%29", ")").Replace("%2A", "*").Replace("%2B", "+").Replace("%2C", ",")
                .Replace("%3B", ";").Replace("%3D", "=");
        }

    }
}
