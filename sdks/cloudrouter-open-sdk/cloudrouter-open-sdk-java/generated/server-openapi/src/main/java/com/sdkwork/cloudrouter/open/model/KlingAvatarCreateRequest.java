package com.sdkwork.cloudrouter.open.model;


public class KlingAvatarCreateRequest {
    private String modelName;
    private String humanImage;
    private String prompt;
    private String voiceMode;
    private String audioUrl;
    private String text;
    private String voiceId;
    private String voiceLanguage;
    private String callbackUrl;

    public String getModelName() {
        return this.modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getHumanImage() {
        return this.humanImage;
    }

    public void setHumanImage(String humanImage) {
        this.humanImage = humanImage;
    }

    public String getPrompt() {
        return this.prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public String getVoiceMode() {
        return this.voiceMode;
    }

    public void setVoiceMode(String voiceMode) {
        this.voiceMode = voiceMode;
    }

    public String getAudioUrl() {
        return this.audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getVoiceId() {
        return this.voiceId;
    }

    public void setVoiceId(String voiceId) {
        this.voiceId = voiceId;
    }

    public String getVoiceLanguage() {
        return this.voiceLanguage;
    }

    public void setVoiceLanguage(String voiceLanguage) {
        this.voiceLanguage = voiceLanguage;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }
}
