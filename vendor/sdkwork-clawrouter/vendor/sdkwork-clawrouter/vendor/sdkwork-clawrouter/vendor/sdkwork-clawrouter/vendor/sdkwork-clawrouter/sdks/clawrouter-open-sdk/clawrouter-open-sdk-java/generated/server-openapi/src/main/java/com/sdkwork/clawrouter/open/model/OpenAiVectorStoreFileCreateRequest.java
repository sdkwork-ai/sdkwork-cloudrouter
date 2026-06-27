package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVectorStoreFileCreateRequest {
    private Map<String, String> attributes;
    private String chunkingStrategy;
    private String fileId;

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

    public String getFileId() {
        return this.fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }
}
