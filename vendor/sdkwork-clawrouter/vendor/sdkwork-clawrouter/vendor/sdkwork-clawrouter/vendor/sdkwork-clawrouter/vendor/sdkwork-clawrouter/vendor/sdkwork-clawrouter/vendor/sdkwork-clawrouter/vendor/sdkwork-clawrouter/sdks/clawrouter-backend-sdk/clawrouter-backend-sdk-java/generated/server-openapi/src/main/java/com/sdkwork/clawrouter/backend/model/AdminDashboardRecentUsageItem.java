package com.sdkwork.clawrouter.backend.model;


public class AdminDashboardRecentUsageItem {
    private String billingMode;
    private String cost;
    private String id;
    private Boolean isApiUser;
    private String model;
    private String status;
    private String time;
    private String type;
    private Double usageCount;
    private Double usageIn;
    private Double usageOut;
    private String user;

    public String getBillingMode() {
        return this.billingMode;
    }

    public void setBillingMode(String billingMode) {
        this.billingMode = billingMode;
    }

    public String getCost() {
        return this.cost;
    }

    public void setCost(String cost) {
        this.cost = cost;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Boolean getIsApiUser() {
        return this.isApiUser;
    }

    public void setIsApiUser(Boolean isApiUser) {
        this.isApiUser = isApiUser;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTime() {
        return this.time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Double getUsageCount() {
        return this.usageCount;
    }

    public void setUsageCount(Double usageCount) {
        this.usageCount = usageCount;
    }

    public Double getUsageIn() {
        return this.usageIn;
    }

    public void setUsageIn(Double usageIn) {
        this.usageIn = usageIn;
    }

    public Double getUsageOut() {
        return this.usageOut;
    }

    public void setUsageOut(Double usageOut) {
        this.usageOut = usageOut;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
