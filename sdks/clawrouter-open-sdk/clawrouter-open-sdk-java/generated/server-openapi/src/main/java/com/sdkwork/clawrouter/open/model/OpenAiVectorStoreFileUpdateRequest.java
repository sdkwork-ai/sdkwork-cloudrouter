package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVectorStoreFileUpdateRequest {
    private Map<String, String> attributes;

    public Map<String, String> getAttributes() {
        return this.attributes;
    }

    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }
}
