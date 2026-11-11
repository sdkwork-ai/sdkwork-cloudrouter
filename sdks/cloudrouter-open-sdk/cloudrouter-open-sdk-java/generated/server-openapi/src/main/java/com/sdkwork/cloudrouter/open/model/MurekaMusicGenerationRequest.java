package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class MurekaMusicGenerationRequest {
    private String callbackUrl;
    private Integer duration;
    private String lyrics;
    private String model;
    private String prompt;
    private String referenceAudioUrl;
    private List<String> tags;
    private String title;

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public String getLyrics() {
        return this.lyrics;
    }

    public void setLyrics(String lyrics) {
        this.lyrics = lyrics;
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

    public String getReferenceAudioUrl() {
        return this.referenceAudioUrl;
    }

    public void setReferenceAudioUrl(String referenceAudioUrl) {
        this.referenceAudioUrl = referenceAudioUrl;
    }

    public List<String> getTags() {
        return this.tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
