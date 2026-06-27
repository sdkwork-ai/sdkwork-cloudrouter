package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageBucketListResponse {
    private List<StorageBucketConfig> items;
    private String nextCursor;
    private String requestId;

    public List<StorageBucketConfig> getItems() {
        return this.items;
    }

    public void setItems(List<StorageBucketConfig> items) {
        this.items = items;
    }

    public String getNextCursor() {
        return this.nextCursor;
    }

    public void setNextCursor(String nextCursor) {
        this.nextCursor = nextCursor;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
