package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RuntimeInvocationListResponse {
    private List<RuntimeInvocationItem> items;

    public List<RuntimeInvocationItem> getItems() {
        return this.items;
    }

    public void setItems(List<RuntimeInvocationItem> items) {
        this.items = items;
    }
}
