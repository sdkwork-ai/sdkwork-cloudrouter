package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVectorStoreFile {
    private Map<String, String> attributes;
    private String chunkingStrategy;
    private Integer createdAt;
    private String id;
    private String lastError;
    private String object;
    private String status;
    private Integer usageBytes;
    private String vectorStoreId;

    public Map<String, String> getAttributes() {
        return this.attributes;
    }

    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }

    public String getChunkingStrategy() {
        return this.chunkingStrategy;
    }

    public void setChunkingStrategy(String chunkingStrategy) {
        this.chunkingStrategy = chunkingStrategy;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLastError() {
        return this.lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
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

    public Integer getUsageBytes() {
        return this.usageBytes;
    }

    public void setUsageBytes(Integer usageBytes) {
        this.usageBytes = usageBytes;
    }

    public String getVectorStoreId() {
        return this.vectorStoreId;
    }

    public void setVectorStoreId(String vectorStoreId) {
        this.vectorStoreId = vectorStoreId;
    }
}
