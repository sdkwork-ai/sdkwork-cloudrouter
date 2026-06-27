package com.sdkwork.clawrouter.backend.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.model.*;
import java.util.List;
import java.util.Map;

public class AiApi {
    private final HttpClient client;

    public AiApi(HttpClient client) {
        this.client = client;
    }

    /** List groups */
    public ChannelGroupsListResult channelGroupsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/channel_groups"));
        return client.convertValue(raw, new TypeReference<ChannelGroupsListResult>() {});
    }

    /** Create group */
    public ChannelGroupsCreateResult channelGroupsCreate(AdminChannelGroupCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/channel_groups"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ChannelGroupsCreateResult>() {});
    }

    /** Delete group */
    public ChannelGroupsDeleteResult channelGroupsDelete(String channelGroupId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/ai/channel_groups/" + serializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ChannelGroupsDeleteResult>() {});
    }

    /** Update group */
    public ChannelGroupsUpdateResult channelGroupsUpdate(String channelGroupId, AdminChannelGroupUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/ai/channel_groups/" + serializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ChannelGroupsUpdateResult>() {});
    }

    /** List group channel bindings */
    public ChannelGroupsChannelBindingsListResult channelGroupsBindingsList(String channelGroupId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/channel_groups/" + serializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false)) + "/channel_bindings"));
        return client.convertValue(raw, new TypeReference<ChannelGroupsChannelBindingsListResult>() {});
    }

    /** Replace group channel bindings */
    public ChannelGroupsChannelBindingsUpdateResult channelGroupsBindingsUpdate(String channelGroupId, AdminChannelGroupChannelBindingsReplaceRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/ai/channel_groups/" + serializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false)) + "/channel_bindings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ChannelGroupsChannelBindingsUpdateResult>() {});
    }

    /** List group route explain */
    public ChannelGroupsRouteExplainRetrieveResult channelGroupsRouteExplainRetrieve(String channelGroupId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/channel_groups/" + serializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false)) + "/route_explain"));
        return client.convertValue(raw, new TypeReference<ChannelGroupsRouteExplainRetrieveResult>() {});
    }

    /** List model mappings */
    public ModelMappingsListResult modelMappingsList(String bindingType, String vendorCode, String channelId, String channelCode, String q) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("binding_type", bindingType, "form", true, false, null),
            new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            new QueryParameterSpec("channel_id", channelId, "form", true, false, null),
            new QueryParameterSpec("channel_code", channelCode, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_mappings"), query));
        return client.convertValue(raw, new TypeReference<ModelMappingsListResult>() {});
    }

    /** Create model mapping */
    public ModelMappingsCreateResult modelMappingsCreate(AdminModelMappingCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/model_mappings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelMappingsCreateResult>() {});
    }

    /** Resolve model mapping */
    public ModelMappingsResolveCreateResult modelMappingsResolveCreate(AdminModelMappingResolveRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/model_mappings/resolve"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelMappingsResolveCreateResult>() {});
    }

    /** Delete model mapping */
    public ModelMappingsDeleteResult modelMappingsDelete(String mappingId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/ai/model_mappings/" + serializePathParameter(mappingId, new PathParameterSpec("mappingId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ModelMappingsDeleteResult>() {});
    }

    /** Update model mapping */
    public ModelMappingsUpdateResult modelMappingsUpdate(String mappingId, AdminModelMappingUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/ai/model_mappings/" + serializePathParameter(mappingId, new PathParameterSpec("mappingId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelMappingsUpdateResult>() {});
    }

    /** List model rankings */
    public ModelRankingsListResult modelRankingsList(String rankScope, String vendorCode, String modality, String q, String limit) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            new QueryParameterSpec("modality", modality, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("limit", limit, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings"), query));
        return client.convertValue(raw, new TypeReference<ModelRankingsListResult>() {});
    }

    /** List model ranking refresh jobs */
    public ModelRankingsJobsListResult modelRankingsJobsList(String rankScope, String limit) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            new QueryParameterSpec("limit", limit, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/jobs"), query));
        return client.convertValue(raw, new TypeReference<ModelRankingsJobsListResult>() {});
    }

    /** Trigger model ranking refresh */
    public ModelRankingsRefreshResult modelRankingsRefresh(ModelRankingRefreshTriggerRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/model_rankings/refresh"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelRankingsRefreshResult>() {});
    }

    /** List model ranking refresh status */
    public ModelRankingsStatusRetrieveResult modelRankingsStatusRetrieve(String rankScope) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/status"), query));
        return client.convertValue(raw, new TypeReference<ModelRankingsStatusRetrieveResult>() {});
    }

    /** List vendors */
    public ModelVendorsListResult modelVendorsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/model_vendors"));
        return client.convertValue(raw, new TypeReference<ModelVendorsListResult>() {});
    }

    /** Create vendor */
    public ModelVendorsCreateResult modelVendorsCreate(AdminModelVendorCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/model_vendors"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelVendorsCreateResult>() {});
    }

    /** List models */
    public ModelsListResult modelsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/models"));
        return client.convertValue(raw, new TypeReference<ModelsListResult>() {});
    }

    /** Create model */
    public ModelsCreateResult modelsCreate(AdminAiModelCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/models"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelsCreateResult>() {});
    }

    /** Sync vendors and models */
    public ModelsRefreshResult modelsRefresh(AdminModelCatalogSyncRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/models/refresh"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelsRefreshResult>() {});
    }

    /** Delete model */
    public ModelsDeleteResult modelsDelete(String modelId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/ai/models/" + serializePathParameter(modelId, new PathParameterSpec("modelId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ModelsDeleteResult>() {});
    }

    /** Update model */
    public ModelsUpdateResult modelsUpdate(String modelId, AdminAiModelUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/ai/models/" + serializePathParameter(modelId, new PathParameterSpec("modelId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ModelsUpdateResult>() {});
    }

    /** List resource groups */
    public AiResourceGroupsListResult getResourceGroupsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/resource_groups"));
        return client.convertValue(raw, new TypeReference<AiResourceGroupsListResult>() {});
    }

    /** Create resource group */
    public AiResourceGroupsCreateResult resourceGroupsCreate(AdminAiResourceGroupCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/resource_groups"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AiResourceGroupsCreateResult>() {});
    }

    /** List resource group resources */
    public AiResourceGroupsResourcesListResult getResourceGroupsListResourceGroups(String groupIdOrCode) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/resource_groups/" + serializePathParameter(groupIdOrCode, new PathParameterSpec("groupIdOrCode", "simple", false)) + "/resources"));
        return client.convertValue(raw, new TypeReference<AiResourceGroupsResourcesListResult>() {});
    }

    /** Delete resource group */
    public AiResourceGroupsDeleteResult resourceGroupsDelete(String groupId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/ai/resource_groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<AiResourceGroupsDeleteResult>() {});
    }

    /** Update resource group */
    public AiResourceGroupsUpdateResult resourceGroupsUpdate(String groupId, AdminAiResourceGroupUpdateRequest body) throws Exception {
        Object raw = client.patch(ApiPaths.backendPath("/ai/resource_groups/" + serializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AiResourceGroupsUpdateResult>() {});
    }

    /** List ai resources */
    public AiResourcesListResult resourcesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/ai/resources"));
        return client.convertValue(raw, new TypeReference<AiResourcesListResult>() {});
    }

    /** Create ai resource */
    public AiResourcesCreateResult resourcesCreate(AdminAiResourceCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/resources"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AiResourcesCreateResult>() {});
    }

    /** Update ai resource */
    public AiResourcesUpdateResult resourcesUpdate(String resourceId, AdminAiResourceUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/ai/resources/" + serializePathParameter(resourceId, new PathParameterSpec("resourceId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AiResourcesUpdateResult>() {});
    }

    /** List runtime route explain */
    public RouteExplainCreateResult routeExplainCreate(AdminRuntimeRouteExplainRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/ai/route_explain"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<RouteExplainCreateResult>() {});
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
