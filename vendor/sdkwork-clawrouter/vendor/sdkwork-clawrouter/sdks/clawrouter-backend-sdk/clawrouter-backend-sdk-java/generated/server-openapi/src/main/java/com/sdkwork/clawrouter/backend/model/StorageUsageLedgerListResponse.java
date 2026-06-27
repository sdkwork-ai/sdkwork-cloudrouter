package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageUsageLedgerListResponse {
    private List<StorageUsageLedgerEntry> items;
    private String nextCursor;
    private String requestId;

    public List<StorageUsageLedgerEntry> getItems() {
        return this.items;
    }

    public void setItems(List<StorageUsageLedgerEntry> items) {
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
