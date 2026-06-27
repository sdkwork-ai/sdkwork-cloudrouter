package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageDefaultBucketListResponse {
    private List<StorageDefaultBucketConfig> items;
    private String requestId;

    public List<StorageDefaultBucketConfig> getItems() {
        return this.items;
    }

    public void setItems(List<StorageDefaultBucketConfig> items) {
        this.items = items;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
