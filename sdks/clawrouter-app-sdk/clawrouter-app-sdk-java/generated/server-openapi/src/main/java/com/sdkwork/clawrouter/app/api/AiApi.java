package com.sdkwork.clawrouter.app.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.app.http.HttpClient;
import com.sdkwork.clawrouter.app.model.*;
import java.util.List;
import java.util.Map;

public class AiApi {
    private final HttpClient client;

    public AiApi(HttpClient client) {
        this.client = client;
    }

    /** List */
    public ChannelGroupsListResult channelGroupsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/channel_groups"));
        return client.convertValue(raw, new TypeReference<ChannelGroupsListResult>() {});
    }

    /** Retrieve */
    public DashboardOverviewRetrieveResult dashboardOverviewRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/dashboard/overview"));
        return client.convertValue(raw, new TypeReference<DashboardOverviewRetrieveResult>() {});
    }

    /** List */
    public GatewayTracesListResult gatewayTracesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/gateway/traces"));
        return client.convertValue(raw, new TypeReference<GatewayTracesListResult>() {});
    }

    /** List */
    public ModelRankingsListResult modelRankingsList(String rankScope, String vendorCode, String modality, String q, Integer pageSize) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            new QueryParameterSpec("modality", modality, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/model_rankings"), query));
        return client.convertValue(raw, new TypeReference<ModelRankingsListResult>() {});
    }

    /** List */
    public ModelVendorsListResult modelVendorsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/model_vendors"));
        return client.convertValue(raw, new TypeReference<ModelVendorsListResult>() {});
    }

    /** List */
    public ModelsListResult modelsList(Integer page, Integer pageSize, String q, String billingMeter, List<String> vendorCodes, List<String> modalities, List<String> capabilities, List<String> categories, List<String> groups) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("billing_meter", billingMeter, "form", true, false, null),
            new QueryParameterSpec("vendor_codes", vendorCodes, "form", false, false, null),
            new QueryParameterSpec("modalities", modalities, "form", false, false, null),
            new QueryParameterSpec("capabilities", capabilities, "form", false, false, null),
            new QueryParameterSpec("categories", categories, "form", false, false, null),
            new QueryParameterSpec("groups", groups, "form", false, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/models"), query));
        return client.convertValue(raw, new TypeReference<ModelsListResult>() {});
    }

    /** List */
    public RoutingApiKeysListResult routingApiKeysList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/routing/api_keys"));
        return client.convertValue(raw, new TypeReference<RoutingApiKeysListResult>() {});
    }

    /** List */
    public RoutingChannelsListResult routingChannelsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/routing/channels"));
        return client.convertValue(raw, new TypeReference<RoutingChannelsListResult>() {});
    }

    /** List */
    public RoutingRequestTracesListResult routingRequestTracesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/routing/request_traces"));
        return client.convertValue(raw, new TypeReference<RoutingRequestTracesListResult>() {});
    }

    /** List */
    public RoutingUsageListResult routingUsageList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/routing/usage"));
        return client.convertValue(raw, new TypeReference<RoutingUsageListResult>() {});
    }

    /** List */
    public UsageLogsListResult usageLogsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/ai/usage/logs"));
        return client.convertValue(raw, new TypeReference<UsageLogsListResult>() {});
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
