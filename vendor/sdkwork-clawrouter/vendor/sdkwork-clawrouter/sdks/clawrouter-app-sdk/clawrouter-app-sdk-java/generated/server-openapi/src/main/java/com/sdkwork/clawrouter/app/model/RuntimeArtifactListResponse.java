package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class RuntimeArtifactListResponse {
    private List<RuntimeArtifactItem> items;

    public List<RuntimeArtifactItem> getItems() {
        return this.items;
    }

    public void setItems(List<RuntimeArtifactItem> items) {
        this.items = items;
    }
}
