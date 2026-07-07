package com.sdkwork.clawrouter.backend.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.model.*;
import java.util.List;
import java.util.Map;

public class SystemApi {
    private final HttpClient client;

    public SystemApi(HttpClient client) {
        this.client = client;
    }

    /** Create */
    public AfterSalesReviewsCreateResult afterSalesReviewsCreate(String afterSalesRequestId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + "/reviews"), null);
        return client.convertValue(raw, new TypeReference<AfterSalesReviewsCreateResult>() {});
    }

    /** Retrieve */
    public AnalyticsAdminOverviewRetrieveResult analyticsAdminOverviewRetrieve(String timeRange, String startTime, String endTime, Integer rankingSize) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("time_range", timeRange, "form", true, false, null),
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("ranking_size", rankingSize, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/analytics/admin/overview"), query));
        return client.convertValue(raw, new TypeReference<AnalyticsAdminOverviewRetrieveResult>() {});
    }

    /** Retrieve */
    public AuthSettingsRetrieveResult authSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/auth/settings"));
        return client.convertValue(raw, new TypeReference<AuthSettingsRetrieveResult>() {});
    }

    /** Update */
    public AuthSettingsUpdateResult authSettingsUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/auth/settings"), null);
        return client.convertValue(raw, new TypeReference<AuthSettingsUpdateResult>() {});
    }

    /** Delete */
    public CacheInstancesDeleteResult cacheInstancesDelete(String instanceName) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/instances/" + serializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheInstancesDeleteResult>() {});
    }

    /** Create */
    public CacheInstancesRefreshCreateResult cacheInstancesRefreshCreate(String instanceName) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/instances/" + serializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false)) + "/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheInstancesRefreshCreateResult>() {});
    }

    /** Delete */
    public CacheNamespacesDeleteResult cacheNamespacesDelete(String namespace) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheNamespacesDeleteResult>() {});
    }

    /** List */
    public CacheNamespacesKeysListResult cacheNamespacesKeysList(String namespace, Integer pageSize, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/keys"), query));
        return client.convertValue(raw, new TypeReference<CacheNamespacesKeysListResult>() {});
    }

    /** Delete */
    public CacheNamespacesKeysDeleteResult cacheNamespacesKeysDelete(String namespace, String key) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/keys/" + serializePathParameter(key, new PathParameterSpec("key", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheNamespacesKeysDeleteResult>() {});
    }

    /** Create */
    public CacheNamespacesRefreshCreateResult cacheNamespacesRefreshCreate(String namespace) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheNamespacesRefreshCreateResult>() {});
    }

    /** Retrieve */
    public CacheOverviewRetrieveResult cacheOverviewRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/cache/overview"));
        return client.convertValue(raw, new TypeReference<CacheOverviewRetrieveResult>() {});
    }

    /** Create */
    public CacheRefreshCreateResult cacheRefreshCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheRefreshCreateResult>() {});
    }

    /** Retrieve */
    public DashboardAdminOverviewRetrieveResult dashboardAdminOverviewRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/dashboard/admin/overview"));
        return client.convertValue(raw, new TypeReference<DashboardAdminOverviewRetrieveResult>() {});
    }

    /** List */
    public FirewallsRulesListResult firewallsRulesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/firewalls/rules"));
        return client.convertValue(raw, new TypeReference<FirewallsRulesListResult>() {});
    }

    /** Create */
    public FirewallsRulesCreateResult firewallsRulesCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/firewalls/rules"), null);
        return client.convertValue(raw, new TypeReference<FirewallsRulesCreateResult>() {});
    }

    /** Delete */
    public FirewallsRulesDeleteResult firewallsRulesDelete(String ruleId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/firewalls/rules/" + serializePathParameter(ruleId, new PathParameterSpec("ruleId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<FirewallsRulesDeleteResult>() {});
    }

    /** Retrieve */
    public InstallationStatusRetrieveResult installationStatusRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/installation/status"));
        return client.convertValue(raw, new TypeReference<InstallationStatusRetrieveResult>() {});
    }

    /** List */
    public MarketingReferralStatsListResult marketingReferralStatsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/marketing/referral_stats"));
        return client.convertValue(raw, new TypeReference<MarketingReferralStatsListResult>() {});
    }

    /** List */
    public MonitorAlertsListResult monitorAlertsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/alerts"));
        return client.convertValue(raw, new TypeReference<MonitorAlertsListResult>() {});
    }

    /** List */
    public MonitorNodesListResult monitorNodesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/nodes"));
        return client.convertValue(raw, new TypeReference<MonitorNodesListResult>() {});
    }

    /** List */
    public MonitorPerformanceListResult monitorPerformanceList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/performance"));
        return client.convertValue(raw, new TypeReference<MonitorPerformanceListResult>() {});
    }

    /** List */
    public RateLimitsApiKeysListResult rateLimitsApiKeysList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/api_keys"));
        return client.convertValue(raw, new TypeReference<RateLimitsApiKeysListResult>() {});
    }

    /** Create */
    public RateLimitsApiKeysCreateResult rateLimitsApiKeysCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/api_keys"), null);
        return client.convertValue(raw, new TypeReference<RateLimitsApiKeysCreateResult>() {});
    }

    /** List */
    public RateLimitsIpListResult rateLimitsIpList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/ip"));
        return client.convertValue(raw, new TypeReference<RateLimitsIpListResult>() {});
    }

    /** Create */
    public RateLimitsIpCreateResult rateLimitsIpCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/ip"), null);
        return client.convertValue(raw, new TypeReference<RateLimitsIpCreateResult>() {});
    }

    /** List */
    public RateLimitsModelsListResult rateLimitsModelsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/models"));
        return client.convertValue(raw, new TypeReference<RateLimitsModelsListResult>() {});
    }

    /** Create */
    public RateLimitsModelsCreateResult rateLimitsModelsCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/models"), null);
        return client.convertValue(raw, new TypeReference<RateLimitsModelsCreateResult>() {});
    }

    /** List */
    public RecordsListResult recordsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/records"));
        return client.convertValue(raw, new TypeReference<RecordsListResult>() {});
    }

    /** Retrieve */
    public RuntimeRegionSettingsRetrieveResult runtimeRegionSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/runtime_region/settings"));
        return client.convertValue(raw, new TypeReference<RuntimeRegionSettingsRetrieveResult>() {});
    }

    /** Update */
    public RuntimeRegionSettingsUpdateResult runtimeRegionSettingsUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/runtime_region/settings"), null);
        return client.convertValue(raw, new TypeReference<RuntimeRegionSettingsUpdateResult>() {});
    }

    /** List */
    public ServiceNodesListResult serviceNodesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/service_nodes"));
        return client.convertValue(raw, new TypeReference<ServiceNodesListResult>() {});
    }

    /** Create */
    public ServiceNodesCreateResult serviceNodesCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/service_nodes"), null);
        return client.convertValue(raw, new TypeReference<ServiceNodesCreateResult>() {});
    }

    /** Delete */
    public ServiceNodesDeleteResult serviceNodesDelete(String nodeId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ServiceNodesDeleteResult>() {});
    }

    /** Update */
    public ServiceNodesUpdateResult serviceNodesUpdate(String nodeId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ServiceNodesUpdateResult>() {});
    }

    /** Update */
    public ServiceNodesStatusUpdateResult serviceNodesStatusUpdate(String nodeId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/status"), null);
        return client.convertValue(raw, new TypeReference<ServiceNodesStatusUpdateResult>() {});
    }

    /** Create */
    public ShopsCreateResult shopsCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops"), null);
        return client.convertValue(raw, new TypeReference<ShopsCreateResult>() {});
    }

    /** Update */
    public ShopsUpdateResult shopsUpdate(String shopId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsUpdateResult>() {});
    }

    /** Approve */
    public ShopsApproveResult shopsApprove(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/approve"), null);
        return client.convertValue(raw, new TypeReference<ShopsApproveResult>() {});
    }

    /** Upsert */
    public ShopsBrandAuthorizationsUpsertResult shopsBrandAuthorizationsUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/brand_authorizations"), null);
        return client.convertValue(raw, new TypeReference<ShopsBrandAuthorizationsUpsertResult>() {});
    }

    /** Update */
    public ShopsBusinessHoursUpdateResult shopsBusinessHoursUpdate(String shopId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/business_hours"), null);
        return client.convertValue(raw, new TypeReference<ShopsBusinessHoursUpdateResult>() {});
    }

    /** Upsert */
    public ShopsCategoryBindingsUpsertResult shopsCategoryBindingsUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/category_bindings"), null);
        return client.convertValue(raw, new TypeReference<ShopsCategoryBindingsUpsertResult>() {});
    }

    /** Create */
    public ShopsChannelsCreateResult shopsChannelsCreate(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/channels"), null);
        return client.convertValue(raw, new TypeReference<ShopsChannelsCreateResult>() {});
    }

    /** Update */
    public ShopsChannelsUpdateResult shopsChannelsUpdate(String shopId, String channelId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/channels/" + serializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsChannelsUpdateResult>() {});
    }

    /** Close */
    public ShopsCloseResult shopsClose(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/close"), null);
        return client.convertValue(raw, new TypeReference<ShopsCloseResult>() {});
    }

    /** Upsert */
    public ShopsCustomerServicesUpsertResult shopsCustomerServicesUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/customer_services"), null);
        return client.convertValue(raw, new TypeReference<ShopsCustomerServicesUpsertResult>() {});
    }

    /** Update */
    public ShopsDepositAccountUpdateResult shopsDepositAccountUpdate(String shopId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/deposit_account"), null);
        return client.convertValue(raw, new TypeReference<ShopsDepositAccountUpdateResult>() {});
    }

    /** Review */
    public ShopsDepositAccountReviewResult shopsDepositAccountReview(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/deposit_account/review"), null);
        return client.convertValue(raw, new TypeReference<ShopsDepositAccountReviewResult>() {});
    }

    /** Update */
    public ShopsFulfillmentProfileUpdateResult shopsFulfillmentProfileUpdate(String shopId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/fulfillment_profile"), null);
        return client.convertValue(raw, new TypeReference<ShopsFulfillmentProfileUpdateResult>() {});
    }

    /** Create */
    public ShopsPoliciesCreateResult shopsPoliciesCreate(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/policies"), null);
        return client.convertValue(raw, new TypeReference<ShopsPoliciesCreateResult>() {});
    }

    /** Update */
    public ShopsPoliciesUpdateResult shopsPoliciesUpdate(String shopId, String policyId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsPoliciesUpdateResult>() {});
    }

    /** Upsert */
    public ShopsQualificationsUpsertResult shopsQualificationsUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/qualifications"), null);
        return client.convertValue(raw, new TypeReference<ShopsQualificationsUpsertResult>() {});
    }

    /** Reject */
    public ShopsRejectResult shopsReject(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/reject"), null);
        return client.convertValue(raw, new TypeReference<ShopsRejectResult>() {});
    }

    /** Resume */
    public ShopsResumeResult shopsResume(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/resume"), null);
        return client.convertValue(raw, new TypeReference<ShopsResumeResult>() {});
    }

    /** Upsert */
    public ShopsReturnAddressesUpsertResult shopsReturnAddressesUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/return_addresses"), null);
        return client.convertValue(raw, new TypeReference<ShopsReturnAddressesUpsertResult>() {});
    }

    /** Create */
    public ShopsRiskSignalsCreateResult shopsRiskSignalsCreate(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/risk_signals"), null);
        return client.convertValue(raw, new TypeReference<ShopsRiskSignalsCreateResult>() {});
    }

    /** Resolve */
    public ShopsRiskSignalsResolveResult shopsRiskSignalsResolve(String shopId, String riskSignalId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/risk_signals/" + serializePathParameter(riskSignalId, new PathParameterSpec("riskSignalId", "simple", false)) + "/resolve"), null);
        return client.convertValue(raw, new TypeReference<ShopsRiskSignalsResolveResult>() {});
    }

    /** Create */
    public ShopsServiceAreasCreateResult shopsServiceAreasCreate(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/service_areas"), null);
        return client.convertValue(raw, new TypeReference<ShopsServiceAreasCreateResult>() {});
    }

    /** Update */
    public ShopsServiceAreasUpdateResult shopsServiceAreasUpdate(String shopId, String serviceAreaId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/service_areas/" + serializePathParameter(serviceAreaId, new PathParameterSpec("serviceAreaId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsServiceAreasUpdateResult>() {});
    }

    /** Update */
    public ShopsSettlementProfileUpdateResult shopsSettlementProfileUpdate(String shopId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/settlement_profile"), null);
        return client.convertValue(raw, new TypeReference<ShopsSettlementProfileUpdateResult>() {});
    }

    /** Approve */
    public ShopsSettlementProfileApproveResult shopsSettlementProfileApprove(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/settlement_profile/approve"), null);
        return client.convertValue(raw, new TypeReference<ShopsSettlementProfileApproveResult>() {});
    }

    /** Reject */
    public ShopsSettlementProfileRejectResult shopsSettlementProfileReject(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/settlement_profile/reject"), null);
        return client.convertValue(raw, new TypeReference<ShopsSettlementProfileRejectResult>() {});
    }

    /** Upsert */
    public ShopsShippingTemplatesUpsertResult shopsShippingTemplatesUpsert(String shopId) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/shipping_templates"), null);
        return client.convertValue(raw, new TypeReference<ShopsShippingTemplatesUpsertResult>() {});
    }

    /** Create review */
    public ShopsSubmitReviewResult shopsSubmitReview(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/submit_review"), null);
        return client.convertValue(raw, new TypeReference<ShopsSubmitReviewResult>() {});
    }

    /** Suspend */
    public ShopsSuspendResult shopsSuspend(String shopId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/suspend"), null);
        return client.convertValue(raw, new TypeReference<ShopsSuspendResult>() {});
    }

    /** Update */
    public ShopsVerificationsUpdateResult shopsVerificationsUpdate(String shopId, String verificationId) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + "/verifications/" + serializePathParameter(verificationId, new PathParameterSpec("verificationId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsVerificationsUpdateResult>() {});
    }

    /** Retrieve */
    public SiteSettingsRetrieveResult siteSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/site/settings"));
        return client.convertValue(raw, new TypeReference<SiteSettingsRetrieveResult>() {});
    }

    /** Update */
    public SiteSettingsUpdateResult siteSettingsUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/site/settings"), null);
        return client.convertValue(raw, new TypeReference<SiteSettingsUpdateResult>() {});
    }

    private record PathParameterSpec(String name, String style, boolean explode) {}

    private static String serializePathParameter(Object value, PathParameterSpec spec) {
        if (value == null) {
            return "";
        }
        String style = spec.style() == null || spec.style().isBlank() ? "simple" : spec.style();
        if (value instanceof Iterable<?> iterable) {
            return serializePathArray(spec.name(), iterable, style, spec.explode());
        }
        if (value instanceof Map<?, ?> map) {
            return serializePathObject(spec.name(), map, style, spec.explode());
        }
        return pathPrimitivePrefix(spec.name(), style) + pathEncode(String.valueOf(value));
    }

    private static String serializePathArray(String name, Iterable<?> values, String style, boolean explode) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(pathEncode(String.valueOf(item)));
            }
        }
        if (serialized.isEmpty()) {
            return pathPrefix(name, style);
        }
        if ("matrix".equals(style)) {
            if (explode) {
                List<String> parts = new java.util.ArrayList<>();
                for (String item : serialized) {
                    parts.add(";" + name + "=" + item);
                }
                return String.join("", parts);
            }
            return ";" + name + "=" + String.join(",", serialized);
        }
        String separator = explode ? "." : ",";
        return pathPrefix(name, style) + String.join(separator, serialized);
    }

    private static String serializePathObject(String name, Map<?, ?> values, String style, boolean explode) {
        List<String> entries = new java.util.ArrayList<>();
        List<String> exploded = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            String escapedKey = pathEncode(String.valueOf(key));
            String escapedValue = pathEncode(String.valueOf(value));
            if (explode) {
                if ("matrix".equals(style)) {
                    exploded.add(";" + escapedKey + "=" + escapedValue);
                } else {
                    exploded.add(escapedKey + "=" + escapedValue);
                }
            } else {
                entries.add(escapedKey);
                entries.add(escapedValue);
            }
        });
        if ("matrix".equals(style)) {
            if (explode) {
                return String.join("", exploded);
            }
            return ";" + name + "=" + String.join(",", entries);
        }
        if (explode) {
            String separator = "label".equals(style) ? "." : ",";
            return pathPrefix(name, style) + String.join(separator, exploded);
        }
        return pathPrefix(name, style) + String.join(",", entries);
    }

    private static String pathPrefix(String name, String style) {
        if ("label".equals(style)) {
            return ".";
        }
        if ("matrix".equals(style)) {
            return ";" + name;
        }
        return "";
    }

    private static String pathPrimitivePrefix(String name, String style) {
        if ("matrix".equals(style)) {
            return ";" + name + "=";
        }
        return pathPrefix(name, style);
    }

    private static String pathEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }

    private record QueryParameterSpec(String name, Object value, String style, boolean explode, boolean allowReserved, String contentType) {}

    private static String buildQueryString(List<QueryParameterSpec> parameters) throws Exception {
        List<String> pairs = new java.util.ArrayList<>();
        for (QueryParameterSpec parameter : parameters) {
            appendSerializedParameter(pairs, parameter);
        }
        return String.join("&", pairs);
    }

    private static void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) throws Exception {
        if (parameter.value() == null) {
            return;
        }
        if (parameter.contentType() != null && !parameter.contentType().isBlank()) {
            String json = clientObjectMapper().writeValueAsString(parameter.value());
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(json, parameter.allowReserved()));
            return;
        }

        String style = parameter.style() == null || parameter.style().isBlank() ? "form" : parameter.style();
        Object value = parameter.value();
        if ("deepObject".equals(style) && value instanceof Map<?, ?> map) {
            appendDeepObjectParameter(pairs, parameter.name(), map, parameter.allowReserved());
        } else if (value instanceof Iterable<?> iterable) {
            appendArrayParameter(pairs, parameter.name(), iterable, style, parameter.explode(), parameter.allowReserved());
        } else if (value instanceof Map<?, ?> map) {
            appendObjectParameter(pairs, parameter.name(), map, style, parameter.explode(), parameter.allowReserved());
        } else {
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(String.valueOf(value), parameter.allowReserved()));
        }
    }

    private static void appendArrayParameter(List<String> pairs, String name, Iterable<?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(String.valueOf(item));
            }
        }
        if (serialized.isEmpty()) {
            return;
        }
        if ("form".equals(style) && explode) {
            for (String item : serialized) {
                pairs.add(urlEncode(name) + "=" + encodeQueryValue(item, allowReserved));
            }
            return;
        }
        pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
    }

    private static void appendObjectParameter(List<String> pairs, String name, Map<?, ?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            if ("form".equals(style) && explode) {
                pairs.add(urlEncode(String.valueOf(key)) + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            } else {
                serialized.add(String.valueOf(key));
                serialized.add(String.valueOf(value));
            }
        });
        if (!serialized.isEmpty()) {
            pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
        }
    }

    private static void appendDeepObjectParameter(List<String> pairs, String name, Map<?, ?> values, boolean allowReserved) {
        values.forEach((key, value) -> {
            if (value != null) {
                pairs.add(urlEncode(name + "[" + key + "]") + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            }
        });
    }

    private static String encodeQueryValue(String value, boolean allowReserved) {
        String encoded = urlEncode(value);
        if (!allowReserved) {
            return encoded;
        }
        return encoded
            .replace("%3A", ":").replace("%2F", "/").replace("%3F", "?").replace("%23", "#")
            .replace("%5B", "[").replace("%5D", "]").replace("%40", "@").replace("%21", "!")
            .replace("%24", "$").replace("%26", "&").replace("%27", "'").replace("%28", "(")
            .replace("%29", ")").replace("%2A", "*").replace("%2B", "+").replace("%2C", ",")
            .replace("%3B", ";").replace("%3D", "=");
    }

    private static com.fasterxml.jackson.databind.ObjectMapper clientObjectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }


    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
