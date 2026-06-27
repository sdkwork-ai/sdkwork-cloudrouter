package com.sdkwork.clawrouter.backend.model;


public class StorageBucketMutationResponse {
    private StorageBucketConfig bucket;
    private String requestId;

    public StorageBucketConfig getBucket() {
        return this.bucket;
    }

    public void setBucket(StorageBucketConfig bucket) {
        this.bucket = bucket;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
