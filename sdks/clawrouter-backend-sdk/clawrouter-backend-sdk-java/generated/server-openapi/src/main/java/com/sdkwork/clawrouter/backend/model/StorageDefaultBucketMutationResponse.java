package com.sdkwork.clawrouter.backend.model;


public class StorageDefaultBucketMutationResponse {
    private StorageDefaultBucketConfig defaultBucket;
    private String requestId;

    public StorageDefaultBucketConfig getDefaultBucket() {
        return this.defaultBucket;
    }

    public void setDefaultBucket(StorageDefaultBucketConfig defaultBucket) {
        this.defaultBucket = defaultBucket;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
