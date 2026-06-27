package com.sdkwork.clawrouter.open.model;


public class SunoMusicGenerationRequest {
    private String callbackUrl;
    private Double duration;
    private String model;
    private String negativeTags;
    private String prompt;
    private String tags;
    private String title;

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Double getDuration() {
        return this.duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getNegativeTags() {
        return this.negativeTags;
    }

    public void setNegativeTags(String negativeTags) {
        this.negativeTags = negativeTags;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getTags() {
        return this.tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
