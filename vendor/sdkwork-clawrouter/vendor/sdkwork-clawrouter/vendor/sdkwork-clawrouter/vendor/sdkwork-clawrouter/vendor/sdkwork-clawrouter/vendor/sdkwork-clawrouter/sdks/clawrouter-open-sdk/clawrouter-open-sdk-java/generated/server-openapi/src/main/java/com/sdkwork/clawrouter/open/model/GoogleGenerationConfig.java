package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleGenerationConfig {
    private Integer candidateCount;
    private Integer maxOutputTokens;
    private String responseMimeType;
    private GoogleSchema responseSchema;
    private List<String> stopSequences;
    private Double temperature;
    private GoogleThinkingConfig thinkingConfig;
    private Integer topK;
    private Double topP;

    public Integer getCandidateCount() {
        return this.candidateCount;
    }

    public void setCandidateCount(Integer candidateCount) {
        this.candidateCount = candidateCount;
    }

    public Integer getMaxOutputTokens() {
        return this.maxOutputTokens;
    }

    public void setMaxOutputTokens(Integer maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    public String getResponseMimeType() {
        return this.responseMimeType;
    }

    public void setResponseMimeType(String responseMimeType) {
        this.responseMimeType = responseMimeType;
    }

    public GoogleSchema getResponseSchema() {
        return this.responseSchema;
    }

    public void setResponseSchema(GoogleSchema responseSchema) {
        this.responseSchema = responseSchema;
    }

    public List<String> getStopSequences() {
        return this.stopSequences;
    }

    public void setStopSequences(List<String> stopSequences) {
        this.stopSequences = stopSequences;
    }

    public Double getTemperature() {
        return this.temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public GoogleThinkingConfig getThinkingConfig() {
        return this.thinkingConfig;
    }

    public void setThinkingConfig(GoogleThinkingConfig thinkingConfig) {
        this.thinkingConfig = thinkingConfig;
    }

    public Integer getTopK() {
        return this.topK;
    }

    public void setTopK(Integer topK) {
        this.topK = topK;
    }

    public Double getTopP() {
        return this.topP;
    }

    public void setTopP(Double topP) {
        this.topP = topP;
    }
}
