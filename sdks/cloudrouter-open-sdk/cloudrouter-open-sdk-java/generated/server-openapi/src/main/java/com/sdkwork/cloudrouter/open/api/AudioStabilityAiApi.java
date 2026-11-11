package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class AudioStabilityAiApi {
    private final HttpClient client;

    public AudioStabilityAiApi(HttpClient client) {
        this.client = client;
    }

    /** Stability AI text-to-audio (music and sound effects) */
    public byte[] createTextToAudio(StabilityAudioRequest body) throws Exception {
        return client.requestBytes("POST", "/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", body, null, null, "multipart/form-data", false, false);
    }




}
