package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminPromptListResponse {
    private List<AdminPromptItem> items;

    public List<AdminPromptItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminPromptItem> items) {
        this.items = items;
    }
}
