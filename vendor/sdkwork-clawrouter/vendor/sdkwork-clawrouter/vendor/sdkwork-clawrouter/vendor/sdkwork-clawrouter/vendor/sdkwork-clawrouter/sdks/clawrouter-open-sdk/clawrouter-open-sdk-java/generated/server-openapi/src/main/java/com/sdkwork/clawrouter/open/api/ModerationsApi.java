package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ModerationsApi {
    private final HttpClient client;

    public ModerationsApi(HttpClient client) {
        this.client = client;
    }

    /** Create moderation */
    public OpenAiModeration create(OpenAiModerationCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/moderations"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiModeration>() {});
    }




}
