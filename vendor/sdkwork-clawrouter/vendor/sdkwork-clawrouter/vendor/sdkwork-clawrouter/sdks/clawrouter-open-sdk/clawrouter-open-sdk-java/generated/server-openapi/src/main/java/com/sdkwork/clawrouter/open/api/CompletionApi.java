package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class CompletionApi {
    private final HttpClient client;

    public CompletionApi(HttpClient client) {
        this.client = client;
    }

    /** Create completion */
    public OpenAiCompletion create(OpenAiCompletionCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/completions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiCompletion>() {});
    }




}
