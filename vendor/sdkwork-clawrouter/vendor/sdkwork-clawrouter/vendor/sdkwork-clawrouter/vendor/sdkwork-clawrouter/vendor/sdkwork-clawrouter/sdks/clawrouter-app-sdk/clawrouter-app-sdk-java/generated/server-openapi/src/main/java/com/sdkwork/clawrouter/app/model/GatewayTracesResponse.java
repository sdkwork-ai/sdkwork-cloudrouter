package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class GatewayTracesResponse {
    private List<GatewayTrace> items;

    public List<GatewayTrace> getItems() {
        return this.items;
    }

    public void setItems(List<GatewayTrace> items) {
        this.items = items;
    }
}
