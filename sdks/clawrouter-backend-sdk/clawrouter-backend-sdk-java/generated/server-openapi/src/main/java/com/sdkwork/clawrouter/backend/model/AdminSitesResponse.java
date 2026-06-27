package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminSitesResponse {
    private List<AdminSiteItem> items;

    public List<AdminSiteItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminSiteItem> items) {
        this.items = items;
    }
}
