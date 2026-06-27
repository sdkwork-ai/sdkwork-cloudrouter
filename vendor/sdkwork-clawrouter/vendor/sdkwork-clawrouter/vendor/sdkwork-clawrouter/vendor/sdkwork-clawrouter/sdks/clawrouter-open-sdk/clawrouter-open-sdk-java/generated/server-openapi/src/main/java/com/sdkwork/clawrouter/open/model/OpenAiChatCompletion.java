package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiChatCompletion {
    private List<OpenAiChatCompletionChoice> choices;
    private Integer created;
    private String id;
    private String model;
    private String object;
    private String requestId;
    private String serviceTier;
    private String systemFingerprint;
    private OpenAiTokenUsage usage;

    public List<OpenAiChatCompletionChoice> getChoices() {
        return this.choices;
    }

    public void setChoices(List<OpenAiChatCompletionChoice> choices) {
        this.choices = choices;
    }

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getServiceTier() {
        return this.serviceTier;
    }

    public void setServiceTier(String serviceTier) {
        this.serviceTier = serviceTier;
    }

    public String getSystemFingerprint() {
        return this.systemFingerprint;
    }

    public void setSystemFingerprint(String systemFingerprint) {
        this.systemFingerprint = systemFingerprint;
    }

    public OpenAiTokenUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiTokenUsage usage) {
        this.usage = usage;
    }
}
