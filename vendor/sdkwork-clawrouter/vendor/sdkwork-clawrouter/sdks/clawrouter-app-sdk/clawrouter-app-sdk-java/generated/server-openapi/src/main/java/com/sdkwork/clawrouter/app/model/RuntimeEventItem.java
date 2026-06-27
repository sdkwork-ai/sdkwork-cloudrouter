package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class RuntimeEventItem {
    private String createdAt;
    private String eventNo;
    private String eventSource;
    private String eventType;
    private String id;
    private String invocationId;
    private Map<String, String> payloadJson;
    private String textDelta;

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getEventNo() {
        return this.eventNo;
    }

    public void setEventNo(String eventNo) {
        this.eventNo = eventNo;
    }

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

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInvocationId() {
        return this.invocationId;
    }

    public void setInvocationId(String invocationId) {
        this.invocationId = invocationId;
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
