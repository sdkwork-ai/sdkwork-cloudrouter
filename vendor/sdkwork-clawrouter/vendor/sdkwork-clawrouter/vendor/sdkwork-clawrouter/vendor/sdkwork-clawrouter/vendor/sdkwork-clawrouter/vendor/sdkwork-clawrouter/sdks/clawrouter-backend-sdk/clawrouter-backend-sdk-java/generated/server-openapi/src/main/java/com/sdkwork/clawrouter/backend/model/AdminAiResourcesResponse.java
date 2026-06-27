package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiResourcesResponse {
    private List<AdminAiResourceItem> items;

    public List<AdminAiResourceItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminAiResourceItem> items) {
        this.items = items;
    }
}
