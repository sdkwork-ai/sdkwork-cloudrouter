package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ToolApi {
    private final HttpClient client;

    public ToolApi(HttpClient client) {
        this.client = client;
    }

    /** Fetch a web page */
    public OpenAiDeepSeekWebFetchResponse createFetch(OpenAiDeepSeekWebFetchRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/tools/fetch"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiDeepSeekWebFetchResponse>() {});
    }

    /** Search the web */
    public OpenAiDeepSeekWebSearchResponse search(OpenAiDeepSeekWebSearchRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/tools/search"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiDeepSeekWebSearchResponse>() {});
    }




}
