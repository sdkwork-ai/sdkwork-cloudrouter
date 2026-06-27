package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVectorStore {
    private Integer bytes;
    private Integer createdAt;
    private String expiresAfter;
    private Integer expiresAt;
    private OpenAiVectorStoreFileCounts fileCounts;
    private String id;
    private Integer lastActiveAt;
    private Map<String, String> metadata;
    private String name;
    private String object;
    private String status;
    private Integer usageBytes;

    public Integer getBytes() {
        return this.bytes;
    }

    public void setBytes(Integer bytes) {
        this.bytes = bytes;
    }

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(String expiresAfter) {
        this.expiresAfter = expiresAfter;
    }

    public Integer getExpiresAt() {
        return this.expiresAt;
    }

    public void setExpiresAt(Integer expiresAt) {
        this.expiresAt = expiresAt;
    }

    public OpenAiVectorStoreFileCounts getFileCounts() {
        return this.fileCounts;
    }

    public void setFileCounts(OpenAiVectorStoreFileCounts fileCounts) {
        this.fileCounts = fileCounts;
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

    public Integer getUsageBytes() {
        return this.usageBytes;
    }

    public void setUsageBytes(Integer usageBytes) {
        this.usageBytes = usageBytes;
    }
}
