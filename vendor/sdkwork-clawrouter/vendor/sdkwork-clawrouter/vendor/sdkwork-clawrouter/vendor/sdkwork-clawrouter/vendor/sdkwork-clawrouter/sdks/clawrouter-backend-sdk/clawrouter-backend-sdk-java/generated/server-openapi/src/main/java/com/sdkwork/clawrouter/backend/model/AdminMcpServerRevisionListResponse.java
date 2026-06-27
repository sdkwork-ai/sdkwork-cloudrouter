package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMcpServerRevisionListResponse {
    private List<AdminMcpServerRevisionItem> items;

    public List<AdminMcpServerRevisionItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminMcpServerRevisionItem> items) {
        this.items = items;
    }
}
