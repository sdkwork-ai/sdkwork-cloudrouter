package com.sdkwork.clawrouter.app.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.app.http.HttpClient;
import com.sdkwork.clawrouter.app.model.*;
import java.util.List;
import java.util.Map;

public class RuntimeApi {
    private final HttpClient client;

    public RuntimeApi(HttpClient client) {
        this.client = client;
    }

    /** List */
    public InvocationsListResult invocationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/runtime/invocations"));
        return client.convertValue(raw, new TypeReference<InvocationsListResult>() {});
    }

    /** Create */
    public InvocationsCreateResult invocationsCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/runtime/invocations"), null);
        return client.convertValue(raw, new TypeReference<InvocationsCreateResult>() {});
    }

    /** Retrieve */
    public InvocationsRetrieveResult invocationsRetrieve(String invocationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<InvocationsRetrieveResult>() {});
    }

    /** List */
    public ArtifactsListResult artifactsList(String invocationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/artifacts"));
        return client.convertValue(raw, new TypeReference<ArtifactsListResult>() {});
    }

    /** Create */
    public ArtifactsCreateResult artifactsCreate(String invocationId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/artifacts"), null);
        return client.convertValue(raw, new TypeReference<ArtifactsCreateResult>() {});
    }

    /** Create */
    public InvocationsSubmitResult invocationsSubmit(String invocationId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/complete"), null);
        return client.convertValue(raw, new TypeReference<InvocationsSubmitResult>() {});
    }

    /** List */
    public InvocationEventsListResult invocationEventsList(String invocationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/events"));
        return client.convertValue(raw, new TypeReference<InvocationEventsListResult>() {});
    }

    /** Create */
    public InvocationEventsCreateResult invocationEventsCreate(String invocationId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/events"), null);
        return client.convertValue(raw, new TypeReference<InvocationEventsCreateResult>() {});
    }

    /** List */
    public InvocationEventStreamsListResult invocationEventStreamsList(String invocationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/runtime/invocations/" + serializePathParameter(invocationId, new PathParameterSpec("invocationId", "simple", false)) + "/events/stream"));
        return client.convertValue(raw, new TypeReference<InvocationEventStreamsListResult>() {});
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



}
