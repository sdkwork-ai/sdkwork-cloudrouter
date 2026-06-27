package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminSiteChannelsResponse {
    private List<AdminSiteChannelItem> items;

    public List<AdminSiteChannelItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminSiteChannelItem> items) {
        this.items = items;
    }
}
