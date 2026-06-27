package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ImagesApi {
    private final HttpClient client;

    public ImagesApi(HttpClient client) {
        this.client = client;
    }

    /** Create image edit */
    public OpenAiImageList createEdit(OpenAiImageEditRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/images/edits"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiImageList>() {});
    }

    /** Create image */
    public OpenAiImageList createGeneration(OpenAiImageGenerationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/images/generations"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiImageList>() {});
    }

    /** Create image variation */
    public OpenAiImageList createVariation(OpenAiImageVariationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/images/variations"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiImageList>() {});
    }




}
