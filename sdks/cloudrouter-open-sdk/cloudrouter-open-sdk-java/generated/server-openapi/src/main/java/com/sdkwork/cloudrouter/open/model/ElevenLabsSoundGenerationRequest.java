package com.sdkwork.cloudrouter.open.model;


public class ElevenLabsSoundGenerationRequest {
    private Double durationSeconds;
    private Boolean loop;
    private String modelId;
    private Double promptInfluence;
    private String text;

    public Double getDurationSeconds() {
        return this.durationSeconds;
    }

    public void setDurationSeconds(Double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Boolean getLoop() {
        return this.loop;
    }

    public void setLoop(Boolean loop) {
        this.loop = loop;
    }

    public String getModelId() {
        return this.modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }

    public Double getPromptInfluence() {
        return this.promptInfluence;
    }

    public void setPromptInfluence(Double promptInfluence) {
        this.promptInfluence = promptInfluence;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
