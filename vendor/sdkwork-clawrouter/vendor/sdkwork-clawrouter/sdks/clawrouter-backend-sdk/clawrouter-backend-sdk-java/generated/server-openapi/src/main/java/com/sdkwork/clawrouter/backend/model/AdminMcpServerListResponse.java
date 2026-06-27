package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMcpServerListResponse {
    private List<AdminMcpServerItem> items;

    public List<AdminMcpServerItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMcpServerItem> items) {
        this.items = items;
    }
}
