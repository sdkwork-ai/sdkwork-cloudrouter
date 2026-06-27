package com.sdkwork.clawrouter.open.model;


public class OpenAiRealtimeClientSecret {
    private OpenAiRealtimeClientSecretValue clientSecret;
    private String session;

    public OpenAiRealtimeClientSecretValue getClientSecret() {
        return this.clientSecret;
    }

    public void setClientSecret(OpenAiRealtimeClientSecretValue clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getSession() {
        return this.session;
    }

    public void setSession(String session) {
        this.session = session;
    }
}
