package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class NotificationListResponse {
    private List<NotificationItem> items;

    public List<NotificationItem> getItems() {
        return this.items;
    }

    public void setItems(List<NotificationItem> items) {
        this.items = items;
    }
}
