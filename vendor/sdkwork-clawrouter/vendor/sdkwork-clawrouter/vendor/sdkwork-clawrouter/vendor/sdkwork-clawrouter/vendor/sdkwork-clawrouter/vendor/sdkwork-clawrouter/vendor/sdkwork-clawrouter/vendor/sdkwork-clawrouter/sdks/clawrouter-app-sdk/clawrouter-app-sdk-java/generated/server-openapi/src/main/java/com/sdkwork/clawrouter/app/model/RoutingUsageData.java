package com.sdkwork.clawrouter.app.model;


public class RoutingUsageData {
    private String latency;
    private String requests;
    private String time;

    public String getLatency() {
        return this.latency;
    }

    public void setLatency(String latency) {
        this.latency = latency;
    }

    public String getRequests() {
        return this.requests;
    }

    public void setRequests(String requests) {
        this.requests = requests;
    }

    public String getTime() {
        return this.time;
    }

    public void setTime(String time) {
        this.time = time;
    }
}
