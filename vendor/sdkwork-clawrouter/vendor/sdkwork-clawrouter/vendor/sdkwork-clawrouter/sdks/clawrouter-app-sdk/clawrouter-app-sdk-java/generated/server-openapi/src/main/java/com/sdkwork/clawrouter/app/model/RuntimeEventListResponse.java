package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RuntimeEventListResponse {
    private List<RuntimeEventItem> items;

    public List<RuntimeEventItem> getItems() {
        return this.items;
    }

    public void setItems(List<RuntimeEventItem> items) {
        this.items = items;
    }
}
