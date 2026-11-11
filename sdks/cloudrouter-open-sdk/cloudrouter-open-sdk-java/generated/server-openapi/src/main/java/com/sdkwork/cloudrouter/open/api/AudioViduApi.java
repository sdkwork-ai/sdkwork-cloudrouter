package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class AudioViduApi {
    private final HttpClient client;

    public AudioViduApi(HttpClient client) {
        this.client = client;
    }

    /** Vidu text to audio */
    public ViduAudioGenerationTask createEntV2Text2audio(ViduTextToAudioRequest body) throws Exception {
        Object raw = client.post("/vidu/ent/v2/text2audio", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ViduAudioGenerationTask>() {});
    }

    /** Vidu timing to audio */
    public ViduAudioGenerationTask createEntV2Timing2audio(ViduTimingToAudioRequest body) throws Exception {
        Object raw = client.post("/vidu/ent/v2/timing2audio", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<ViduAudioGenerationTask>() {});
    }




}
