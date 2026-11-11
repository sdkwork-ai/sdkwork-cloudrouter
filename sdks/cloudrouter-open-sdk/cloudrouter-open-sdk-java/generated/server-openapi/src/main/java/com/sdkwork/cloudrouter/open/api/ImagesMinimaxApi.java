package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesMinimaxApi {
    private final HttpClient client;

    public ImagesMinimaxApi(HttpClient client) {
        this.client = client;
    }

    /** MiniMax image generation */
    public MinimaxImageGenerationResponse createV1ImageGeneration(MinimaxImageGenerationRequest body) throws Exception {
        Object raw = client.post("/minimax/v1/image_generation", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<MinimaxImageGenerationResponse>() {});
    }




}
