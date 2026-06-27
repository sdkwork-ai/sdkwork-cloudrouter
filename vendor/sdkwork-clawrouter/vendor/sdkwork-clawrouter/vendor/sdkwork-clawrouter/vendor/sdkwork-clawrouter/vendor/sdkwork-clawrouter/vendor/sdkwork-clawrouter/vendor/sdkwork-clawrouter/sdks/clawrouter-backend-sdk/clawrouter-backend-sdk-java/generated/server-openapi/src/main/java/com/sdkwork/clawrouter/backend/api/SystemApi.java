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

    /** List overview */
    public AnalyticsAdminOverviewRetrieveResult analyticsAdminOverviewRetrieve(String timeRange, String startTime, String endTime, String limit) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("time_range", timeRange, "form", true, false, null),
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("limit", limit, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/analytics/admin/overview"), query));
        return client.convertValue(raw, new TypeReference<AnalyticsAdminOverviewRetrieveResult>() {});
    }

    /** Retrieve IAM auth runtime settings */
    public AuthSettingsRetrieveResult authSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/auth/settings"));
        return client.convertValue(raw, new TypeReference<AuthSettingsRetrieveResult>() {});
    }

    /** Update IAM auth runtime settings */
    public AuthSettingsUpdateResult authSettingsUpdate(AdminAuthSettingsUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/auth/settings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AuthSettingsUpdateResult>() {});
    }

    /** Delete one runtime cache instance */
    public CacheInstancesDeleteResult cacheInstancesDelete(String instanceName) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/instances/" + serializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheInstancesDeleteResult>() {});
    }

    /** Refresh one runtime cache instance */
    public CacheInstancesRefreshCreateResult cacheInstancesRefreshCreate(String instanceName) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/instances/" + serializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false)) + "/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheInstancesRefreshCreateResult>() {});
    }

    /** Delete a runtime cache namespace */
    public CacheNamespacesDeleteResult cacheNamespacesDelete(String namespace) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheNamespacesDeleteResult>() {});
    }

    /** List runtime cache keys in a namespace */
    public CacheNamespacesKeysListResult cacheNamespacesKeysList(String namespace, String limit, String cursor) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("limit", limit, "form", true, false, null),
            new QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/keys"), query));
        return client.convertValue(raw, new TypeReference<CacheNamespacesKeysListResult>() {});
    }

    /** Delete a runtime cache key */
    public CacheNamespacesKeysDeleteResult cacheNamespacesKeysDelete(String namespace, String key) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/keys/" + serializePathParameter(key, new PathParameterSpec("key", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<CacheNamespacesKeysDeleteResult>() {});
    }

    /** Refresh one runtime cache namespace */
    public CacheNamespacesRefreshCreateResult cacheNamespacesRefreshCreate(String namespace) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/namespaces/" + serializePathParameter(namespace, new PathParameterSpec("namespace", "simple", false)) + "/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheNamespacesRefreshCreateResult>() {});
    }

    /** Retrieve runtime cache overview */
    public CacheOverviewRetrieveResult cacheOverviewRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/cache/overview"));
        return client.convertValue(raw, new TypeReference<CacheOverviewRetrieveResult>() {});
    }

    /** Refresh all runtime cache instances */
    public CacheRefreshCreateResult cacheRefreshCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/cache/refresh"), null);
        return client.convertValue(raw, new TypeReference<CacheRefreshCreateResult>() {});
    }

    /** List dashboard data */
    public DashboardAdminOverviewRetrieveResult dashboardAdminOverviewRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/dashboard/admin/overview"));
        return client.convertValue(raw, new TypeReference<DashboardAdminOverviewRetrieveResult>() {});
    }

    /** List firewalls */
    public FirewallsRulesListResult firewallsRulesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/firewalls/rules"));
        return client.convertValue(raw, new TypeReference<FirewallsRulesListResult>() {});
    }

    /** Create firewall */
    public FirewallsRulesCreateResult firewallsRulesCreate(AdminFirewallRuleCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/firewalls/rules"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<FirewallsRulesCreateResult>() {});
    }

    /** Delete firewall */
    public FirewallsRulesDeleteResult firewallsRulesDelete(String ruleId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/firewalls/rules/" + serializePathParameter(ruleId, new PathParameterSpec("ruleId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<FirewallsRulesDeleteResult>() {});
    }

    /** List installation status */
    public InstallationStatusRetrieveResult installationStatusRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/installation/status"));
        return client.convertValue(raw, new TypeReference<InstallationStatusRetrieveResult>() {});
    }

    /** List referral stats */
    public MarketingReferralStatsListResult marketingReferralStatsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/marketing/referral_stats"));
        return client.convertValue(raw, new TypeReference<MarketingReferralStatsListResult>() {});
    }

    /** List alerts */
    public MonitorAlertsListResult monitorAlertsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/alerts"));
        return client.convertValue(raw, new TypeReference<MonitorAlertsListResult>() {});
    }

    /** List nodes */
    public MonitorNodesListResult monitorNodesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/nodes"));
        return client.convertValue(raw, new TypeReference<MonitorNodesListResult>() {});
    }

    /** List performance data */
    public MonitorPerformanceListResult monitorPerformanceList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/monitor/performance"));
        return client.convertValue(raw, new TypeReference<MonitorPerformanceListResult>() {});
    }

    /** List token limits */
    public RateLimitsApiKeysListResult rateLimitsApiKeysList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/api_keys"));
        return client.convertValue(raw, new TypeReference<RateLimitsApiKeysListResult>() {});
    }

    /** Create token limit */
    public RateLimitsApiKeysCreateResult rateLimitsApiKeysCreate(AdminTokenLimitCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/api_keys"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<RateLimitsApiKeysCreateResult>() {});
    }

    /** List IP limits */
    public RateLimitsIpListResult rateLimitsIpList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/ip"));
        return client.convertValue(raw, new TypeReference<RateLimitsIpListResult>() {});
    }

    /** Create IP limit */
    public RateLimitsIpCreateResult rateLimitsIpCreate(AdminIpLimitCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/ip"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<RateLimitsIpCreateResult>() {});
    }

    /** List model limits */
    public RateLimitsModelsListResult rateLimitsModelsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/rate_limits/models"));
        return client.convertValue(raw, new TypeReference<RateLimitsModelsListResult>() {});
    }

    /** Create model limit */
    public RateLimitsModelsCreateResult rateLimitsModelsCreate(AdminModelLimitCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/rate_limits/models"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<RateLimitsModelsCreateResult>() {});
    }

    /** List logs */
    public RecordsListResult recordsList(String page, String pageSize, String user, String token, String model) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("user", user, "form", true, false, null),
            new QueryParameterSpec("token", token, "form", true, false, null),
            new QueryParameterSpec("model", model, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/records"), query));
        return client.convertValue(raw, new TypeReference<RecordsListResult>() {});
    }

    /** Retrieve runtime region settings */
    public RuntimeRegionSettingsRetrieveResult runtimeRegionSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/runtime_region/settings"));
        return client.convertValue(raw, new TypeReference<RuntimeRegionSettingsRetrieveResult>() {});
    }

    /** Update runtime region settings */
    public RuntimeRegionSettingsUpdateResult runtimeRegionSettingsUpdate(AdminRuntimeRegionSettingsUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/runtime_region/settings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<RuntimeRegionSettingsUpdateResult>() {});
    }

    /** List service nodes */
    public ServiceNodesListResult serviceNodesList(String q, String status) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/service_nodes"), query));
        return client.convertValue(raw, new TypeReference<ServiceNodesListResult>() {});
    }

    /** Create service node */
    public ServiceNodesCreateResult serviceNodesCreate(AdminServiceNodeCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/system/service_nodes"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ServiceNodesCreateResult>() {});
    }

    /** Delete service node */
    public ServiceNodesDeleteResult serviceNodesDelete(String nodeId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ServiceNodesDeleteResult>() {});
    }

    /** Update service node */
    public ServiceNodesUpdateResult serviceNodesUpdate(String nodeId, AdminServiceNodeUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ServiceNodesUpdateResult>() {});
    }

    /** Update service node status */
    public ServiceNodesStatusUpdateResult serviceNodesStatusUpdate(String nodeId, AdminServiceNodeStatusUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/system/service_nodes/" + serializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false)) + "/status"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ServiceNodesStatusUpdateResult>() {});
    }

    /** Retrieve site branding and deployment personalization settings */
    public SiteSettingsRetrieveResult siteSettingsRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/system/site/settings"));
        return client.convertValue(raw, new TypeReference<SiteSettingsRetrieveResult>() {});
    }

    /** Update site branding and deployment personalization settings */
    public SiteSettingsUpdateResult siteSettingsUpdate(AdminSiteSettingsUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/system/site/settings"), body, null, null, "application/json");
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
