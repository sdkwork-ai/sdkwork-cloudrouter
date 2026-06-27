package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiThreadAndRunCreateRequest {
    private String assistantId;
    private String instructions;
    private Map<String, String> metadata;
    private String model;
    private Boolean stream;
    private OpenAiThreadCreateRequest thread;
    private List<String> tools;

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

    public OpenAiThreadCreateRequest getThread() {
        return this.thread;
    }

    public void setThread(OpenAiThreadCreateRequest thread) {
        this.thread = thread;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }
}
