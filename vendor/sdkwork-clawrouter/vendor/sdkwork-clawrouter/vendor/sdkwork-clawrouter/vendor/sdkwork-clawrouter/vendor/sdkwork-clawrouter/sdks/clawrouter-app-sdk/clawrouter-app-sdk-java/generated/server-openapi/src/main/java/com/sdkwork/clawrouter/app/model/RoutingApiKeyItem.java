package com.sdkwork.clawrouter.app.model;


public class RoutingApiKeyItem {
    private String copyableKey;
    private String createdAt;
    private String displayKey;
    private String id;
    private String name;
    private String status;
    private String totalUsage;

    public String getCopyableKey() {
        return this.copyableKey;
    }

    public void setCopyableKey(String copyableKey) {
        this.copyableKey = copyableKey;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDisplayKey() {
        return this.displayKey;
    }

    public void setDisplayKey(String displayKey) {
        this.displayKey = displayKey;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTotalUsage() {
        return this.totalUsage;
    }

    public void setTotalUsage(String totalUsage) {
        this.totalUsage = totalUsage;
    }
}
