package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class ChatMessageItem {
    private String content;
    private String conversationId;
    private String createdAt;
    private String direction;
    private String id;
    private String model;
    private String provider;
    private String role;
    private String runtime;
    private String runtimeInvocationId;
    private String status;
    private String turnId;
    private Map<String, Object> usage;
    private String usageLinkId;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getConversationId() {
        return this.conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDirection() {
        return this.direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
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

    public String getProvider() {
        return this.provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getRuntime() {
        return this.runtime;
    }

    public void setRuntime(String runtime) {
        this.runtime = runtime;
    }

    public String getRuntimeInvocationId() {
        return this.runtimeInvocationId;
    }

    public void setRuntimeInvocationId(String runtimeInvocationId) {
        this.runtimeInvocationId = runtimeInvocationId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTurnId() {
        return this.turnId;
    }

    public void setTurnId(String turnId) {
        this.turnId = turnId;
    }

    public Map<String, Object> getUsage() {
        return this.usage;
    }

    public void setUsage(Map<String, Object> usage) {
        this.usage = usage;
    }

    public String getUsageLinkId() {
        return this.usageLinkId;
    }

    public void setUsageLinkId(String usageLinkId) {
        this.usageLinkId = usageLinkId;
    }
}
