package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageReconciliationRunListResponse {
    private List<StorageReconciliationRun> items;
    private String nextCursor;
    private String requestId;

    public List<StorageReconciliationRun> getItems() {
        return this.items;
    }

    public void setItems(List<StorageReconciliationRun> items) {
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
