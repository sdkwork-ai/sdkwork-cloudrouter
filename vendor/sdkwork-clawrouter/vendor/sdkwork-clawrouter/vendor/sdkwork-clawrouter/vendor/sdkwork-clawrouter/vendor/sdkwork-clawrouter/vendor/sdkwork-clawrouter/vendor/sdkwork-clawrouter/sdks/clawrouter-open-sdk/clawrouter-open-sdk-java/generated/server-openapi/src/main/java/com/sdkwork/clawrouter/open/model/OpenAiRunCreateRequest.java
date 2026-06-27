package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiRunCreateRequest {
    private String additionalInstructions;
    private String assistantId;
    private String instructions;
    private Map<String, String> metadata;
    private String model;
    private Boolean stream;
    private List<String> tools;

    public String getAdditionalInstructions() {
        return this.additionalInstructions;
    }

    public void setAdditionalInstructions(String additionalInstructions) {
        this.additionalInstructions = additionalInstructions;
    }

    public String getAssistantId() {
        return this.assistantId;
    }

    public void setAssistantId(String assistantId) {
        this.assistantId = assistantId;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }
}
