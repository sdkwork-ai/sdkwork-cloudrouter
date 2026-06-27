package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVectorStoreUpdateRequest {
    private String expiresAfter;
    private Map<String, String> metadata;
    private String name;

    public String getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(String expiresAfter) {
        this.expiresAfter = expiresAfter;
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
