package com.sdkwork.clawrouter.backend.model;


public class SetStorageDefaultBucketRequest {
    private String bucketId;
    private String reason;

    public String getBucketId() {
        return this.bucketId;
    }

    public void setBucketId(String bucketId) {
        this.bucketId = bucketId;
    }

    public String getReason() {
        return this.reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
