package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class ChatConversationCreateRequest {
    private String agentId;
    private String agentSessionId;
    private String defaultModel;
    private String defaultProvider;
    private String memorySpaceId;
    private Map<String, String> metadata;
    private String sourceSurface;
    private String title;

    public String getAgentId() {
        return this.agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId;
    }

    public String getAgentSessionId() {
        return this.agentSessionId;
    }

    public void setAgentSessionId(String agentSessionId) {
        this.agentSessionId = agentSessionId;
    }

    public String getDefaultModel() {
        return this.defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public String getDefaultProvider() {
        return this.defaultProvider;
    }

    public void setDefaultProvider(String defaultProvider) {
        this.defaultProvider = defaultProvider;
    }

    public String getMemorySpaceId() {
        return this.memorySpaceId;
    }

    public void setMemorySpaceId(String memorySpaceId) {
        this.memorySpaceId = memorySpaceId;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getSourceSurface() {
        return this.sourceSurface;
    }

    public void setSourceSurface(String sourceSurface) {
        this.sourceSurface = sourceSurface;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
