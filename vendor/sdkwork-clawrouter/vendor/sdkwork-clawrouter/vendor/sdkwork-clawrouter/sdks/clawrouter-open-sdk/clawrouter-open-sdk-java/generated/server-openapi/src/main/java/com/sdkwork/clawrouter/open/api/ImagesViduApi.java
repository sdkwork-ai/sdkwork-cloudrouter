package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesViduApi {
    private final HttpClient client;

    public ImagesViduApi(HttpClient client) {
        this.client = client;
    }

    /** Vidu reference to image */
    public ViduImageGenerationTask createEntV2Reference2image(ViduReferenceToImageRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/vidu/ent/v2/reference2image"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ViduImageGenerationTask>() {});
    }




}
