package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminFirewallRulesResponse {
    private List<AdminFirewallItem> items;

    public List<AdminFirewallItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminFirewallItem> items) {
        this.items = items;
    }
}
