package com.sdkwork.cloudrouter.open.model;


public class ViduTextToVideoRequest {
    private String aspectRatio;
    private Boolean audio;
    private String callbackUrl;
    private Integer duration;
    private String metaData;
    private String model;
    private Boolean offPeak;
    private String payload;
    private String prompt;
    private String resolution;
    private Integer seed;
    private Boolean watermark;
    private Integer wmPosition;
    private String wmUrl;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Boolean getAudio() {
        return this.audio;
    }

    public void setAudio(Boolean audio) {
        this.audio = audio;
    }

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

    public String getMetaData() {
        return this.metaData;
    }

    public void setMetaData(String metaData) {
        this.metaData = metaData;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Boolean getOffPeak() {
        return this.offPeak;
    }

    public void setOffPeak(Boolean offPeak) {
        this.offPeak = offPeak;
    }

    public String getPayload() {
        return this.payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
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

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public Boolean getWatermark() {
        return this.watermark;
    }

    public void setWatermark(Boolean watermark) {
        this.watermark = watermark;
    }

    public Integer getWmPosition() {
        return this.wmPosition;
    }

    public void setWmPosition(Integer wmPosition) {
        this.wmPosition = wmPosition;
    }

    public String getWmUrl() {
        return this.wmUrl;
    }

    public void setWmUrl(String wmUrl) {
        this.wmUrl = wmUrl;
    }
}
