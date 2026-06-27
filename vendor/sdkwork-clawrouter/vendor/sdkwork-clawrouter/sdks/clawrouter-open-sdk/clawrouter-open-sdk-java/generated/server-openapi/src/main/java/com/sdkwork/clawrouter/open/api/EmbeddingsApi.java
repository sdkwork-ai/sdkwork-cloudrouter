package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class EmbeddingsApi {
    private final HttpClient client;

    public EmbeddingsApi(HttpClient client) {
        this.client = client;
    }

    /** Create embeddings */
    public OpenAiEmbeddingList create(OpenAiEmbeddingsRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/embeddings"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiEmbeddingList>() {});
    }




}
