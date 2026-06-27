package com.sdkwork.clawrouter.backend.model;


public class ServiceProviderPriceSimulationRequest {
    private String billingMeterCode;
    private String buyerProviderId;
    private String catalogKey;
    private String model;
    private String quantity;
    private String tokenKind;

    public String getBillingMeterCode() {
        return this.billingMeterCode;
    }

    public void setBillingMeterCode(String billingMeterCode) {
        this.billingMeterCode = billingMeterCode;
    }

    public String getBuyerProviderId() {
        return this.buyerProviderId;
    }

    public void setBuyerProviderId(String buyerProviderId) {
        this.buyerProviderId = buyerProviderId;
    }

    public String getCatalogKey() {
        return this.catalogKey;
    }

    public void setCatalogKey(String catalogKey) {
        this.catalogKey = catalogKey;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getQuantity() {
        return this.quantity;
    }

    public void setQuantity(String quantity) {
        this.quantity = quantity;
    }

    public String getTokenKind() {
        return this.tokenKind;
    }

    public void setTokenKind(String tokenKind) {
        this.tokenKind = tokenKind;
    }
}
