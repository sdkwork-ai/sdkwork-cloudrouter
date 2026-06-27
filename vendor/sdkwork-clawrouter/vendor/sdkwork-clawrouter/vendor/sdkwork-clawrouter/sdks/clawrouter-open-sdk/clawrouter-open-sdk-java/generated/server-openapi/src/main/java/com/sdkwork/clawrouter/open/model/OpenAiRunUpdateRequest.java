package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRunUpdateRequest {
    private Map<String, String> metadata;

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
}
