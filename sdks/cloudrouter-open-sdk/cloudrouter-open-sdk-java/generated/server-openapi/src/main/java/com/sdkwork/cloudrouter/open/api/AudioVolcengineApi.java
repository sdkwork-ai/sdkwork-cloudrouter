package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class AudioVolcengineApi {
    private final HttpClient client;

    public AudioVolcengineApi(HttpClient client) {
        this.client = client;
    }

    /** Volcengine create speech */
    public byte[] createApiV3AudioSpeech(OpenAiSpeechCreateRequest body) throws Exception {
        return client.requestBytes("POST", ApiPaths.aiPath("/volcengine/api/v3/audio/speech"), body, null, null, "application/json", false, false);
    }




}
