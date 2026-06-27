package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RoutingRequestTracesResponse {
    private List<RoutingRequestTraceItem> items;

    public List<RoutingRequestTraceItem> getItems() {
        return this.items;
    }

    public void setItems(List<RoutingRequestTraceItem> items) {
        this.items = items;
    }
}
