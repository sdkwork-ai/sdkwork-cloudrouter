package com.sdkwork.clawrouter.open.model;


public class OpenAiRealtimeCallMultipartRequest {
    private String sdp;
    private String session;

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
