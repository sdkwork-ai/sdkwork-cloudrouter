package com.sdkwork.clawrouter.backend.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.model.*;
import java.util.List;
import java.util.Map;

public class IntegrationApi {
    private final HttpClient client;

    public IntegrationApi(HttpClient client) {
        this.client = client;
    }

    /** List */
    public ChannelsListResult channelsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/integration/channels"));
        return client.convertValue(raw, new TypeReference<ChannelsListResult>() {});
    }

    /** Create */
    public ChannelsCreateResult channelsCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/integration/channels"), null);
        return client.convertValue(raw, new TypeReference<ChannelsCreateResult>() {});
    }

    /** Update */
    public ChannelsUpdateResult channelsUpdate() throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/integration/channels"), null);
        return client.convertValue(raw, new TypeReference<ChannelsUpdateResult>() {});
    }

    /** Delete */
    public ChannelsDeleteResult channelsDelete(String channelId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/integration/channels/" + serializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ChannelsDeleteResult>() {});
    }

    /** Verify */
    public ChannelsVerifyResult channelsVerify(String channelId) throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/integration/channels/" + serializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false)) + "/verify"), null);
        return client.convertValue(raw, new TypeReference<ChannelsVerifyResult>() {});
    }

    /** List */
    public ProviderSecretsListResult providerSecretsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/integration/provider_secrets"));
        return client.convertValue(raw, new TypeReference<ProviderSecretsListResult>() {});
    }

    /** Create */
    public ProviderSecretsCreateResult providerSecretsCreate() throws Exception {
        Object raw = client.post(ApiPaths.backendPath("/integration/provider_secrets"), null);
        return client.convertValue(raw, new TypeReference<ProviderSecretsCreateResult>() {});
    }

    /** Update */
    public ProviderSecretsUpdateResult providerSecretsUpdate() throws Exception {
        Object raw = client.put(ApiPaths.backendPath("/integration/provider_secrets"), null);
        return client.convertValue(raw, new TypeReference<ProviderSecretsUpdateResult>() {});
    }

    /** Delete */
    public ProviderSecretsDeleteResult providerSecretsDelete(String secretId) throws Exception {
        Object raw = client.delete(ApiPaths.backendPath("/integration/provider_secrets/" + serializePathParameter(secretId, new PathParameterSpec("secretId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ProviderSecretsDeleteResult>() {});
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
