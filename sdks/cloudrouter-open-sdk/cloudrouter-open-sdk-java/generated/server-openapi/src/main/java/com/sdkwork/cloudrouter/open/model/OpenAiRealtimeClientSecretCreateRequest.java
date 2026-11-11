package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiRealtimeClientSecretCreateRequest {
    private Map<String, String> expiresAfter;
    private Map<String, String> session;

    public Map<String, String> getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(Map<String, String> expiresAfter) {
        this.expiresAfter = expiresAfter;
    }

    public Map<String, String> getSession() {
        return this.session;
    }

    public void setSession(Map<String, String> session) {
        this.session = session;
    }
}
