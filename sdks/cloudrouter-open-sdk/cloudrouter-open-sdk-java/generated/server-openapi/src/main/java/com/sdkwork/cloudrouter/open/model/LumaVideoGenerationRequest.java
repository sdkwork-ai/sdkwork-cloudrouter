package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class LumaVideoGenerationRequest {
    private String aspectRatio;
    private String callbackUrl;
    private List<LumaConcept> concepts;
    private String duration;
    private String generationType;
    private LumaKeyframes keyframes;
    private Boolean loop;
    private String model;
    private String prompt;
    private String resolution;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public List<LumaConcept> getConcepts() {
        return this.concepts;
    }

    public void setConcepts(List<LumaConcept> concepts) {
        this.concepts = concepts;
    }

    public String getDuration() {
        return this.duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getGenerationType() {
        return this.generationType;
    }

    public void setGenerationType(String generationType) {
        this.generationType = generationType;
    }

    public LumaKeyframes getKeyframes() {
        return this.keyframes;
    }

    public void setKeyframes(LumaKeyframes keyframes) {
        this.keyframes = keyframes;
    }

    public Boolean getLoop() {
        return this.loop;
    }

    public void setLoop(Boolean loop) {
        this.loop = loop;
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

    public String getResolution() {
        return this.resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }
}
