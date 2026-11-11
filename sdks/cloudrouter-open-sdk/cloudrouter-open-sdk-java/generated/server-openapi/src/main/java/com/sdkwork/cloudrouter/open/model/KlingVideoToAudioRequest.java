package com.sdkwork.cloudrouter.open.model;


public class KlingVideoToAudioRequest {
    private Boolean asmrMode;
    private String bgmPrompt;
    private String callbackUrl;
    private String externalTaskId;
    private String soundEffectPrompt;
    private String videoId;
    private String videoUrl;

    public Boolean getAsmrMode() {
        return this.asmrMode;
    }

    public void setAsmrMode(Boolean asmrMode) {
        this.asmrMode = asmrMode;
    }

    public String getBgmPrompt() {
        return this.bgmPrompt;
    }

    public void setBgmPrompt(String bgmPrompt) {
        this.bgmPrompt = bgmPrompt;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public String getExternalTaskId() {
        return this.externalTaskId;
    }

    public void setExternalTaskId(String externalTaskId) {
        this.externalTaskId = externalTaskId;
    }

    public String getSoundEffectPrompt() {
        return this.soundEffectPrompt;
    }

    public void setSoundEffectPrompt(String soundEffectPrompt) {
        this.soundEffectPrompt = soundEffectPrompt;
    }

    public String getVideoId() {
        return this.videoId;
    }

    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }

    public String getVideoUrl() {
        return this.videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }
}
