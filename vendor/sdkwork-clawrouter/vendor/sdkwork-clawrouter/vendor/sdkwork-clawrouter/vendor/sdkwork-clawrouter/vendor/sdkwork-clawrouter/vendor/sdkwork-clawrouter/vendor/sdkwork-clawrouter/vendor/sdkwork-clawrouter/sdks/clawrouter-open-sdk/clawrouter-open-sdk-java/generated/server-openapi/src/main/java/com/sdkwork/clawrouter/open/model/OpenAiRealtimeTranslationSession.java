package com.sdkwork.clawrouter.open.model;


public class OpenAiRealtimeTranslationSession {
    private OpenAiRealtimeClientSecretValue clientSecret;
    private String id;
    private String object;
    private String sourceLanguage;
    private String targetLanguage;

    public OpenAiRealtimeClientSecretValue getClientSecret() {
        return this.clientSecret;
    }

    public void setClientSecret(OpenAiRealtimeClientSecretValue clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getSourceLanguage() {
        return this.sourceLanguage;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }

    public String getTargetLanguage() {
        return this.targetLanguage;
    }

    public void setTargetLanguage(String targetLanguage) {
        this.targetLanguage = targetLanguage;
    }
}
