package com.sdkwork.clawrouter.open.model;


public class OpenAiRealtimeTranscriptionSession {
    private OpenAiRealtimeClientSecretValue clientSecret;
    private String id;
    private String inputAudioFormat;
    private String inputAudioTranscription;
    private String object;

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

    public String getInputAudioFormat() {
        return this.inputAudioFormat;
    }

    public void setInputAudioFormat(String inputAudioFormat) {
        this.inputAudioFormat = inputAudioFormat;
    }

    public String getInputAudioTranscription() {
        return this.inputAudioTranscription;
    }

    public void setInputAudioTranscription(String inputAudioTranscription) {
        this.inputAudioTranscription = inputAudioTranscription;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }
}
