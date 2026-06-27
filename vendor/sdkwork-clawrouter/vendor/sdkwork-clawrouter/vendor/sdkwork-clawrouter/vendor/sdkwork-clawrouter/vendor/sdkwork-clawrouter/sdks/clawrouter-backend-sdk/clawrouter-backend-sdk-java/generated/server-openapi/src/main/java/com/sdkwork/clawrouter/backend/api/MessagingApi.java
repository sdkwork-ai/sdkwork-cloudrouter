package com.sdkwork.clawrouter.backend.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.model.*;
import java.util.List;
import java.util.Map;

public class MessagingApi {
    private final HttpClient client;

    public MessagingApi(HttpClient client) {
        this.client = client;
    }

    /** Messaging route simulation */
    public DiagnosticsRouteSimulationCreateResult diagnosticsRouteSimulationCreate(MessagingRouteSimulationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/messaging/diagnostics/route_simulation"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DiagnosticsRouteSimulationCreateResult>() {});
    }

    /** Messaging test send */
    public DiagnosticsTestSendsCreateResult diagnosticsTestSendsCreate(MessagingTestSendRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/diagnostics/test_sends"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<DiagnosticsTestSendsCreateResult>() {});
    }

    /** Messaging provider accounts list */
    public ProviderAccountsListResult providerAccountsList(String page, String pageSize, String q, String status, String channel, String providerCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/provider_accounts"), query));
        return client.convertValue(raw, new TypeReference<ProviderAccountsListResult>() {});
    }

    /** Messaging provider account create */
    public ProviderAccountsCreateResult providerAccountsCreate(MessagingProviderAccountCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/provider_accounts"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<ProviderAccountsCreateResult>() {});
    }

    /** Messaging rate limit buckets list */
    public RateLimitBucketsListResult rateLimitBucketsList(String page, String pageSize, String sceneCode, String channel, String targetHash, String ipHash, String deviceHash) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("scene_code", sceneCode, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("target_hash", targetHash, "form", true, false, null),
            new QueryParameterSpec("ip_hash", ipHash, "form", true, false, null),
            new QueryParameterSpec("device_hash", deviceHash, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/rate_limit_buckets"), query));
        return client.convertValue(raw, new TypeReference<RateLimitBucketsListResult>() {});
    }

    /** Messaging route rules list */
    public RouteRulesListResult routeRulesList(String page, String pageSize, String q, String status, String channel, String providerCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/route_rules"), query));
        return client.convertValue(raw, new TypeReference<RouteRulesListResult>() {});
    }

    /** Messaging route rule create */
    public RouteRulesCreateResult routeRulesCreate(MessagingRouteRuleCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/route_rules"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<RouteRulesCreateResult>() {});
    }

    /** Messaging send requests list */
    public SendRequestsListResult sendRequestsList(String page, String pageSize, String status, String channel, String sceneCode, String providerCode, String targetHash) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("scene_code", sceneCode, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null),
            new QueryParameterSpec("target_hash", targetHash, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/send_requests"), query));
        return client.convertValue(raw, new TypeReference<SendRequestsListResult>() {});
    }

    /** Messaging sender identities list */
    public SenderIdentitiesListResult senderIdentitiesList(String page, String pageSize, String q, String status, String channel, String providerCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/sender_identities"), query));
        return client.convertValue(raw, new TypeReference<SenderIdentitiesListResult>() {});
    }

    /** Messaging sender identity create */
    public SenderIdentitiesCreateResult senderIdentitiesCreate(MessagingSenderIdentityCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/sender_identities"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<SenderIdentitiesCreateResult>() {});
    }

    /** Messaging suppressions list */
    public SuppressionsListResult suppressionsList(String page, String pageSize, String status, String channel, String targetHash, String reasonCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("target_hash", targetHash, "form", true, false, null),
            new QueryParameterSpec("reason_code", reasonCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/suppressions"), query));
        return client.convertValue(raw, new TypeReference<SuppressionsListResult>() {});
    }

    /** Messaging suppression create */
    public SuppressionsCreateResult suppressionsCreate(MessagingSuppressionCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/suppressions"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<SuppressionsCreateResult>() {});
    }

    /** Messaging template send */
    public TemplateSendsCreateResult templateSendsCreate(MessagingTemplateSendRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/template_sends"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<TemplateSendsCreateResult>() {});
    }

    /** Messaging templates list */
    public TemplatesListResult templatesList(String page, String pageSize, String q, String status, String channel, String providerCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/templates"), query));
        return client.convertValue(raw, new TypeReference<TemplatesListResult>() {});
    }

    /** Messaging template create */
    public TemplatesCreateResult templatesCreate(MessagingTemplateCreateRequest body, String idempotencyKey) throws Exception {
        Map<String, String> requestHeaders = buildRequestHeaders(
                Map.of("Idempotency-Key", new HeaderParameterSpec(idempotencyKey, "simple", false, null)),
                Map.of()
        );
        Object raw = client.post(ApiPaths.backendPath("/messaging/templates"), body, null, requestHeaders, "application/json");
        return client.convertValue(raw, new TypeReference<TemplatesCreateResult>() {});
    }

    /** Messaging template version publish */
    public TemplatesVersionsPublishResult templatesVersionsPublish(String templateId, String versionId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/messaging/templates/" + serializePathParameter(templateId, new PathParameterSpec("templateId", "simple", false)) + "/versions/" + serializePathParameter(versionId, new PathParameterSpec("versionId", "simple", false)) + "/publish"), null);
        return client.convertValue(raw, new TypeReference<TemplatesVersionsPublishResult>() {});
    }

    /** Verification policies list */
    public VerificationPoliciesListResult verificationPoliciesList(String page, String pageSize, String q, String status, String channel, String providerCode) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page", page, "form", true, false, null),
            new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            new QueryParameterSpec("q", q, "form", true, false, null),
            new QueryParameterSpec("status", status, "form", true, false, null),
            new QueryParameterSpec("channel", channel, "form", true, false, null),
            new QueryParameterSpec("provider_code", providerCode, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/verification_policies"), query));
        return client.convertValue(raw, new TypeReference<VerificationPoliciesListResult>() {});
    }

    /** Verification policy update */
    public VerificationPoliciesUpdateResult verificationPoliciesUpdate(String policyId, VerificationPolicyUpdateRequest body) throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/messaging/verification_policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<VerificationPoliciesUpdateResult>() {});
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
