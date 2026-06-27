package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVoiceConsentUpdateRequest {
    private Map<String, String> metadata;
    private String name;

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
