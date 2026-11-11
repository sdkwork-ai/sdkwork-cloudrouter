package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesVolcengineApi {
    private final HttpClient client;

    public ImagesVolcengineApi(HttpClient client) {
        this.client = client;
    }

    /** Volcengine Ark image generation */
    public VolcengineImageGenerationResponse createApiV3ImagesGeneration(VolcengineImageGenerationRequest body) throws Exception {
        Object raw = client.post("/volcengine/api/v3/images/generations", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<VolcengineImageGenerationResponse>() {});
    }




}
