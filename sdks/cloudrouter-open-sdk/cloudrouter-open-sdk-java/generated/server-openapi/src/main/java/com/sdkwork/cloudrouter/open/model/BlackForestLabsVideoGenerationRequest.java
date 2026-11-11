package com.sdkwork.cloudrouter.open.model;


public class BlackForestLabsVideoGenerationRequest {
    private String aspectRatio;
    private Boolean draft;
    private String draftCache;
    private Integer duration;
    private Boolean generateAudio;
    private String keyframes;
    private String mode;
    private String prompt;
    private String resolution;
    private Integer safetyTolerance;
    private String startVideo;
    private String user;
    private String version;

    public String getAspectRatio() {
        return this.aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Boolean getDraft() {
        return this.draft;
    }

    public void setDraft(Boolean draft) {
        this.draft = draft;
    }

    public String getDraftCache() {
        return this.draftCache;
    }

    public void setDraftCache(String draftCache) {
        this.draftCache = draftCache;
    }

    public Integer getDuration() {
        return this.duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Boolean getGenerateAudio() {
        return this.generateAudio;
    }

    public void setGenerateAudio(Boolean generateAudio) {
        this.generateAudio = generateAudio;
    }

    public String getKeyframes() {
        return this.keyframes;
    }

    public void setKeyframes(String keyframes) {
        this.keyframes = keyframes;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
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

    public Integer getSafetyTolerance() {
        return this.safetyTolerance;
    }

    public void setSafetyTolerance(Integer safetyTolerance) {
        this.safetyTolerance = safetyTolerance;
    }

    public String getStartVideo() {
        return this.startVideo;
    }

    public void setStartVideo(String startVideo) {
        this.startVideo = startVideo;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}
