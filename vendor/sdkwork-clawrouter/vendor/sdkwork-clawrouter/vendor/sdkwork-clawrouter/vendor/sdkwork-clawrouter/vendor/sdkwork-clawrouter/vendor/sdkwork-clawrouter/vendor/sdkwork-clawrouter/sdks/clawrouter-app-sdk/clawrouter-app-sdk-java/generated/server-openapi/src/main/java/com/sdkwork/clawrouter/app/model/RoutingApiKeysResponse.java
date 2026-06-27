package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingApiKeysResponse {
    private List<RoutingApiKeyItem> items;

    public List<RoutingApiKeyItem> getItems() {
        return this.items;
    }

    public void setItems(List<RoutingApiKeyItem> items) {
        this.items = items;
    }
}
