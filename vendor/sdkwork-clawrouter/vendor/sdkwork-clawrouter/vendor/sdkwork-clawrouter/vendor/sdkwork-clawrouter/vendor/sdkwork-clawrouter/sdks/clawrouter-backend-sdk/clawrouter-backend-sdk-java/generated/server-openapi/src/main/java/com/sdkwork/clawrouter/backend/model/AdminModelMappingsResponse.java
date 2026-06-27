package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelMappingsResponse {
    private List<AdminModelMappingRule> items;

    public List<AdminModelMappingRule> getItems() {
        return this.items;
    }

    public void setItems(List<AdminModelMappingRule> items) {
        this.items = items;
    }
}
