package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class StorageQuotaPolicyListResponse {
    private List<StorageQuotaPolicy> items;
    private String requestId;

    public List<StorageQuotaPolicy> getItems() {
        return this.items;
    }

    public void setItems(List<StorageQuotaPolicy> items) {
        this.items = items;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
