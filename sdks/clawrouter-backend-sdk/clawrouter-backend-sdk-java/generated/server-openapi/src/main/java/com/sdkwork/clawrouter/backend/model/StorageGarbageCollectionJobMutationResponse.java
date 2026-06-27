package com.sdkwork.clawrouter.backend.model;


public class StorageGarbageCollectionJobMutationResponse {
    private StorageGarbageCollectionJob job;
    private String requestId;

    public StorageGarbageCollectionJob getJob() {
        return this.job;
    }

    public void setJob(StorageGarbageCollectionJob job) {
        this.job = job;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
