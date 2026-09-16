package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class ElevenLabsTextToSpeechRequest {
    private String modelId;
    private String text;
    private Map<String, Object> voiceSettings;

    public String getModelId() {
        return this.modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Map<String, Object> getVoiceSettings() {
        return this.voiceSettings;
    }

    public void setVoiceSettings(Map<String, Object> voiceSettings) {
        this.voiceSettings = voiceSettings;
    }
}
