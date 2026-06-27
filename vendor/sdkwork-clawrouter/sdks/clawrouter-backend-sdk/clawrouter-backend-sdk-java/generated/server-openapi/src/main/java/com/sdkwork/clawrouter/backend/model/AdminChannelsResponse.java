package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelsResponse {
    private List<AdminChannelItem> items;

    public List<AdminChannelItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminChannelItem> items) {
        this.items = items;
    }
}
