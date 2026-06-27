package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiRealtimeCallCreateRequest {
    private Map<String, String> metadata;
    private String sdp;
    private String session;

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
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
}
