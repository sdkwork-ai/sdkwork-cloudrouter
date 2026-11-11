package com.sdkwork.cloudrouter.open.model;


public class PixverseVideoGenerationRequest {
    private String aspectRatio;
    private Integer duration;
    private Boolean generateAudioSwitch;
    private Boolean generateMultiClipSwitch;
    private String model;
    private String prompt;
    private String quality;
    private Integer seed;
    private String webhookId;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Boolean getGenerateAudioSwitch() {
        return this.generateAudioSwitch;
    }

    public void setGenerateAudioSwitch(Boolean generateAudioSwitch) {
        this.generateAudioSwitch = generateAudioSwitch;
    }

    public Boolean getGenerateMultiClipSwitch() {
        return this.generateMultiClipSwitch;
    }

    public void setGenerateMultiClipSwitch(Boolean generateMultiClipSwitch) {
        this.generateMultiClipSwitch = generateMultiClipSwitch;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getQuality() {
        return this.quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public String getWebhookId() {
        return this.webhookId;
    }

    public void setWebhookId(String webhookId) {
        this.webhookId = webhookId;
    }
}
