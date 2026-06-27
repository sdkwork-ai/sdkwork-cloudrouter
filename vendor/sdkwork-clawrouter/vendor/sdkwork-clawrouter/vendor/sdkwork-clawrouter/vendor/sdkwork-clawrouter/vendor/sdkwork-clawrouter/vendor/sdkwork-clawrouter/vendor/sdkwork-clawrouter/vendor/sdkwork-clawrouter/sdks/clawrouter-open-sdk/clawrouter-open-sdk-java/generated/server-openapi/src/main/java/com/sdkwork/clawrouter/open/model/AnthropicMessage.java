package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class AnthropicMessage {
    private List<AnthropicContentBlock> content;
    private String id;
    private String model;
    private String role;
    private String stopReason;
    private String stopSequence;
    private String type;
    private AnthropicUsage usage;

    public List<AnthropicContentBlock> getContent() {
        return this.content;
    }

    public void setContent(List<AnthropicContentBlock> content) {
        this.content = content;
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

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStopReason() {
        return this.stopReason;
    }

    public void setStopReason(String stopReason) {
        this.stopReason = stopReason;
    }

    public String getStopSequence() {
        return this.stopSequence;
    }

    public void setStopSequence(String stopSequence) {
        this.stopSequence = stopSequence;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public AnthropicUsage getUsage() {
        return this.usage;
    }

    public void setUsage(AnthropicUsage usage) {
        this.usage = usage;
    }
}
