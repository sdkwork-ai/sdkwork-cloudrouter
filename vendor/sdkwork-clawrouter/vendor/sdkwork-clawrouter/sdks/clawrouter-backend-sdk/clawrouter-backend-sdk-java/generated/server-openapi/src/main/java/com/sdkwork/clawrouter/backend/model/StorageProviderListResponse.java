package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageProviderListResponse {
    private List<StorageProviderConfig> items;
    private String requestId;

    public List<StorageProviderConfig> getItems() {
        return this.items;
    }

    public void setItems(List<StorageProviderConfig> items) {
        this.items = items;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
