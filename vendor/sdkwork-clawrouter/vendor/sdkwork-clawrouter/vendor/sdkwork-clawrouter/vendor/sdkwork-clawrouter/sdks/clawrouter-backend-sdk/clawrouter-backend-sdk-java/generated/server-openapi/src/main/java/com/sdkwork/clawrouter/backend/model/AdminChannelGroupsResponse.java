package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelGroupsResponse {
    private List<AdminChannelGroupItem> items;

    public List<AdminChannelGroupItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminChannelGroupItem> items) {
        this.items = items;
    }
}
