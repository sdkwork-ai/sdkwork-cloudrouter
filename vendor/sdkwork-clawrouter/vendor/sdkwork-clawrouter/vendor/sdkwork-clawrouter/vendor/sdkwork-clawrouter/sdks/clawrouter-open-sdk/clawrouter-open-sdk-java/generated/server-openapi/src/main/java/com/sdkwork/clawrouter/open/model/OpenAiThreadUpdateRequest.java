package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiThreadUpdateRequest {
    private Map<String, String> metadata;
    private String toolResources;

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getToolResources() {
        return this.toolResources;
    }

    public void setToolResources(String toolResources) {
        this.toolResources = toolResources;
    }
}
