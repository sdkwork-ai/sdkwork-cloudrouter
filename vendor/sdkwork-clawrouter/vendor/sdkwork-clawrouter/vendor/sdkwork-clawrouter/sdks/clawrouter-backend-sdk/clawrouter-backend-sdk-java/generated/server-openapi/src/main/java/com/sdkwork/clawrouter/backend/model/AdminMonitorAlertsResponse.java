package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMonitorAlertsResponse {
    private List<AdminMonitorAlertItem> items;

    public List<AdminMonitorAlertItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMonitorAlertItem> items) {
        this.items = items;
    }
}
