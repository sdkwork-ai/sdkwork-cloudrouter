package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class VideosBlackForestLabsApi {
    private final HttpClient client;

    public VideosBlackForestLabsApi(HttpClient client) {
        this.client = client;
    }

    /** Black Forest Labs FLUX 3 video generation */
    public BlackForestLabsVideoGenerationTask createFlux3Video(BlackForestLabsVideoGenerationRequest body) throws Exception {
        Object raw = client.post("/black_forest_labs/v1/flux-3-video", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<BlackForestLabsVideoGenerationTask>() {});
    }




}
