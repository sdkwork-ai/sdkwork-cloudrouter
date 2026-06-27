package com.sdkwork.clawrouter.backend.model;


public class StorageProviderHealthCheckResponse {
    private String checkedAt;
    private Boolean healthy;
    private String providerId;
    private String requestId;
    private String status;

    public String getCheckedAt() {
        return this.checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }

    public Boolean getHealthy() {
        return this.healthy;
    }

    public void setHealthy(Boolean healthy) {
        this.healthy = healthy;
    }

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
