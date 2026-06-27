package com.sdkwork.clawrouter.backend.model;


public class AdminModelMappingResolveRequest {
    private String channelCode;
    private String channelId;
    private String providerAccountCode;
    private String providerAccountId;
    private String sourceModel;
    private String vendorCode;

    public String getChannelCode() {
        return this.channelCode;
    }

    public void setChannelCode(String channelCode) {
        this.channelCode = channelCode;
    }

    public String getChannelId() {
        return this.channelId;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public String getProviderAccountCode() {
        return this.providerAccountCode;
    }

    public void setProviderAccountCode(String providerAccountCode) {
        this.providerAccountCode = providerAccountCode;
    }

    public String getProviderAccountId() {
        return this.providerAccountId;
    }

    public void setProviderAccountId(String providerAccountId) {
        this.providerAccountId = providerAccountId;
    }

    public String getSourceModel() {
        return this.sourceModel;
    }

    public void setSourceModel(String sourceModel) {
        this.sourceModel = sourceModel;
    }

    public String getVendorCode() {
        return this.vendorCode;
    }

    public void setVendorCode(String vendorCode) {
        this.vendorCode = vendorCode;
    }
}
