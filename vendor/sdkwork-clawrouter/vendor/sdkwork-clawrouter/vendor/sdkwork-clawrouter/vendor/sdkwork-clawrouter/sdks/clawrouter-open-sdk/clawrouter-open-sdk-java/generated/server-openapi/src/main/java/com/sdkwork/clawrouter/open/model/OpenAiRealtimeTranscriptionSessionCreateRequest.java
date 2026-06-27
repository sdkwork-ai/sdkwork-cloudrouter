package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRealtimeTranscriptionSessionCreateRequest {
    private String inputAudioFormat;
    private String inputAudioTranscription;
    private Map<String, String> metadata;
    private String model;
    private String turnDetection;

    public String getInputAudioFormat() {
        return this.inputAudioFormat;
    }

    public void setInputAudioFormat(String inputAudioFormat) {
        this.inputAudioFormat = inputAudioFormat;
    }

    public String getInputAudioTranscription() {
        return this.inputAudioTranscription;
    }

    public void setInputAudioTranscription(String inputAudioTranscription) {
        this.inputAudioTranscription = inputAudioTranscription;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getTurnDetection() {
        return this.turnDetection;
    }

    public void setTurnDetection(String turnDetection) {
        this.turnDetection = turnDetection;
    }
}
