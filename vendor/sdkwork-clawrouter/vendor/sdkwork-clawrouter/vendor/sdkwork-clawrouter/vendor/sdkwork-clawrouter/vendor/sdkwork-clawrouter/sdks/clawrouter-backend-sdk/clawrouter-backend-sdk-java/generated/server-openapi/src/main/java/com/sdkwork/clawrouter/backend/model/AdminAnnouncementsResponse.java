package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAnnouncementsResponse {
    private List<AdminAnnouncementItem> items;

    public List<AdminAnnouncementItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminAnnouncementItem> items) {
        this.items = items;
    }
}
