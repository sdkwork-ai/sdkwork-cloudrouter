package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminMcpDiscoveryResponse {
    private String checkedAt;
    private String discoveredCount;
    private String serverId;
    private List<AdminMcpToolItem> tools;

    public String getCheckedAt() {
        return this.checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }

    public String getDiscoveredCount() {
        return this.discoveredCount;
    }

    public void setDiscoveredCount(String discoveredCount) {
        this.discoveredCount = discoveredCount;
    }

    public String getServerId() {
        return this.serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }

    public List<AdminMcpToolItem> getTools() {
        return this.tools;
    }

    public void setTools(List<AdminMcpToolItem> tools) {
        this.tools = tools;
    }
}
