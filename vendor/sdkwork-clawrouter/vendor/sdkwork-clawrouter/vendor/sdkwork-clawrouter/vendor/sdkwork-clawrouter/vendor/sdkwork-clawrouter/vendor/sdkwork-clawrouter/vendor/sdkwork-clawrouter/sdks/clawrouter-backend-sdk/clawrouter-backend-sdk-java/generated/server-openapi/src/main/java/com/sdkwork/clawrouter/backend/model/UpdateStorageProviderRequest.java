package com.sdkwork.clawrouter.backend.model;


public class UpdateStorageProviderRequest {
    private String reason;
    private String status;

    public String getReason() {
        return this.reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
