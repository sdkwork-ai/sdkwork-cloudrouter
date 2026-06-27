package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminPromptVersionListResponse {
    private List<AdminPromptVersionItem> items;

    public List<AdminPromptVersionItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminPromptVersionItem> items) {
        this.items = items;
    }
}
