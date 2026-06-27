package com.sdkwork.clawrouter.open.model;


public class OpenAiPromptTokensDetails {
    private Integer audioTokens;
    private Integer cachedTokens;

    public Integer getAudioTokens() {
        return this.audioTokens;
    }

    public void setAudioTokens(Integer audioTokens) {
        this.audioTokens = audioTokens;
    }

    public Integer getCachedTokens() {
        return this.cachedTokens;
    }

    public void setCachedTokens(Integer cachedTokens) {
        this.cachedTokens = cachedTokens;
    }
}
