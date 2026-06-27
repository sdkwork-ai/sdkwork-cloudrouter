package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingChannelsResponse {
    private List<RoutingChannelItem> items;

    public List<RoutingChannelItem> getItems() {
        return this.items;
    }

    public void setItems(List<RoutingChannelItem> items) {
        this.items = items;
    }
}
