package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class AppApiKeyListResponse {
    private List<AppChannelGroup> groups;
    private List<AppApiKeyItem> items;

    public List<AppChannelGroup> getGroups() {
        return this.groups;
    }

    public void setGroups(List<AppChannelGroup> groups) {
        this.groups = groups;
    }

    public List<AppApiKeyItem> getItems() {
        return this.items;
    }

    public void setItems(List<AppApiKeyItem> items) {
        this.items = items;
    }
}
