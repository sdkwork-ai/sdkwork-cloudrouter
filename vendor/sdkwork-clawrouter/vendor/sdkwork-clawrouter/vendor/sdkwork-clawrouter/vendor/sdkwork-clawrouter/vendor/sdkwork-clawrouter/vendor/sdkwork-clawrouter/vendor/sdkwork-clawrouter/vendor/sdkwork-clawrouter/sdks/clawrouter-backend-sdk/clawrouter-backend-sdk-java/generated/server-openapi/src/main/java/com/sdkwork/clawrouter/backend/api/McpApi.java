package com.sdkwork.clawrouter.backend.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.model.*;
import java.util.List;
import java.util.Map;

public class McpApi {
    private final HttpClient client;

    public McpApi(HttpClient client) {
        this.client = client;
    }

    /** Update MCP binding */
    public ServersBindingsUpdateResult serversBindingsUpdate(String bindingId, AdminMcpBindingUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/mcp/bindings/" + serializePathParameter(bindingId, new PathParameterSpec("bindingId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ServersBindingsUpdateResult>() {});
    }

    /** Publish MCP server revision */
    public RevisionsPublishResult revisionsPublish(String revisionId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/mcp/revisions/" + serializePathParameter(revisionId, new PathParameterSpec("revisionId", "simple", false)) + "/publish"), null);
        return client.convertValue(raw, new TypeReference<RevisionsPublishResult>() {});
    }

    /** List MCP servers */
    public ServersListResult serversList(String page, String pageSize, String q, String transport, String visibility, String status, String categoryId) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("transport", transport, "form", true, false, null),
            new QueryParameterSpec("visibility", visibility, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("category_id", categoryId, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/mcp/servers"), query));
        return client.convertValue(raw, new TypeReference<ServersListResult>() {});
    }

    /** Create MCP server */
    public ServersCreateResult serversCreate(AdminMcpServerCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/mcp/servers"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<ServersCreateResult>() {});
    }

    /** Retrieve MCP server */
    public ServersRetrieveResult serversRetrieve(String serverId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ServersRetrieveResult>() {});
    }

    /** Update MCP server */
    public ServersUpdateResult serversUpdate(String serverId, AdminMcpServerUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ServersUpdateResult>() {});
    }

    /** List MCP bindings */
    public ServersBindingsListResult serversBindingsList(String serverId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/bindings"));
        return client.convertValue(raw, new TypeReference<ServersBindingsListResult>() {});
    }

    /** Create MCP binding */
    public ServersBindingsCreateResult serversBindingsCreate(String serverId, AdminMcpBindingCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/bindings"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<ServersBindingsCreateResult>() {});
    }

    /** Discover MCP tools */
    public ServersToolsRefreshResult serversToolsRefresh(String serverId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/discover"), null);
        return client.convertValue(raw, new TypeReference<ServersToolsRefreshResult>() {});
    }

    /** Check MCP server health */
    public ServersHealthChecksCreateResult serversHealthChecksCreate(String serverId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/health_check"), null);
        return client.convertValue(raw, new TypeReference<ServersHealthChecksCreateResult>() {});
    }

    /** List MCP server revisions */
    public ServersRevisionsListResult serversRevisionsList(String serverId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/revisions"));
        return client.convertValue(raw, new TypeReference<ServersRevisionsListResult>() {});
    }

    /** Create MCP server revision */
    public ServersRevisionsCreateResult serversRevisionsCreate(String serverId, AdminMcpServerRevisionCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/revisions"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<ServersRevisionsCreateResult>() {});
    }

    /** List MCP tools */
    public ServersToolsListResult serversToolsList(String serverId) throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/mcp/servers/" + serializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false)) + "/tools"));
        return client.convertValue(raw, new TypeReference<ServersToolsListResult>() {});
    }

    /** Update MCP tool */
    public ToolsUpdateResult toolsUpdate(String toolId, AdminMcpToolUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/mcp/tools/" + serializePathParameter(toolId, new PathParameterSpec("toolId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ToolsUpdateResult>() {});
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

    private record HeaderParameterSpec(Object value, String style, boolean explode, String contentType) {}

    private static Map<String, String> buildRequestHeaders(Map<String, HeaderParameterSpec> headers, Map<String, HeaderParameterSpec> cookies) throws Exception {
        Map<String, String> requestHeaders = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, HeaderParameterSpec> entry : headers.entrySet()) {
            String serialized = serializeParameterValue(entry.getValue());
            if (serialized != null) {
                requestHeaders.put(entry.getKey(), serialized);
            }
        }

        String cookieHeader = buildCookieHeader(cookies);
        if (cookieHeader != null && !cookieHeader.isEmpty()) {
            requestHeaders.merge("Cookie", cookieHeader, (left, right) -> left + "; " + right);
        }

        return requestHeaders.isEmpty() ? null : requestHeaders;
    }

    private static String buildCookieHeader(Map<String, HeaderParameterSpec> cookies) throws Exception {
        java.util.List<String> pairs = new java.util.ArrayList<>();
        for (Map.Entry<String, HeaderParameterSpec> entry : cookies.entrySet()) {
            String serialized = serializeParameterValue(entry.getValue());
            if (serialized != null) {
                pairs.add(urlEncode(entry.getKey()) + "=" + urlEncode(serialized));
            }
        }
        return String.join("; ", pairs);
    }

    private static String serializeParameterValue(HeaderParameterSpec parameter) throws Exception {
        if (parameter == null || parameter.value() == null) {
            return null;
        }
        Object value = parameter.value();
        if (parameter.contentType() != null && !parameter.contentType().isBlank()) {
            return headerObjectMapper().writeValueAsString(value);
        }
        if (value instanceof Iterable<?> iterable) {
            java.util.List<String> values = new java.util.ArrayList<>();
            for (Object item : iterable) {
                if (item != null) {
                    values.add(String.valueOf(item));
                }
            }
            return String.join(",", values);
        }
        if (value instanceof Map<?, ?> map) {
            java.util.List<String> values = new java.util.ArrayList<>();
            map.forEach((key, item) -> {
                if (item == null) {
                    return;
                }
                if (parameter.explode()) {
                    values.add(String.valueOf(key) + "=" + String.valueOf(item));
                } else {
                    values.add(String.valueOf(key));
                    values.add(String.valueOf(item));
                }
            });
            return String.join(",", values);
        }
        return String.valueOf(value);
    }

    private static com.fasterxml.jackson.databind.ObjectMapper headerObjectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
