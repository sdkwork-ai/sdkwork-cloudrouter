package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiCompletion {
    private List<CreateCompletionChoice> choices;
    private Integer created;
    private String id;
    private String model;
    private String object;
    private String systemFingerprint;
    private OpenAiTokenUsage usage;

    public List<CreateCompletionChoice> getChoices() {
        return this.choices;
    }

    public void setChoices(List<CreateCompletionChoice> choices) {
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
