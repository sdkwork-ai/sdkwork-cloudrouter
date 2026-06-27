package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiModelsResponse {
    private List<AdminAiModelItem> items;

    public List<AdminAiModelItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminAiModelItem> items) {
        this.items = items;
    }
}
