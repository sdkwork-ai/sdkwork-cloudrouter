package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiVectorStoreCreateRequest {
    private String chunkingStrategy;
    private String expiresAfter;
    private List<String> fileIds;
    private Map<String, String> metadata;
    private String name;

    public String getChunkingStrategy() {
        return this.chunkingStrategy;
    }

    public void setChunkingStrategy(String chunkingStrategy) {
        this.chunkingStrategy = chunkingStrategy;
    }

    public String getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(String expiresAfter) {
        this.expiresAfter = expiresAfter;
    }

    public List<String> getFileIds() {
        return this.fileIds;
    }

    public void setFileIds(List<String> fileIds) {
        this.fileIds = fileIds;
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
}
