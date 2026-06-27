package com.sdkwork.clawrouter.backend.model;


public class StorageQuotaPolicyMutationResponse {
    private StorageQuotaPolicy quotaPolicy;
    private String requestId;

    public StorageQuotaPolicy getQuotaPolicy() {
        return this.quotaPolicy;
    }

    public void setQuotaPolicy(StorageQuotaPolicy quotaPolicy) {
        this.quotaPolicy = quotaPolicy;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
