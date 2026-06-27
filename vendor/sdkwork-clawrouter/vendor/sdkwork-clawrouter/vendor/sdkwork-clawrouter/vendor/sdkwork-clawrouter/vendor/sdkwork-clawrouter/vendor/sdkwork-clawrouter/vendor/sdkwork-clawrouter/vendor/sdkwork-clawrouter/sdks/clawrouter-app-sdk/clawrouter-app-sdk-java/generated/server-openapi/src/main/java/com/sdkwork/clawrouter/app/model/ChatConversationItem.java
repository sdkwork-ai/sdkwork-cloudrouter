package com.sdkwork.clawrouter.app.model;


public class ChatConversationItem {
    private String agentId;
    private String agentSessionId;
    private String createdAt;
    private String defaultModel;
    private String defaultProvider;
    private String id;
    private String lastMessagePreview;
    private String memorySpaceId;
    private String messageCount;
    private String sourceSurface;
    private String status;
    private String title;
    private String turnCount;
    private String updatedAt;

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

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
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

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLastMessagePreview() {
        return this.lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public String getMemorySpaceId() {
        return this.memorySpaceId;
    }

    public void setMemorySpaceId(String memorySpaceId) {
        this.memorySpaceId = memorySpaceId;
    }

    public String getMessageCount() {
        return this.messageCount;
    }

    public void setMessageCount(String messageCount) {
        this.messageCount = messageCount;
    }

    public String getSourceSurface() {
        return this.sourceSurface;
    }

    public void setSourceSurface(String sourceSurface) {
        this.sourceSurface = sourceSurface;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTurnCount() {
        return this.turnCount;
    }

    public void setTurnCount(String turnCount) {
        this.turnCount = turnCount;
    }

    public String getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
