package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminServiceNodesResponse {
    private List<AdminServiceNodeItem> items;

    public List<AdminServiceNodeItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminServiceNodeItem> items) {
        this.items = items;
    }
}
