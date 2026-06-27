package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRealtimeCall {
    private Integer createdAt;
    private String id;
    private Map<String, String> metadata;
    private String object;
    private String sdp;
    private String session;
    private String status;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getSdp() {
        return this.sdp;
    }

    public void setSdp(String sdp) {
        this.sdp = sdp;
    }

    public String getSession() {
        return this.session;
    }

    public void setSession(String session) {
        this.session = session;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
