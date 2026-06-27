package com.sdkwork.clawrouter.backend.model;


public class ServiceProviderDownstreamCreateRequest {
    private String defaultCurrency;
    private String defaultMultiplier;
    private String displayName;
    private String pricePlanCode;
    private String providerNo;
    private String providerType;
    private String sellerProviderId;
    private String settlementMode;

    public String getDefaultCurrency() {
        return this.defaultCurrency;
    }

    public void setDefaultCurrency(String defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
    }

    public String getDefaultMultiplier() {
        return this.defaultMultiplier;
    }

    public void setDefaultMultiplier(String defaultMultiplier) {
        this.defaultMultiplier = defaultMultiplier;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getPricePlanCode() {
        return this.pricePlanCode;
    }

    public void setPricePlanCode(String pricePlanCode) {
        this.pricePlanCode = pricePlanCode;
    }

    public String getProviderNo() {
        return this.providerNo;
    }

    public void setProviderNo(String providerNo) {
        this.providerNo = providerNo;
    }

    public String getProviderType() {
        return this.providerType;
    }

    public void setProviderType(String providerType) {
        this.providerType = providerType;
    }

    public String getSellerProviderId() {
        return this.sellerProviderId;
    }

    public void setSellerProviderId(String sellerProviderId) {
        this.sellerProviderId = sellerProviderId;
    }

    public String getSettlementMode() {
        return this.settlementMode;
    }

    public void setSettlementMode(String settlementMode) {
        this.settlementMode = settlementMode;
    }
}
