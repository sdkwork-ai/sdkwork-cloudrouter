package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMonitorPerformanceResponse {
    private List<AdminMonitorPerformanceItem> items;

    public List<AdminMonitorPerformanceItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMonitorPerformanceItem> items) {
        this.items = items;
    }
}
