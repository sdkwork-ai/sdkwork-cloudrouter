package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class AudioAlibabaApi {
    private final HttpClient client;

    public AudioAlibabaApi(HttpClient client) {
        this.client = client;
    }

    /** Alibaba Qwen TTS speech synthesis */
    public AlibabaSpeechResponse createApiV1ServicesAudioTtsSpeechSynthesizer(AlibabaSpeechRequest body) throws Exception {
        Object raw = client.post("/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<AlibabaSpeechResponse>() {});
    }




}
