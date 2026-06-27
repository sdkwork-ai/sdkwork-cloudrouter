package com.sdkwork.clawrouter.backend.model;


public class CreateStorageReconciliationRunRequest {
    private String bucketId;
    private String checkMode;
    private Boolean dryRun;
    private String providerId;
    private String reason;
    private String runType;

    public String getBucketId() {
        return this.bucketId;
    }

    public void setBucketId(String bucketId) {
        this.bucketId = bucketId;
    }

    public String getCheckMode() {
        return this.checkMode;
    }

    public void setCheckMode(String checkMode) {
        this.checkMode = checkMode;
    }

    public Boolean getDryRun() {
        return this.dryRun;
    }

    public void setDryRun(Boolean dryRun) {
        this.dryRun = dryRun;
    }

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getReason() {
        return this.reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getRunType() {
        return this.runType;
    }

    public void setRunType(String runType) {
        this.runType = runType;
    }
}
