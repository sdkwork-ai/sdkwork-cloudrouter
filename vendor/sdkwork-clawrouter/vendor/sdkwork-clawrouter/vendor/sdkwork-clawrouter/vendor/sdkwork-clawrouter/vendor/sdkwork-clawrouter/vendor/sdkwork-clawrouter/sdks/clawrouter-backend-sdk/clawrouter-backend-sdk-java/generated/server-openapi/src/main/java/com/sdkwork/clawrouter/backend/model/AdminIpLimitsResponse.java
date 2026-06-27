package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminIpLimitsResponse {
    private List<AdminRateLimitItem> items;

    public List<AdminRateLimitItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminRateLimitItem> items) {
        this.items = items;
    }
}
