package com.sdkwork.clawrouter.backend.model;


public class AdminSiteConnectionCheckResponse {
    private String checkedAt;
    private String healthStatus;
    private String latencyMs;
    private String message;
    private String siteId;
    private String status;

    public String getCheckedAt() {
        return this.checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }

    public String getHealthStatus() {
        return this.healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public String getLatencyMs() {
        return this.latencyMs;
    }

    public void setLatencyMs(String latencyMs) {
        this.latencyMs = latencyMs;
    }

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
