package com.sdkwork.clawrouter.backend.model;


public class AdminRuntimeRouteExplainRequest {
    private String apiCode;
    private String apiKeyId;
    private String billingMeter;
    private String capability;
    private String catalogKey;
    private String channelGroupId;
    private String model;
    private String resourceCode;
    private String routeKey;

    public String getApiCode() {
        return this.apiCode;
    }

    public void setApiCode(String apiCode) {
        this.apiCode = apiCode;
    }

    public String getApiKeyId() {
        return this.apiKeyId;
    }

    public void setApiKeyId(String apiKeyId) {
        this.apiKeyId = apiKeyId;
    }

    public String getBillingMeter() {
        return this.billingMeter;
    }

    public void setBillingMeter(String billingMeter) {
        this.billingMeter = billingMeter;
    }

    public String getCapability() {
        return this.capability;
    }

    public void setCapability(String capability) {
        this.capability = capability;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public String getChannelGroupId() {
        return this.channelGroupId;
    }

    public void setChannelGroupId(String channelGroupId) {
        this.channelGroupId = channelGroupId;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getResourceCode() {
        return this.resourceCode;
    }

    public void setResourceCode(String resourceCode) {
        this.resourceCode = resourceCode;
    }

    public String getRouteKey() {
        return this.routeKey;
    }

    public void setRouteKey(String routeKey) {
        this.routeKey = routeKey;
    }
}
