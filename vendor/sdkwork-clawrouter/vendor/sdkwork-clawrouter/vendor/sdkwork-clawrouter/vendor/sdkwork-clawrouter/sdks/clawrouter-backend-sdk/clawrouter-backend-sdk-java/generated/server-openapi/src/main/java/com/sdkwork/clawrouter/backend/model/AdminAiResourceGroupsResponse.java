package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiResourceGroupsResponse {
    private List<AdminAiResourceGroupItem> items;

    public List<AdminAiResourceGroupItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminAiResourceGroupItem> items) {
        this.items = items;
    }
}
