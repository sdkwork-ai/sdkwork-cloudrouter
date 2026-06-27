package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class RuntimeEventCreateRequest {
    private String eventSource;
    private String eventType;
    private Map<String, String> metadata;
    private Map<String, String> payloadJson;
    private String textDelta;

    public String getEventSource() {
        return this.eventSource;
    }

    public void setEventSource(String eventSource) {
        this.eventSource = eventSource;
    }

    public String getEventType() {
        return this.eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public Map<String, String> getPayloadJson() {
        return this.payloadJson;
    }

    public void setPayloadJson(Map<String, String> payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getTextDelta() {
        return this.textDelta;
    }

    public void setTextDelta(String textDelta) {
        this.textDelta = textDelta;
    }
}
