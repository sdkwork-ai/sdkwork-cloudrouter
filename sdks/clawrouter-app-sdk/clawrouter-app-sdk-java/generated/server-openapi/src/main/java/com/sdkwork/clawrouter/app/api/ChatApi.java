package com.sdkwork.clawrouter.app.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.app.http.HttpClient;
import com.sdkwork.clawrouter.app.model.*;
import java.util.List;
import java.util.Map;

public class ChatApi {
    private final HttpClient client;

    public ChatApi(HttpClient client) {
        this.client = client;
    }

    /** List */
    public ConversationsListResult conversationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/chat/conversations"));
        return client.convertValue(raw, new TypeReference<ConversationsListResult>() {});
    }

    /** Create */
    public ConversationsCreateResult conversationsCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/chat/conversations"), null);
        return client.convertValue(raw, new TypeReference<ConversationsCreateResult>() {});
    }

    /** Retrieve */
    public ConversationsRetrieveResult conversationsRetrieve(String conversationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/chat/conversations/" + serializePathParameter(conversationId, new PathParameterSpec("conversationId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ConversationsRetrieveResult>() {});
    }

    /** List */
    public ConversationMessagesListResult conversationMessagesList(String conversationId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/chat/conversations/" + serializePathParameter(conversationId, new PathParameterSpec("conversationId", "simple", false)) + "/messages"));
        return client.convertValue(raw, new TypeReference<ConversationMessagesListResult>() {});
    }

    /** Create */
    public TurnsCreateResult turnsCreate(String conversationId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/chat/conversations/" + serializePathParameter(conversationId, new PathParameterSpec("conversationId", "simple", false)) + "/turns"), null);
        return client.convertValue(raw, new TypeReference<TurnsCreateResult>() {});
    }

    /** Create */
    public TurnResponsesCreateResult turnResponsesCreate(String conversationId, String turnId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/chat/conversations/" + serializePathParameter(conversationId, new PathParameterSpec("conversationId", "simple", false)) + "/turns/" + serializePathParameter(turnId, new PathParameterSpec("turnId", "simple", false)) + "/response"), null);
        return client.convertValue(raw, new TypeReference<TurnResponsesCreateResult>() {});
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
