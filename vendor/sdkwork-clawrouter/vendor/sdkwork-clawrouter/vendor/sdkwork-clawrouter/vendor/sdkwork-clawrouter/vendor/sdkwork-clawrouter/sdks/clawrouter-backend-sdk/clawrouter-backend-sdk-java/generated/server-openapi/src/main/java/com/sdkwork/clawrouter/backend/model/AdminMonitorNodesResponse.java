package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMonitorNodesResponse {
    private List<AdminMonitorNodeItem> items;

    public List<AdminMonitorNodeItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMonitorNodeItem> items) {
        this.items = items;
    }
}
