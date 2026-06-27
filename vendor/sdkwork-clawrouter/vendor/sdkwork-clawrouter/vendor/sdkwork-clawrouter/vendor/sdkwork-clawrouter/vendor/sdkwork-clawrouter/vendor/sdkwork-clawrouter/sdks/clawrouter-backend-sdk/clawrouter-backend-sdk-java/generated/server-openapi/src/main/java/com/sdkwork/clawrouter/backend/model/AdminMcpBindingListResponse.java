package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMcpBindingListResponse {
    private List<AdminMcpBindingItem> items;

    public List<AdminMcpBindingItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMcpBindingItem> items) {
        this.items = items;
    }
}
