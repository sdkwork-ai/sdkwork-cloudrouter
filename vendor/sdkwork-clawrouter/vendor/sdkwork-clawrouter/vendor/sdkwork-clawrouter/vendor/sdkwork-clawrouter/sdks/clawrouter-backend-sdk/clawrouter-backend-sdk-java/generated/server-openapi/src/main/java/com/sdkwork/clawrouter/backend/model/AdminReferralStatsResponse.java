package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminReferralStatsResponse {
    private List<AdminReferralStatItem> items;

    public List<AdminReferralStatItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminReferralStatItem> items) {
        this.items = items;
    }
}
