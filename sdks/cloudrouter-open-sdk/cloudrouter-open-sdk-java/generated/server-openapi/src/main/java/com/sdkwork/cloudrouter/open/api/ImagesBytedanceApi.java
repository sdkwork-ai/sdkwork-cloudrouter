package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesBytedanceApi {
    private final HttpClient client;

    public ImagesBytedanceApi(HttpClient client) {
        this.client = client;
    }

    /** ByteDance Seedream image generation */
    public BytedanceImageGenerationResponse createApiV3ImagesGeneration(BytedanceImageGenerationRequest body) throws Exception {
        Object raw = client.post("/bytedance/api/v3/images/generations", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<BytedanceImageGenerationResponse>() {});
    }




}
