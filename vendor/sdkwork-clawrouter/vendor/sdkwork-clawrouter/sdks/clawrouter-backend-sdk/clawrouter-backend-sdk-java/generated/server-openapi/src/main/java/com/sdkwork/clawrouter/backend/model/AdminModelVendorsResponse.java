package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminModelVendorsResponse {
    private List<AdminModelVendorItem> items;

    public List<AdminModelVendorItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminModelVendorItem> items) {
        this.items = items;
    }
}
