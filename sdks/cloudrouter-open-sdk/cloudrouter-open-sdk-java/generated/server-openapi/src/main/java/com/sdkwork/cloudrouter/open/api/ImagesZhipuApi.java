package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesZhipuApi {
    private final HttpClient client;

    public ImagesZhipuApi(HttpClient client) {
        this.client = client;
    }

    /** Zhipu CogView image generation */
    public ZhipuImageGenerationResponse createApiPaasV4ImagesGeneration(ZhipuImageGenerationRequest body) throws Exception {
        Object raw = client.post("/zhipu/api/paas/v4/images/generations", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ZhipuImageGenerationResponse>() {});
    }




}
