package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRealtimeCallReferRequest {
    private Map<String, String> metadata;
    private String target;

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getTarget() {
        return this.target;
    }

    public void setTarget(String target) {
        this.target = target;
    }
}
