package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class AudioMinimaxApi {
    private final HttpClient client;

    public AudioMinimaxApi(HttpClient client) {
        this.client = client;
    }

    /** MiniMax speech synthesis */
    public MinimaxTextToSpeechResponse createV1T2aV(MinimaxTextToSpeechRequest body) throws Exception {
        Object raw = client.post("/minimax/v1/t2a_v2", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<MinimaxTextToSpeechResponse>() {});
    }




}
