package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiVectorStoreFileBatchCreateRequest {
    private Map<String, String> attributes;
    private String chunkingStrategy;
    private List<String> fileIds;
    private List<Map<String, String>> files;

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

    public List<String> getFileIds() {
        return this.fileIds;
    }

    public void setFileIds(List<String> fileIds) {
        this.fileIds = fileIds;
    }

    public List<Map<String, String>> getFiles() {
        return this.files;
    }

    public void setFiles(List<Map<String, String>> files) {
        this.files = files;
    }
}
