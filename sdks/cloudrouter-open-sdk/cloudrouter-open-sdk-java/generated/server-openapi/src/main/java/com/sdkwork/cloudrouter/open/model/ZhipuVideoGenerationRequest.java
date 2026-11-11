package com.sdkwork.cloudrouter.open.model;


public class ZhipuVideoGenerationRequest {
    private Integer duration;
    private Integer fps;
    private String imageUrl;
    private String model;
    private String prompt;
    private String quality;
    private String requestId;
    private String size;
    private String userId;
    private Boolean watermarkEnabled;
    private Boolean withAudio;

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Integer getFps() {
        return this.fps;
    }

    public void setFps(Integer fps) {
        this.fps = fps;
    }

    public String getImageUrl() {
        return this.imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
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

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getSize() {
        return this.size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getUserId() {
        return this.userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Boolean getWatermarkEnabled() {
        return this.watermarkEnabled;
    }

    public void setWatermarkEnabled(Boolean watermarkEnabled) {
        this.watermarkEnabled = watermarkEnabled;
    }

    public Boolean getWithAudio() {
        return this.withAudio;
    }

    public void setWithAudio(Boolean withAudio) {
        this.withAudio = withAudio;
    }
}
