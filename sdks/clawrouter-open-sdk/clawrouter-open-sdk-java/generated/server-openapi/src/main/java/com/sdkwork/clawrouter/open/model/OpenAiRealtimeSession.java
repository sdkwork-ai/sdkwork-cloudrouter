package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiRealtimeSession {
    private OpenAiRealtimeClientSecretValue clientSecret;
    private String id;
    private String instructions;
    private List<String> modalities;
    private String model;
    private String object;
    private String voice;

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

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public List<String> getModalities() {
        return this.modalities;
    }

    public void setModalities(List<String> modalities) {
        this.modalities = modalities;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getVoice() {
        return this.voice;
    }

    public void setVoice(String voice) {
        this.voice = voice;
    }
}
