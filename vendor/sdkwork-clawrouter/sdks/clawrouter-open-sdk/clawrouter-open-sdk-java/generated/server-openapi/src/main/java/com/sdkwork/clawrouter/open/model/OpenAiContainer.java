package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiContainer {
    private Integer createdAt;
    private Integer expiresAt;
    private String id;
    private Integer lastActiveAt;
    private String memoryLimit;
    private Map<String, String> metadata;
    private String name;
    private String object;
    private String status;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(Integer expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getLastActiveAt() {
        return this.lastActiveAt;
    }

    public void setLastActiveAt(Integer lastActiveAt) {
        this.lastActiveAt = lastActiveAt;
    }

    public String getMemoryLimit() {
        return this.memoryLimit;
    }

    public void setMemoryLimit(String memoryLimit) {
        this.memoryLimit = memoryLimit;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
