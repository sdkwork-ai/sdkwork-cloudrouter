package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiThreadCreateRequest {
    private List<OpenAiThreadMessageCreateRequest> messages;
    private Map<String, String> metadata;
    private String toolResources;

    public List<OpenAiThreadMessageCreateRequest> getMessages() {
        return this.messages;
    }

    public void setMessages(List<OpenAiThreadMessageCreateRequest> messages) {
        this.messages = messages;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getToolResources() {
        return this.toolResources;
    }

    public void setToolResources(String toolResources) {
        this.toolResources = toolResources;
    }
}
