package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminPromptBindingListResponse {
    private List<AdminPromptBindingItem> items;

    public List<AdminPromptBindingItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminPromptBindingItem> items) {
        this.items = items;
    }
}
