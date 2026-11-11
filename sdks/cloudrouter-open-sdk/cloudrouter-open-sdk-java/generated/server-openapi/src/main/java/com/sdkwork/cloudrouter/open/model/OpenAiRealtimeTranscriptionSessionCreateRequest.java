package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiRealtimeTranscriptionSessionCreateRequest {
    private List<String> include;
    private String inputAudioFormat;
    private Map<String, String> inputAudioNoiseReduction;
    private Map<String, String> inputAudioTranscription;
    private Map<String, String> turnDetection;

    public List<String> getInclude() {
        return this.include;
    }

    public void setInclude(List<String> include) {
        this.include = include;
    }

    public String getInputAudioFormat() {
        return this.inputAudioFormat;
    }

    public void setInputAudioFormat(String inputAudioFormat) {
        this.inputAudioFormat = inputAudioFormat;
    }

    public Map<String, String> getInputAudioNoiseReduction() {
        return this.inputAudioNoiseReduction;
    }

    public void setInputAudioNoiseReduction(Map<String, String> inputAudioNoiseReduction) {
        this.inputAudioNoiseReduction = inputAudioNoiseReduction;
    }

    public Map<String, String> getInputAudioTranscription() {
        return this.inputAudioTranscription;
    }

    public void setInputAudioTranscription(Map<String, String> inputAudioTranscription) {
        this.inputAudioTranscription = inputAudioTranscription;
    }

    public Map<String, String> getTurnDetection() {
        return this.turnDetection;
    }

    public void setTurnDetection(Map<String, String> turnDetection) {
        this.turnDetection = turnDetection;
    }
}
