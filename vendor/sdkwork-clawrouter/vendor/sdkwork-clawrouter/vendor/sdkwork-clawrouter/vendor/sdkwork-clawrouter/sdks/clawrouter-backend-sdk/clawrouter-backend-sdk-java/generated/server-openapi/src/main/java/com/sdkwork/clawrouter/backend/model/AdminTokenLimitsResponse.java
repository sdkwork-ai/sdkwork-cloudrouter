package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminTokenLimitsResponse {
    private List<AdminRateLimitItem> items;

    public List<AdminRateLimitItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminRateLimitItem> items) {
        this.items = items;
    }
}
